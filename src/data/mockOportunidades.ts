export interface OportunidadeData {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  segmento: "Hotelaria" | "Gastronomia" | "Hospitalar";
  cidade: string;
  estado: string;
  email: string;
  telefone: string;
  gestao: number;
  operacao: string;
  observacoes: string;
  dataCadastro: string;
}

export const gestaoOperacoes: Record<number, string[]> = {
  1: ["CASTOR", "RUBBERMAID", "SOLEMAR", "UNIBLU"],
  2: ["MIDEA", "D-LOCK", "CIÇA ENXOVAIS", "IM IN"],
  3: ["TEKA", "KENBY", "REDES DE DORMIR", "SKARA"],
};

export function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

let nextId = 12;
export function generateOppId(): string {
  const id = `OPP-2026-${String(nextId).padStart(3, "0")}`;
  nextId++;
  return id;
}

export const mockOportunidades: OportunidadeData[] = [
  {
    id: "OPP-2026-001", nomeFantasia: "Hotel Paradise Resort", razaoSocial: "Paradise Hotelaria Ltda",
    cnpj: "12345678000190", segmento: "Hotelaria", cidade: "Rio de Janeiro", estado: "RJ",
    email: "contato@paradise.com", telefone: "(21) 99876-5432",
    gestao: 1, operacao: "CASTOR",
    observacoes: "Cliente interessado em renovar toda a linha de colchões.", dataCadastro: "2026-02-10T09:30:00",
  },
  {
    id: "OPP-2026-002", nomeFantasia: "Hotel Paradise Resort", razaoSocial: "Paradise Hotelaria Ltda",
    cnpj: "12345678000190", segmento: "Hotelaria", cidade: "Rio de Janeiro", estado: "RJ",
    email: "contato@paradise.com", telefone: "(21) 99876-5432",
    gestao: 2, operacao: "MIDEA",
    observacoes: "Ar condicionado 12k BTU para 30 quartos.", dataCadastro: "2026-02-10T10:15:00",
  },
  {
    id: "OPP-2026-003", nomeFantasia: "Pousada Sol Nascente", razaoSocial: "Sol Nascente Hospedagens ME",
    cnpj: "23456789000101", segmento: "Hotelaria", cidade: "Búzios", estado: "RJ",
    email: "reservas@solnascente.com", telefone: "(22) 98765-4321",
    gestao: 3, operacao: "TEKA",
    observacoes: "Jogo de cama queen para 10 novos quartos.", dataCadastro: "2026-02-12T14:00:00",
  },
  {
    id: "OPP-2026-004", nomeFantasia: "Pousada Sol Nascente", razaoSocial: "Sol Nascente Hospedagens ME",
    cnpj: "23456789000101", segmento: "Hotelaria", cidade: "Búzios", estado: "RJ",
    email: "reservas@solnascente.com", telefone: "(22) 98765-4321",
    gestao: 2, operacao: "D-LOCK",
    observacoes: "Fechadura digital para quartos novos.", dataCadastro: "2026-02-12T14:45:00",
  },
  {
    id: "OPP-2026-005", nomeFantasia: "Grand Hotel Copacabana", razaoSocial: "Grand Copacabana SA",
    cnpj: "34567890000112", segmento: "Hotelaria", cidade: "Rio de Janeiro", estado: "RJ",
    email: "compras@grandcopa.com", telefone: "(21) 97654-3210",
    gestao: 1, operacao: "SOLEMAR",
    observacoes: "Poltrona decorativa para lobby.", dataCadastro: "2026-02-08T11:00:00",
  },
  {
    id: "OPP-2026-006", nomeFantasia: "Grand Hotel Copacabana", razaoSocial: "Grand Copacabana SA",
    cnpj: "34567890000112", segmento: "Hotelaria", cidade: "Rio de Janeiro", estado: "RJ",
    email: "compras@grandcopa.com", telefone: "(21) 97654-3210",
    gestao: 2, operacao: "IM IN",
    observacoes: "Kit amenities premium.", dataCadastro: "2026-02-08T11:30:00",
  },
  {
    id: "OPP-2026-007", nomeFantasia: "Grand Hotel Copacabana", razaoSocial: "Grand Copacabana SA",
    cnpj: "34567890000112", segmento: "Hotelaria", cidade: "Rio de Janeiro", estado: "RJ",
    email: "compras@grandcopa.com", telefone: "(21) 97654-3210",
    gestao: 1, operacao: "RUBBERMAID",
    observacoes: "Lixeira inox para quartos e áreas comuns.", dataCadastro: "2026-02-08T12:00:00",
  },
  {
    id: "OPP-2026-008", nomeFantasia: "Hospital São Lucas", razaoSocial: "Rede São Lucas de Saúde Ltda",
    cnpj: "45678901000123", segmento: "Hospitalar", cidade: "São Paulo", estado: "SP",
    email: "suprimentos@saolucas.com", telefone: "(11) 96543-2109",
    gestao: 2, operacao: "CIÇA ENXOVAIS",
    observacoes: "Enxoval hospitalar para ala nova.", dataCadastro: "2026-02-13T08:00:00",
  },
  {
    id: "OPP-2026-009", nomeFantasia: "Hospital São Lucas", razaoSocial: "Rede São Lucas de Saúde Ltda",
    cnpj: "45678901000123", segmento: "Hospitalar", cidade: "São Paulo", estado: "SP",
    email: "suprimentos@saolucas.com", telefone: "(11) 96543-2109",
    gestao: 2, operacao: "MIDEA",
    observacoes: "Ar condicionado 24k BTU.", dataCadastro: "2026-02-13T08:45:00",
  },
  {
    id: "OPP-2026-010", nomeFantasia: "Restaurante Sabor & Arte", razaoSocial: "Sabor e Arte Gastronomia Eireli",
    cnpj: "56789012000134", segmento: "Gastronomia", cidade: "Belo Horizonte", estado: "MG",
    email: "chef@saborearte.com", telefone: "(31) 95432-1098",
    gestao: 3, operacao: "KENBY",
    observacoes: "Panela industrial 50L.", dataCadastro: "2026-02-05T16:20:00",
  },
  {
    id: "OPP-2026-011", nomeFantasia: "Restaurante Sabor & Arte", razaoSocial: "Sabor e Arte Gastronomia Eireli",
    cnpj: "56789012000134", segmento: "Gastronomia", cidade: "Belo Horizonte", estado: "MG",
    email: "chef@saborearte.com", telefone: "(31) 95432-1098",
    gestao: 3, operacao: "SKARA",
    observacoes: "Conjunto de talheres profissional.", dataCadastro: "2026-02-05T16:50:00",
  },
];
