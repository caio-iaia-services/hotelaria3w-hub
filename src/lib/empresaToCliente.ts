import type { Empresa } from "@/pages/BuscarEmpresas";

const SEGMENTO_CLIENTE: Record<string, string> = {
  hotelaria: "Hotelaria",
  gastronomia: "Gastronomia",
  hospitalar: "Hospitalar",
};

/**
 * Mapeia uma empresa (base Receita) para o payload de insert da tabela `clientes`,
 * espelhando exatamente os campos usados no cadastro "Novo Cliente" de Clientes.tsx.
 * Sem anotação de tipo de retorno de propósito: o `.insert()` do supabase-js aceita o
 * literal (incl. `endereco`, que é o campo de endereço usado pela tabela clientes em prod).
 */
export function empresaToClienteInsert(e: Empresa) {
  const tel = e.telefone1
    ? (e.ddd1 ? `(${e.ddd1}) ${e.telefone1}` : e.telefone1)
    : e.telefone2
      ? (e.ddd2 ? `(${e.ddd2}) ${e.telefone2}` : e.telefone2)
      : null;
  return {
    nome_fantasia: e.nome_fantasia || e.razao_social || e.cnpj,
    razao_social: e.razao_social || e.nome_fantasia || "",
    cnpj: e.cnpj,
    // clientes.segmento é text[] no schema atual
    segmento: e.segmento && SEGMENTO_CLIENTE[e.segmento] ? [SEGMENTO_CLIENTE[e.segmento]] : null,
    email: e.email || null,
    telefone: tel,
    cidade: e.municipio || null,
    estado: e.uf || null,
    cep: e.cep || null,
    endereco: [e.logradouro, e.numero].filter(Boolean).join(", ") || null,
    bairro: e.bairro || null,
    tipo: "regular",
    status: "ativo",
    pais: "Brasil",
  };
}
