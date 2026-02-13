export interface OportunidadeOperacao {
  gestao: number;
  operacao: string;
  produtos: string[];
}

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
  operacoes: OportunidadeOperacao[];
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
    id: "OPP-2026-001",
    nomeFantasia: "Hotel Paradise Resort",
    razaoSocial: "Paradise Hotelaria Ltda",
    cnpj: "12345678000190",
    segmento: "Hotelaria",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    email: "contato@paradise.com",
    telefone: "(21) 99876-5432",
    operacoes: [
      { gestao: 1, operacao: "CASTOR", produtos: ["Colchão Box", "Travesseiro"] },
      { gestao: 2, operacao: "MIDEA", produtos: ["Ar condicionado 12k BTU"] },
    ],
    observacoes: "Cliente interessado em renovar toda a linha de colchões e climatização dos quartos.",
    dataCadastro: "2026-02-10T09:30:00",
  },
  {
    id: "OPP-2026-002",
    nomeFantasia: "Pousada Sol Nascente",
    razaoSocial: "Sol Nascente Hospedagens ME",
    cnpj: "23456789000101",
    segmento: "Hotelaria",
    cidade: "Búzios",
    estado: "RJ",
    email: "reservas@solnascente.com",
    telefone: "(22) 98765-4321",
    operacoes: [
      { gestao: 3, operacao: "TEKA", produtos: ["Jogo de cama queen"] },
      { gestao: 2, operacao: "D-LOCK", produtos: ["Fechadura digital"] },
    ],
    observacoes: "Pousada em expansão, abrindo 10 novos quartos.",
    dataCadastro: "2026-02-12T14:00:00",
  },
  {
    id: "OPP-2026-003",
    nomeFantasia: "Grand Hotel Copacabana",
    razaoSocial: "Grand Copacabana SA",
    cnpj: "34567890000112",
    segmento: "Hotelaria",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    email: "compras@grandcopa.com",
    telefone: "(21) 97654-3210",
    operacoes: [
      { gestao: 1, operacao: "SOLEMAR", produtos: ["Poltrona decorativa"] },
      { gestao: 2, operacao: "IM IN", produtos: ["Kit amenities premium"] },
      { gestao: 1, operacao: "RUBBERMAID", produtos: ["Lixeira inox"] },
    ],
    observacoes: "Reforma completa do lobby e quartos premium.",
    dataCadastro: "2026-02-08T11:00:00",
  },
  {
    id: "OPP-2026-004",
    nomeFantasia: "Hospital São Lucas",
    razaoSocial: "Rede São Lucas de Saúde Ltda",
    cnpj: "45678901000123",
    segmento: "Hospitalar",
    cidade: "São Paulo",
    estado: "SP",
    email: "suprimentos@saolucas.com",
    telefone: "(11) 96543-2109",
    operacoes: [
      { gestao: 2, operacao: "CIÇA ENXOVAIS", produtos: ["Enxoval hospitalar"] },
      { gestao: 2, operacao: "MIDEA", produtos: ["Ar condicionado 24k BTU"] },
    ],
    observacoes: "Necessidade urgente para ala nova inaugurada em março.",
    dataCadastro: "2026-02-13T08:00:00",
  },
  {
    id: "OPP-2026-005",
    nomeFantasia: "Restaurante Sabor & Arte",
    razaoSocial: "Sabor e Arte Gastronomia Eireli",
    cnpj: "56789012000134",
    segmento: "Gastronomia",
    cidade: "Belo Horizonte",
    estado: "MG",
    email: "chef@saborearte.com",
    telefone: "(31) 95432-1098",
    operacoes: [
      { gestao: 3, operacao: "KENBY", produtos: ["Panela industrial 50L"] },
      { gestao: 3, operacao: "SKARA", produtos: ["Conjunto de talheres"] },
    ],
    observacoes: "",
    dataCadastro: "2026-02-05T16:20:00",
  },
  {
    id: "OPP-2026-006",
    nomeFantasia: "Hotel Vitória Palace",
    razaoSocial: "Vitória Palace Hotelaria SA",
    cnpj: "67890123000145",
    segmento: "Hotelaria",
    cidade: "Vitória",
    estado: "ES",
    email: "compras@vitoriapalace.com",
    telefone: "(27) 94321-0987",
    operacoes: [
      { gestao: 1, operacao: "CASTOR", produtos: ["Colchão King"] },
      { gestao: 1, operacao: "UNIBLU", produtos: ["Mesa de escritório"] },
    ],
    observacoes: "Renovação da ala executiva.",
    dataCadastro: "2026-02-11T10:15:00",
  },
  {
    id: "OPP-2026-007",
    nomeFantasia: "Clínica Santa Clara",
    razaoSocial: "Santa Clara Serviços Médicos Ltda",
    cnpj: "78901234000156",
    segmento: "Hospitalar",
    cidade: "Curitiba",
    estado: "PR",
    email: "admin@santaclara.com",
    telefone: "(41) 93210-9876",
    operacoes: [
      { gestao: 2, operacao: "CIÇA ENXOVAIS", produtos: ["Lençol hospitalar", "Fronha"] },
    ],
    observacoes: "Pedido recorrente trimestral.",
    dataCadastro: "2026-02-09T15:45:00",
  },
  {
    id: "OPP-2026-008",
    nomeFantasia: "Bistrô Elegance",
    razaoSocial: "Elegance Gastronomia ME",
    cnpj: "89012345000167",
    segmento: "Gastronomia",
    cidade: "Florianópolis",
    estado: "SC",
    email: "contato@bistroelegance.com",
    telefone: "(48) 92109-8765",
    operacoes: [
      { gestao: 3, operacao: "TEKA", produtos: ["Jogo americano", "Guardanapo de linho"] },
      { gestao: 3, operacao: "SKARA", produtos: ["Faqueiro premium"] },
    ],
    observacoes: "Inauguração prevista para março.",
    dataCadastro: "2026-02-07T09:00:00",
  },
  {
    id: "OPP-2026-009",
    nomeFantasia: "Resort Atlântica",
    razaoSocial: "Atlântica Resorts e Lazer SA",
    cnpj: "90123456000178",
    segmento: "Hotelaria",
    cidade: "Salvador",
    estado: "BA",
    email: "compras@atlanticaresort.com",
    telefone: "(71) 91098-7654",
    operacoes: [
      { gestao: 1, operacao: "SOLEMAR", produtos: ["Espreguiçadeira", "Ombrelone"] },
      { gestao: 3, operacao: "REDES DE DORMIR", produtos: ["Rede king", "Rede casal"] },
    ],
    observacoes: "Área de lazer ao ar livre em reforma total.",
    dataCadastro: "2026-02-06T13:30:00",
  },
  {
    id: "OPP-2026-010",
    nomeFantasia: "Hotel Serra Azul",
    razaoSocial: "Serra Azul Hotelaria Ltda",
    cnpj: "01234567000189",
    segmento: "Hotelaria",
    cidade: "Gramado",
    estado: "RS",
    email: "reservas@serraazul.com",
    telefone: "(54) 90987-6543",
    operacoes: [
      { gestao: 2, operacao: "MIDEA", produtos: ["Aquecedor split"] },
      { gestao: 1, operacao: "CASTOR", produtos: ["Colchão de mola"] },
    ],
    observacoes: "Preparação para temporada de inverno 2026.",
    dataCadastro: "2026-02-04T08:00:00",
  },
  {
    id: "OPP-2026-011",
    nomeFantasia: "Pousada Tropical",
    razaoSocial: "Tropical Pousadas ME",
    cnpj: "11234567000190",
    segmento: "Hotelaria",
    cidade: "Natal",
    estado: "RN",
    email: "contato@pousadatropical.com",
    telefone: "(84) 99876-1234",
    operacoes: [
      { gestao: 1, operacao: "RUBBERMAID", produtos: ["Carrinho de limpeza", "Lixeira 50L"] },
    ],
    observacoes: "Solicitação de orçamento para equipamentos de housekeeping.",
    dataCadastro: "2026-02-03T11:20:00",
  },
];
