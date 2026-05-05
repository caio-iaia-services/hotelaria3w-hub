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
import { CIDADES_POR_ESTADO } from "@/data/cidadesPorEstado";
import SegmentoMultiSelect from "@/components/clientes/SegmentoMultiSelect";

// Mapeamento flexível de nomes de colunas do Excel para campos do banco
const COLUMN_MAP: Record<string, string> = {
  nome_fantasia: "nome_fantasia",
  "nome fantasia": "nome_fantasia",
  nome: "nome_fantasia",
  "nome do estabelecimento": "nome_fantasia",
  fantasia: "nome_fantasia",
  "nome fantasia/razao social": "nome_fantasia",
  razao_social: "razao_social",
  "razao social": "razao_social",
  razão_social: "razao_social",
  "razão social": "razao_social",
  empresa: "razao_social",
  cnpj: "cnpj",
  "cnpj/cpf": "cnpj",
  email: "email",
  "e-mail": "email",
  "e mail": "email",
  "telefone 1": "telefone",
  "telefone 2": "telefone",
  telefone: "telefone",
  fone: "telefone",
  celular: "telefone",
  endereco: "endereco",
  endereço: "endereco",
  "endereço": "endereco",
  logradouro: "endereco",
  numero: "numero",
  "número": "numero",
  complemento: "complemento",
  cidade: "cidade",
  municipio: "cidade",
  município: "cidade",
  estado: "estado",
  uf: "estado",
  segmento: "segmento",
  "tipo de segmento": "segmento",
  "ramo de atividade": "segmento",
  status: "status",
  tipo: "tipo",
  bairro: "bairro",
  cep: "cep",
  observacoes: "observacoes",
  observações: "observacoes",
  obs: "observacoes",
};

const SEGMENTOS_VALIDOS = ["Hotelaria", "Gastronomia", "Hospitalar", "Condominial", "Exportação", "Outros"];
const ESTADOS_VALIDOS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO",
  "MA","MG","MS","MT","PA","PB","PE","PI","PR",
  "RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

type LinhaPreview = {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  segmento: string | null;
  status: string;
  tipo: string;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  observacoes: string | null;
  _erros: string[];
};

type ResultadoImportacao = {
  inseridos: number;
  duplicados: number;
  erros: number;
  detalhes_erros: string[];
};

function normalizarColuna(col: string): string {
  return col.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizarCNPJ(cnpj: string): string {
  return String(cnpj).replace(/\D/g, "");
}

function normalizarEstado(estado: string): string {
  const uf = String(estado).trim().toUpperCase().slice(0, 2);
  return ESTADOS_VALIDOS.includes(uf) ? uf : String(estado).trim().toUpperCase();
}

// Índice invertido: "sao paulo" → "São Paulo", para todos os estados
const CIDADES_LOOKUP: Map<string, string> = new Map(
  Object.values(CIDADES_POR_ESTADO)
    .flat()
    .map((cidade) => [
      cidade.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""),
      cidade,
    ])
);

function normalizarCidade(cidade: string): string {
  const s = String(cidade).trim();
  if (!s) return s;

  // Tentativa 1: match exato (sem acento, sem case) na lista oficial
  const chave = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const oficial = CIDADES_LOOKUP.get(chave);
  if (oficial) return oficial;

  // Tentativa 2: Title Case preservando preposições minúsculas
  const PREPS = new Set(["de", "da", "do", "das", "dos", "e", "o", "a", "os", "as"]);
  return s
    .toLowerCase()
    .split(" ")
    .map((palavra, i) =>
      i === 0 || !PREPS.has(palavra)
        ? palavra.charAt(0).toUpperCase() + palavra.slice(1)
        : palavra
    )
    .join(" ");
}

function normalizarSegmento(seg: string): string {
  if (!seg) return "";
  const s = String(seg).trim().toLowerCase();
  for (const v of SEGMENTOS_VALIDOS) {
    if (v.toLowerCase() === s || v.toLowerCase().startsWith(s)) return v;
  }
  return String(seg).trim();
}

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
    if (!mapped.nome_fantasia && !mapped.razao_social) erros.push("Nome/Razão Social obrigatório");
    if (!mapped.cnpj) erros.push("CNPJ obrigatório");

    const cnpjLimpo = mapped.cnpj ? normalizarCNPJ(mapped.cnpj) : "";
    if (cnpjLimpo && cnpjLimpo.length !== 14 && cnpjLimpo.length !== 11) {
      erros.push("CNPJ inválido");
    }

    return {
      nome_fantasia: mapped.nome_fantasia || mapped.razao_social || "",
      razao_social: mapped.razao_social || mapped.nome_fantasia || "",
      cnpj: cnpjLimpo,
      email: mapped.email || null,
      telefone: mapped.telefone || null,
      cidade: mapped.cidade ? normalizarCidade(mapped.cidade) : null,
      estado: mapped.estado ? normalizarEstado(mapped.estado) : null,
      segmento: mapped.segmento ? normalizarSegmento(mapped.segmento) : null,
      status: mapped.status?.toLowerCase() === "inativo" ? "inativo" : "ativo",
      tipo: mapped.tipo?.toLowerCase() === "vip" ? "vip" : "regular",
      endereco: mapped.endereco || null,
      bairro: mapped.bairro || null,
      cep: mapped.cep?.replace(/\D/g, "") || null,
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

export default function ImportarClientesModal({ open, onClose, onImportado }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [linhas, setLinhas] = useState<LinhaPreview[]>([]);
  const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function resetar() {
    setEtapa("upload");
    setNomeArquivo("");
    setLinhas([]);
    setSegmentosSelecionados([]);
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

    // CSV: lê como ArrayBuffer para SheetJS detectar encoding automaticamente
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);

        // Auto-detecta separador: pega a primeira linha e conta ; vs ,
        const primeirosBytes = new TextDecoder("windows-1252").decode(data.slice(0, 500));
        const primeiraLinha = primeirosBytes.split(/\r?\n/)[0];
        const FS = (primeiraLinha.match(/;/g) || []).length > (primeiraLinha.match(/,/g) || []).length ? ";" : ",";

        parsearEExibir(XLSX.read(data, { type: "array", FS, codepage: 1252 }));
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
    if (segmentosSelecionados.length === 0) {
      toast({ title: "Selecione ao menos um segmento antes de importar", variant: "destructive" });
      return;
    }

    setImportando(true);
    setProgresso(0);

    let inseridos = 0;
    let duplicados = 0;
    let erros = 0;
    const detalhes_erros: string[] = [];

    // Buscar CNPJs já existentes em lote
    const cnpjsParaImportar = validas.map((l) => l.cnpj).filter(Boolean);
    const { data: existentes } = await supabase
      .from("clientes")
      .select("cnpj")
      .in("cnpj", cnpjsParaImportar);
    const cnpjsExistentes = new Set((existentes || []).map((c) => c.cnpj));

    const LOTE = 50;
    const novas = validas.filter((l) => !cnpjsExistentes.has(l.cnpj));
    duplicados = validas.length - novas.length;

    for (let i = 0; i < novas.length; i += LOTE) {
      const lote = novas.slice(i, i + LOTE).map(({ _erros, segmento: _seg, ...resto }) => ({
        ...resto,
        segmento: segmentosSelecionados,
        pais: "Brasil",
      }));

      const { error } = await supabase.from("clientes").insert(lote);
      if (error) {
        erros += lote.length;
        detalhes_erros.push(`Lote ${Math.floor(i / LOTE) + 1}: ${error.message}`);
      } else {
        inseridos += lote.length;
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
            <FileSpreadsheet size={20} className="text-[#1a4168]" />
            Importar Clientes via Planilha
          </DialogTitle>
          <DialogDescription>
            Faça upload de uma planilha Excel (.xlsx, .xls) ou arquivo CSV com os dados dos clientes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ETAPA 1: Upload */}
          {etapa === "upload" && (
            <div className="space-y-4 py-2">
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                  isDragging ? "border-[#1a4168] bg-[#1a4168]/5" : "border-muted-foreground/25 hover:border-[#1a4168]/50"
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
                  {["Nome Fantasia", "Razão Social", "CNPJ", "Email", "Telefone", "Cidade", "UF/Estado", "Segmento", "Endereço", "Bairro", "CEP", "Status", "Tipo", "Observações"].map((c) => (
                    <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Os nomes das colunas não precisam ser exatos. CNPJ e Nome Fantasia são obrigatórios.
                </p>
              </div>
            </div>
          )}

          {/* ETAPA 2: Preview */}
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
                      • {l.nome_fantasia || l.cnpj || `Linha ${i + 1}`}: {l._erros.join(", ")}
                    </p>
                  ))}
                  {linhasComErro.length > 5 && (
                    <p className="text-xs text-muted-foreground">...e mais {linhasComErro.length - 5} linhas</p>
                  )}
                </div>
              )}

              <SegmentoMultiSelect
                label="Segmento(s) a aplicar nos clientes importados"
                value={segmentosSelecionados}
                onChange={setSegmentosSelecionados}
                required
              />

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-[#1a4168]">
                    <TableRow className="hover:bg-[#1a4168] border-[#1a4168]">
                      <TableHead className="text-white text-xs">Nome Fantasia</TableHead>
                      <TableHead className="text-white text-xs">CNPJ</TableHead>
                      <TableHead className="text-white text-xs">Cidade/UF</TableHead>
                      <TableHead className="text-white text-xs">Segmento</TableHead>
                      <TableHead className="text-white text-xs">Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhasValidas.slice(0, 20).map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs py-2">{l.nome_fantasia}</TableCell>
                        <TableCell className="text-xs py-2 font-mono">
                          {l.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}
                        </TableCell>
                        <TableCell className="text-xs py-2">{[l.cidade, l.estado].filter(Boolean).join("/") || "-"}</TableCell>
                        <TableCell className="text-xs py-2">{l.segmento || "-"}</TableCell>
                        <TableCell className="text-xs py-2">{l.email || "-"}</TableCell>
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

          {/* ETAPA 3: Resultado */}
          {etapa === "resultado" && resultado && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 size={22} />
                <span className="font-semibold text-lg">Importação concluída!</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{resultado.inseridos}</p>
                  <p className="text-xs text-muted-foreground mt-1">Clientes inseridos</p>
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

          {/* Barra de progresso durante importação */}
          {importando && (
            <div className="space-y-2 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                Importando clientes... {progresso}%
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
              <Button
                onClick={importar}
                disabled={importando || linhasValidas.length === 0}
                className="bg-[#1a4168] hover:bg-[#153554] text-white gap-2"
              >
                {importando ? (
                  <><Loader2 size={15} className="animate-spin" /> Importando...</>
                ) : (
                  <><Upload size={15} /> Importar {linhasValidas.length} cliente{linhasValidas.length !== 1 ? "s" : ""}</>
                )}
              </Button>
            </>
          )}

          {etapa === "resultado" && (
            <>
              <Button variant="outline" onClick={resetar}>Nova Importação</Button>
              <Button onClick={handleClose} className="bg-[#1a4168] hover:bg-[#153554] text-white">
                Fechar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
