import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OrcamentoTemplate } from "@/components/OrcamentoTemplate";
import { Download, X, Loader2 } from "lucide-react";
import { Orcamento, OrcamentoItem } from "@/lib/types";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ReactDOM from "react-dom/client";
import { toast } from "sonner";

interface Props {
  orcamentoId: string | null;
  open: boolean;
  onClose: () => void;
}

function parseNum(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const str = String(value).trim();
  if (str.includes(",")) {
    const cleaned = str.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return parseFloat(str) || 0;
}

async function buscarFornecedorLayout(orcamento: any) {
  const cols = "id, codigo, tipo_layout, nome_fantasia, logotipo_url, imagem_template_url, termos_fabricante, condicoes_pagamento_padrao";
  if (orcamento.fornecedor_id) {
    const { data } = await supabase.from("fornecedores").select(cols).eq("id", orcamento.fornecedor_id).maybeSingle();
    if (data) return data;
  }
  const codigo = String(orcamento.codigo_empresa || "").trim();
  if (codigo) {
    const { data } = await supabase.from("fornecedores").select(cols).eq("codigo", codigo).maybeSingle();
    if (data) return data;
  }
  const nome = String(orcamento.fornecedor_nome || orcamento.operacao || "").trim();
  if (!nome) return null;
  const { data } = await supabase.from("fornecedores").select(cols).ilike("nome_fantasia", `%${nome}%`).limit(1);
  return data && data.length > 0 ? data[0] : null;
}

async function carregarOrcamento(id: string): Promise<{ orcamento: Orcamento; itens: OrcamentoItem[] } | null> {
  const { data: orc } = await supabase.from("orcamentos").select("*").eq("id", id).maybeSingle();
  if (!orc) return null;

  const [fornecedor, { data: itens }, { data: cliente }] = await Promise.all([
    buscarFornecedorLayout(orc),
    supabase.from("orcamento_itens").select("*").eq("orcamento_id", id).order("ordem"),
    orc.cliente_id
      ? supabase.from("clientes").select("id, nome_fantasia, cnpj, razao_social, email, telefone, endereco, bairro, cidade, estado, cep").eq("id", orc.cliente_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const orcamentoBase: Orcamento = {
    ...orc,
    total: parseNum(orc.total) || parseNum(orc.valor_total) || 0,
    subtotal: parseNum(orc.subtotal) || parseNum(orc.valor_produtos) || 0,
    frete: parseNum(orc.frete) || parseNum(orc.valor_frete) || 0,
    desconto: parseNum(orc.desconto) || parseNum(orc.valor_desconto) || 0,
  } as Orcamento;

  if (cliente) {
    const c = cliente as any;
    const cidadeEstado = [c.cidade, c.estado].filter(Boolean).join("/");
    const endereco = [c.endereco, c.bairro, cidadeEstado, c.cep ? `CEP: ${c.cep}` : null].filter(Boolean).join(" - ");
    Object.assign(orcamentoBase, {
      cliente_nome: c.nome_fantasia || orcamentoBase.cliente_nome,
      cliente_razao_social: c.razao_social || orcamentoBase.cliente_razao_social,
      cliente_cnpj: c.cnpj || orcamentoBase.cliente_cnpj,
      cliente_endereco: (orcamentoBase as any).cliente_endereco || endereco || null,
      cliente_email: c.email || orcamentoBase.cliente_email,
      cliente_telefone: c.telefone || orcamentoBase.cliente_telefone,
    });
  }

  if (fornecedor) {
    Object.assign(orcamentoBase, {
      fornecedor_id: (orcamentoBase as any).fornecedor_id || fornecedor.id,
      fornecedor_nome: (orcamentoBase as any).fornecedor_nome || fornecedor.nome_fantasia,
      operacao: (orcamentoBase as any).operacao || fornecedor.nome_fantasia,
      fornecedor_tipo_layout: fornecedor.tipo_layout,
      fornecedor_logotipo_url: fornecedor.logotipo_url,
      fornecedor_nome_fantasia: fornecedor.nome_fantasia,
      fornecedor_imagem_template_url: fornecedor.imagem_template_url,
      fornecedor_cor_primaria: "#C8962E",
      fornecedor_cor_secundaria: "#1a4168",
      fornecedor_termos_fabricante: fornecedor.termos_fabricante,
      fornecedor_condicoes_pagamento_padrao: fornecedor.condicoes_pagamento_padrao,
    });
  }

  return {
    orcamento: orcamentoBase,
    itens: ((itens as OrcamentoItem[]) || []).sort((a, b) => a.ordem - b.ordem),
  };
}

export function VisualizarOrcamentoModal({ orcamentoId, open, onClose }: Props) {
  const [dados, setDados] = useState<{ orcamento: Orcamento; itens: OrcamentoItem[] } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    if (!open || !orcamentoId) { setDados(null); return; }
    setCarregando(true);
    carregarOrcamento(orcamentoId)
      .then(setDados)
      .finally(() => setCarregando(false));
  }, [open, orcamentoId]);

  async function baixarPDF() {
    if (!dados) return;
    setBaixando(true);
    toast.info("Gerando PDF...");
    try {
      const A4_W = 210, A4_H = 297;
      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:white;";
      document.body.appendChild(container);
      const root = ReactDOM.createRoot(container);
      await new Promise<void>(res => {
        root.render(
          <OrcamentoTemplate
            orcamento={dados.orcamento}
            itens={dados.itens}
            enderecoEntrega={String((dados.orcamento as any).cliente_endereco || "").trim()}
          />
        );
        setTimeout(res, 1200);
      });
      const paginas = container.querySelectorAll("[data-pdf-page]");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      for (let i = 0; i < paginas.length; i++) {
        const canvas = await html2canvas(paginas[i] as HTMLElement, { scale: 2, useCORS: true });
        if (i > 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, A4_W, A4_H);
      }
      pdf.save(`Orcamento_${dados.orcamento.numero || "orcamento"}.pdf`);
      root.unmount();
      document.body.removeChild(container);
      toast.success("PDF baixado!");
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Orçamento {dados?.orcamento.numero}</DialogTitle>
          <DialogDescription>Visualização do orçamento</DialogDescription>
        </DialogHeader>
        <div className="bg-muted border-b p-4 flex items-center justify-between">
          <h3 className="font-bold text-lg">
            Orçamento {dados?.orcamento.numero || "..."}
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={baixarPDF} disabled={baixando || !dados}>
              {baixando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Baixar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4 mr-2" /> Fechar
            </Button>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[85vh]">
          {carregando ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : dados ? (
            <OrcamentoTemplate
              orcamento={dados.orcamento}
              itens={dados.itens}
              enderecoEntrega={String((dados.orcamento as any).cliente_endereco || "").trim()}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
