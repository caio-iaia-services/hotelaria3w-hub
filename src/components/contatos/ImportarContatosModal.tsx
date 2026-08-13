import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { FONTE_OPTIONS, QUALIFICACAO_OPTIONS } from "@/lib/contatosOpcoes";

// Mapeamento flexível de nomes de colunas do Excel para campos do banco —
// mesma ideia de ImportarClientesModal.tsx, adaptado pros campos de contatos.
const COLUMN_MAP: Record<string, string> = {
  nome: "nome",
  "nome completo": "nome",
  "nome do contato": "nome",
  email: "email",
  "e-mail": "email",
  "e mail": "email",
  telefone: "telefone",
  fone: "telefone",
  "telefone fixo": "telefone",
  whatsapp: "whatsapp",
  whats: "whatsapp",
  celular: "whatsapp",
  cpf: "cpf",
  cargo: "cargo",
  "cargo/funcao": "cargo",
  funcao: "cargo",
  "função": "cargo",
  origem: "origem",
  fonte: "origem",
  status: "status",
  qualificacao: "qualificacao",
  "qualificação": "qualificacao",
  observacoes: "observacoes",
  "observações": "observacoes",
  obs: "observacoes",
};

const FONTE_VALIDAS = FONTE_OPTIONS.map((f) => f.value);
const QUALIFICACAO_VALIDAS = QUALIFICACAO_OPTIONS.map((q) => q.value);

function normalizarColuna(col: string): string {
  return col
    .replace(/^﻿/, "")
    .replace(/^[\xEF\xBB\xBF]+/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/�/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .trim();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/;

// Acha a opção válida de Fonte/Qualificação cujo value OU label bate com o
// texto da planilha (case-insensitive) — assim "wix", "Wix" ou "WIX" casam.
function normalizarContraOpcoes(valor: string, opcoes: { value: string; label: string }[]): string | null {
  const alvo = valor.trim().toLowerCase();
  const achado = opcoes.find((o) => o.value.toLowerCase() === alvo || o.label.toLowerCase() === alvo);
  return achado?.value ?? null;
}

type LinhaPreview = {
  nome: string | null;
  email: string;
  telefone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  cargo: string | null;
  origem: string;
  status: string;
  qualificacao: string;
  observacoes: string | null;
  _erros: string[];
};

type ResultadoImportacao = {
  inseridos: number;
  duplicados: number;
  erros: number;
  detalhes_erros: string[];
};

function parsearLinhas(rows: Record<string, any>[]): LinhaPreview[] {
  return rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [colRaw, valor] of Object.entries(row)) {
      const colNorm = normalizarColuna(String(colRaw));
      const campo = COLUMN_MAP[colNorm];
      if (campo && valor !== undefined && valor !== null && String(valor).trim() !== "") {
        mapped[campo] = String(valor).trim();
      }
    }

    const erros: string[] = [];
    if (!mapped.email) erros.push("E-mail obrigatório");
    else if (!EMAIL_REGEX.test(mapped.email)) erros.push("E-mail inválido");

    const origem = mapped.origem ? normalizarContraOpcoes(mapped.origem, FONTE_OPTIONS) : null;
    const qualificacao = mapped.qualificacao ? normalizarContraOpcoes(mapped.qualificacao, QUALIFICACAO_OPTIONS) : null;
    const status = mapped.status?.toLowerCase() === "inativo" ? "inativo" : "ativo";

    return {
      nome: mapped.nome || null,
      email: mapped.email ? mapped.email.toLowerCase() : "",
      telefone: mapped.telefone || null,
      whatsapp: mapped.whatsapp || null,
      cpf: mapped.cpf || null,
      cargo: mapped.cargo || null,
      // Sem coluna de Fonte reconhecida na planilha (ou valor não bate com
      // nenhuma das 5 opções): assume "Usuário", já que é alguém cadastrando
      // manualmente via importação.
      origem: origem || "Usuário",
      status,
      qualificacao: qualificacao || "cadastrado",
      observacoes: mapped.observacoes || null,
      _erros: erros,
    };
  });
}

type Props = {
  open: boolean;
  onClose: () => void;
  onImportado: () => void;
};

type Etapa = "upload" | "preview" | "resultado";

export default function ImportarContatosModal({ open, onClose, onImportado }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [linhas, setLinhas] = useState<LinhaPreview[]>([]);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function resetar() {
    setEtapa("upload");
    setNomeArquivo("");
    setLinhas([]);
    setImportando(false);
    setProgresso(0);
    setResultado(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    resetar();
    onClose();
  }

  function parsearEExibir(workbook: XLSX.WorkBook) {
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (rows.length === 0) {
      toast({ title: "Planilha vazia", description: "Nenhum dado encontrado.", variant: "destructive" });
      return;
    }
    setLinhas(parsearLinhas(rows));
    setEtapa("preview");
  }

  function processarArquivo(file: File) {
    if (!file) return;
    setNomeArquivo(file.name);

    const isCSV = file.name.toLowerCase().endsWith(".csv");

    if (!isCSV) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          parsearEExibir(XLSX.read(data, { type: "array" }));
        } catch {
          toast({ title: "Erro ao ler arquivo", description: "Certifique-se de que é um arquivo .xlsx ou .xls válido.", variant: "destructive" });
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        let text: string;
        const hasUtf8Bom = data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF;
        if (hasUtf8Bom) {
          text = new TextDecoder("utf-8").decode(data.slice(3));
        } else {
          try {
            text = new TextDecoder("windows-1252").decode(data);
          } catch {
            text = new TextDecoder("utf-8").decode(data);
          }
        }
        const primeiraLinha = text.split(/\r?\n/)[0];
        const FS = (primeiraLinha.match(/;/g) || []).length > (primeiraLinha.match(/,/g) || []).length ? ";" : ",";
        parsearEExibir(XLSX.read(text, { type: "string", FS }));
      } catch {
        toast({ title: "Erro ao ler arquivo", description: "Certifique-se de que é um arquivo .csv válido.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processarArquivo(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processarArquivo(file);
  }

  async function importar() {
    const validas = linhas.filter((l) => l._erros.length === 0);
    if (validas.length === 0) {
      toast({ title: "Nenhuma linha válida para importar", variant: "destructive" });
      return;
    }

    setImportando(true);
    setProgresso(0);

    let inseridos = 0;
    let duplicados = 0;
    let erros = 0;
    const detalhes_erros: string[] = [];

    // contatos.email não tem constraint UNIQUE no banco — sem onConflict pra
    // upsert, então o dedupe é feito aqui: busca os e-mails já existentes e
    // filtra antes de inserir (mesma ideia do dedupe por CNPJ em Clientes,
    // adaptado pra ausência de constraint).
    const emailsParaImportar = [...new Set(validas.map((l) => l.email))];
    const existentes = new Set<string>();
    const LOTE_CHECK = 200;
    for (let i = 0; i < emailsParaImportar.length; i += LOTE_CHECK) {
      const { data } = await supabase
        .from("contatos")
        .select("email")
        .in("email", emailsParaImportar.slice(i, i + LOTE_CHECK));
      (data || []).forEach((c) => existentes.add((c.email || "").toLowerCase()));
    }

    // Também deduplica dentro da própria planilha (mesmo e-mail repetido nela)
    const vistosNaPlanilha = new Set<string>();
    const novas = validas.filter((l) => {
      if (existentes.has(l.email) || vistosNaPlanilha.has(l.email)) return false;
      vistosNaPlanilha.add(l.email);
      return true;
    });
    duplicados = validas.length - novas.length;

    const LOTE = 50;
    for (let i = 0; i < novas.length; i += LOTE) {
      const lote = novas.slice(i, i + LOTE).map(({ _erros, ...resto }) => resto);
      const { data: inseridos_lote, error } = await supabase.from("contatos").insert(lote).select("id");

      if (error) {
        erros += lote.length;
        detalhes_erros.push(`Lote ${Math.floor(i / LOTE) + 1}: ${error.message}`);
      } else {
        inseridos += inseridos_lote?.length ?? lote.length;
      }

      setProgresso(Math.round(((i + LOTE) / novas.length) * 100));
    }

    setProgresso(100);
    setResultado({ inseridos, duplicados, erros, detalhes_erros });
    setEtapa("resultado");
    setImportando(false);

    if (inseridos > 0) onImportado();
  }

  const linhasValidas = linhas.filter((l) => l._erros.length === 0);
  const linhasComErro = linhas.filter((l) => l._erros.length > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={20} />
            Importar Contatos via Planilha
          </DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha Excel (.xlsx, .xls) ou arquivo CSV com os dados dos contatos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {etapa === "upload" && (
            <div className="space-y-4 py-2">
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <Upload size={36} className="mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium text-foreground">Arraste sua planilha aqui</p>
                <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar o arquivo</p>
                <p className="text-xs text-muted-foreground mt-3">Formatos aceitos: .xlsx, .xls, .csv</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-sm font-medium">Colunas reconhecidas automaticamente:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Nome", "E-mail", "Telefone", "WhatsApp", "CPF", "Cargo", "Fonte", "Status", "Qualificação", "Observações"].map((c) => (
                    <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Os nomes das colunas não precisam ser exatos. E-mail é obrigatório. Sem coluna de Fonte reconhecida, os contatos entram como "Usuário".
                </p>
              </div>
            </div>
          )}

          {etapa === "preview" && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    Arquivo: <span className="font-medium text-foreground">{nomeArquivo}</span>
                  </span>
                  <Badge className="bg-green-600 text-white">{linhasValidas.length} válidas</Badge>
                  {linhasComErro.length > 0 && (
                    <Badge variant="destructive">{linhasComErro.length} com erro</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={resetar} className="text-muted-foreground">
                  <X size={14} className="mr-1" /> Trocar arquivo
                </Button>
              </div>

              {linhasComErro.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                  <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                    <AlertCircle size={14} /> {linhasComErro.length} linha(s) serão ignoradas por erro:
                  </p>
                  {linhasComErro.slice(0, 5).map((l, i) => (
                    <p key={i} className="text-xs text-destructive/80">
                      • {l.nome || l.email || `Linha ${i + 1}`}: {l._erros.join(", ")}
                    </p>
                  ))}
                  {linhasComErro.length > 5 && (
                    <p className="text-xs text-muted-foreground">...e mais {linhasComErro.length - 5} linhas</p>
                  )}
                </div>
              )}

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">E-mail</TableHead>
                      <TableHead className="text-xs">Telefone/WhatsApp</TableHead>
                      <TableHead className="text-xs">Fonte</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhasValidas.slice(0, 20).map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs py-2">{l.nome || "-"}</TableCell>
                        <TableCell className="text-xs py-2">{l.email}</TableCell>
                        <TableCell className="text-xs py-2">{l.whatsapp || l.telefone || "-"}</TableCell>
                        <TableCell className="text-xs py-2">{l.origem}</TableCell>
                        <TableCell className="text-xs py-2 capitalize">{l.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {linhasValidas.length > 20 && (
                  <p className="text-xs text-center text-muted-foreground py-2 border-t">
                    Mostrando 20 de {linhasValidas.length} linhas válidas
                  </p>
                )}
              </div>
            </div>
          )}

          {etapa === "resultado" && resultado && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 size={22} />
                <span className="font-semibold text-lg">Importação concluída!</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{resultado.inseridos}</p>
                  <p className="text-xs text-muted-foreground mt-1">Contatos inseridos</p>
                </div>
                <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-700">{resultado.duplicados}</p>
                  <p className="text-xs text-muted-foreground mt-1">Duplicados (ignorados)</p>
                </div>
                <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{resultado.erros}</p>
                  <p className="text-xs text-muted-foreground mt-1">Erros</p>
                </div>
              </div>

              {resultado.detalhes_erros.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                  <p className="text-sm font-medium text-destructive">Detalhes dos erros:</p>
                  {resultado.detalhes_erros.map((e, i) => (
                    <p key={i} className="text-xs text-destructive/80">• {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {importando && (
            <div className="space-y-2 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                Importando contatos... {progresso}%
              </div>
              <Progress value={progresso} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 mt-2">
          {etapa === "upload" && (
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          )}

          {etapa === "preview" && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={importando}>Cancelar</Button>
              <Button onClick={importar} disabled={importando || linhasValidas.length === 0} className="gap-2">
                {importando ? (
                  <><Loader2 size={15} className="animate-spin" /> Importando...</>
                ) : (
                  <><Upload size={15} /> Importar {linhasValidas.length} contato{linhasValidas.length !== 1 ? "s" : ""}</>
                )}
              </Button>
            </>
          )}

          {etapa === "resultado" && (
            <>
              <Button variant="outline" onClick={resetar}>Nova Importação</Button>
              <Button onClick={handleClose}>Fechar</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
