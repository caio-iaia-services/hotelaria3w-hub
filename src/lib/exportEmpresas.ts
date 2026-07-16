import * as XLSX from "xlsx";
import type { Empresa } from "@/pages/BuscarEmpresas";
import { formatCnae, SEGMENTO_LABEL, type Segmento } from "@/data/cnaesSegmentos";

function formatCNPJ(cnpj: string | null) {
  if (!cnpj) return "";
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}
function tel(ddd: string | null, t: string | null) {
  if (!t) return "";
  return ddd ? `(${ddd}) ${t}` : t;
}
function dataBR(d: string | null) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("pt-BR");
}

/** Converte uma empresa para a linha de exportação (campos do spec da 3W). */
export function empresaParaLinha(e: Empresa): Record<string, string> {
  return {
    "CNPJ": formatCNPJ(e.cnpj),
    "Razão Social": e.razao_social || "",
    "Nome Fantasia": e.nome_fantasia || "",
    "Segmento": e.segmento ? SEGMENTO_LABEL[e.segmento as Segmento] || e.segmento : "",
    "CNAE Principal": formatCnae(e.cnae_principal),
    "Atividade Econômica": e.cnae_descricao || "",
    "Logradouro": e.logradouro || "",
    "Número": e.numero || "",
    "Complemento": e.complemento || "",
    "Bairro": e.bairro || "",
    "Município": e.municipio || "",
    "Estado": e.uf || "",
    "CEP": e.cep || "",
    "Situação Cadastral": e.situacao_cadastral || "",
    "Matriz/Filial": e.matriz_filial || "",
    "Natureza Jurídica": e.natureza_juridica || "",
    "Data de Abertura": dataBR(e.data_inicio_atividade),
    "Porte": e.porte || "",
    "Capital Social": e.capital_social != null ? String(e.capital_social) : "",
    "Optante Simples": e.opcao_simples == null ? "" : e.opcao_simples ? "Sim" : "Não",
    "Optante MEI": e.opcao_mei == null ? "" : e.opcao_mei ? "Sim" : "Não",
    "Telefone (dados da receita)": tel(e.ddd1, e.telefone1) || tel(e.ddd2, e.telefone2),
    "E-mail (dados da receita)": e.email || "",
  };
}

/** Gera e baixa um arquivo Excel a partir de uma lista de empresas. */
export function exportarEmpresasExcel(empresas: Empresa[], nomeArquivo = "empresas") {
  const linhas = empresas.map(empresaParaLinha);
  const sheet = XLSX.utils.json_to_sheet(linhas);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Empresas");
  const data = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(book, `${nomeArquivo}_${data}.xlsx`);
}
