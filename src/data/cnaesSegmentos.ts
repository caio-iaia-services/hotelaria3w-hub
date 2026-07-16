// Catálogo de CNAEs-alvo do módulo Buscar Empresas, agrupados pelos segmentos
// de atuação da 3W Hotelaria. Fonte canônica do mapeamento CNAE -> segmento
// usado nos filtros da UI. O ETL (3w_importacao/importar_receita_cnpj.py)
// mantém uma cópia equivalente desta lista em Python — manter as duas em sincronia.

export type Segmento = "hotelaria" | "gastronomia" | "hospitalar";

export interface CnaeInfo {
  codigo: string; // 7 dígitos, sem máscara (como na base da Receita)
  descricao: string;
  segmento: Segmento;
}

export const CNAES_ALVO: CnaeInfo[] = [
  // ---------------- Hotelaria / alojamento ----------------
  { codigo: "5510801", descricao: "Hotéis", segmento: "hotelaria" },
  { codigo: "5510802", descricao: "Apart-hotéis", segmento: "hotelaria" },
  { codigo: "5510803", descricao: "Motéis", segmento: "hotelaria" },
  { codigo: "5590601", descricao: "Albergues, exceto assistenciais", segmento: "hotelaria" },
  { codigo: "5590602", descricao: "Campings", segmento: "hotelaria" },
  { codigo: "5590603", descricao: "Pensões (alojamento)", segmento: "hotelaria" },
  { codigo: "5590699", descricao: "Outros alojamentos não especificados", segmento: "hotelaria" },

  // ---------------- Gastronomia ----------------
  { codigo: "5611201", descricao: "Restaurantes e similares", segmento: "gastronomia" },
  { codigo: "5611203", descricao: "Lanchonetes, casas de chá, de sucos e similares", segmento: "gastronomia" },
  { codigo: "5611204", descricao: "Bares e outros estabelecimentos especializados em servir bebidas, sem entretenimento", segmento: "gastronomia" },
  { codigo: "5611205", descricao: "Bares e outros estabelecimentos especializados em servir bebidas, com entretenimento", segmento: "gastronomia" },
  { codigo: "5620101", descricao: "Fornecimento de alimentos preparados preponderantemente para empresas", segmento: "gastronomia" },
  { codigo: "5620102", descricao: "Serviços de alimentação para eventos e recepções - bufê", segmento: "gastronomia" },
  { codigo: "5620103", descricao: "Cantinas - serviços de alimentação privativos", segmento: "gastronomia" },
  { codigo: "5620104", descricao: "Fornecimento de alimentos preparados preponderantemente para consumo domiciliar", segmento: "gastronomia" },

  // ---------------- Hospitalar / saúde ----------------
  { codigo: "8610101", descricao: "Atividades de atendimento hospitalar, exceto pronto-socorro e unidades para atendimento a urgências", segmento: "hospitalar" },
  { codigo: "8610102", descricao: "Atividades de atendimento em pronto-socorro e unidades hospitalares para atendimento a urgências", segmento: "hospitalar" },
  { codigo: "8630501", descricao: "Atividade médica ambulatorial com recursos para realização de procedimentos cirúrgicos", segmento: "hospitalar" },
  { codigo: "8630502", descricao: "Atividade médica ambulatorial com recursos para realização de exames complementares", segmento: "hospitalar" },
  { codigo: "8630503", descricao: "Atividade médica ambulatorial restrita a consultas", segmento: "hospitalar" },
  { codigo: "8711501", descricao: "Clínicas e residências geriátricas", segmento: "hospitalar" },
  { codigo: "8711502", descricao: "Instituições de longa permanência para idosos", segmento: "hospitalar" },
  { codigo: "8711503", descricao: "Atividades de assistência a deficientes físicos, imunodeprimidos e convalescentes", segmento: "hospitalar" },
  { codigo: "8711504", descricao: "Centros de apoio a pacientes com câncer e com AIDS", segmento: "hospitalar" },
  { codigo: "8711505", descricao: "Condomínios residenciais para idosos", segmento: "hospitalar" },
];

export const CNAE_POR_CODIGO: Record<string, CnaeInfo> = Object.fromEntries(
  CNAES_ALVO.map((c) => [c.codigo, c]),
);

export const SEGMENTO_LABEL: Record<Segmento, string> = {
  hotelaria: "Hotelaria",
  gastronomia: "Gastronomia",
  hospitalar: "Hospitalar",
};

export function cnaesPorSegmento(segmento: Segmento): CnaeInfo[] {
  return CNAES_ALVO.filter((c) => c.segmento === segmento);
}

/** Formata um código CNAE de 7 dígitos para a máscara 0000-0/00. */
export function formatCnae(codigo: string | null | undefined): string {
  if (!codigo) return "-";
  const d = codigo.replace(/\D/g, "");
  if (d.length !== 7) return codigo;
  return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5)}`;
}
