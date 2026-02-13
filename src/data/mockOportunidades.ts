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

let nextId = 16;
export function generateOppId(): string {
  const id = `OPP-2026-${String(nextId).padStart(3, "0")}`;
  nextId++;
  return id;
}

export const mockOportunidades: OportunidadeData[] = [
  { id: "OPP-2026-001", nomeFantasia: "Hotel Paradise Resort", razaoSocial: "Paradise Hotelaria Ltda", cnpj: "12345678000190", segmento: "Hotelaria", cidade: "Rio de Janeiro", estado: "RJ", email: "contato@paradise.com", telefone: "(21) 99876-5432", gestao: 1, operacao: "CASTOR", observacoes: "Renovação de colchões para 50 quartos.", dataCadastro: "2026-02-10T09:30:00" },
  { id: "OPP-2026-002", nomeFantasia: "Restaurante Gourmet SP", razaoSocial: "Gourmet Gastronomia Ltda", cnpj: "23456789000101", segmento: "Gastronomia", cidade: "São Paulo", estado: "SP", email: "compras@gourmetsp.com", telefone: "(11) 98765-4321", gestao: 2, operacao: "MIDEA", observacoes: "Ar condicionado para salão principal.", dataCadastro: "2026-02-11T10:00:00" },
  { id: "OPP-2026-003", nomeFantasia: "Hospital São Lucas", razaoSocial: "Rede São Lucas de Saúde Ltda", cnpj: "34567890000112", segmento: "Hospitalar", cidade: "São Paulo", estado: "SP", email: "suprimentos@saolucas.com", telefone: "(11) 96543-2109", gestao: 3, operacao: "TEKA", observacoes: "Enxoval hospitalar para ala nova.", dataCadastro: "2026-02-12T08:00:00" },
  { id: "OPP-2026-004", nomeFantasia: "Pousada Sol Nascente", razaoSocial: "Sol Nascente Hospedagens ME", cnpj: "45678901000123", segmento: "Hotelaria", cidade: "Búzios", estado: "RJ", email: "reservas@solnascente.com", telefone: "(22) 98765-4321", gestao: 1, operacao: "RUBBERMAID", observacoes: "Lixeiras para quartos e áreas comuns.", dataCadastro: "2026-02-09T14:00:00" },
  { id: "OPP-2026-005", nomeFantasia: "Grand Hotel Copacabana", razaoSocial: "Grand Copacabana SA", cnpj: "56789012000134", segmento: "Hotelaria", cidade: "Rio de Janeiro", estado: "RJ", email: "compras@grandcopa.com", telefone: "(21) 97654-3210", gestao: 1, operacao: "SOLEMAR", observacoes: "Poltrona decorativa para lobby.", dataCadastro: "2026-02-08T11:00:00" },
  { id: "OPP-2026-006", nomeFantasia: "Clínica Vida Plena", razaoSocial: "Vida Plena Saúde Eireli", cnpj: "67890123000145", segmento: "Hospitalar", cidade: "Curitiba", estado: "PR", email: "admin@vidaplena.com", telefone: "(41) 99876-1234", gestao: 2, operacao: "CIÇA ENXOVAIS", observacoes: "Enxoval para 20 leitos.", dataCadastro: "2026-02-07T09:15:00" },
  { id: "OPP-2026-007", nomeFantasia: "Restaurante Sabor & Arte", razaoSocial: "Sabor e Arte Gastronomia Eireli", cnpj: "78901234000156", segmento: "Gastronomia", cidade: "Belo Horizonte", estado: "MG", email: "chef@saborearte.com", telefone: "(31) 95432-1098", gestao: 3, operacao: "KENBY", observacoes: "Panela industrial 50L.", dataCadastro: "2026-02-05T16:20:00" },
  { id: "OPP-2026-008", nomeFantasia: "Hotel Tropical", razaoSocial: "Tropical Turismo Ltda", cnpj: "89012345000167", segmento: "Hotelaria", cidade: "Salvador", estado: "BA", email: "contato@hoteltropical.com", telefone: "(71) 98888-7777", gestao: 2, operacao: "D-LOCK", observacoes: "Fechadura digital para 40 quartos.", dataCadastro: "2026-02-06T13:30:00" },
  { id: "OPP-2026-009", nomeFantasia: "Bistrô Central", razaoSocial: "Central Gastronomia ME", cnpj: "90123456000178", segmento: "Gastronomia", cidade: "Porto Alegre", estado: "RS", email: "contato@bistrocentral.com", telefone: "(51) 97777-6666", gestao: 3, operacao: "SKARA", observacoes: "Conjunto de talheres profissional.", dataCadastro: "2026-02-04T10:00:00" },
  { id: "OPP-2026-010", nomeFantasia: "Resort Águas Claras", razaoSocial: "Águas Claras Hotelaria SA", cnpj: "01234567000189", segmento: "Hotelaria", cidade: "Caldas Novas", estado: "GO", email: "compras@aguasclaras.com", telefone: "(62) 96666-5555", gestao: 1, operacao: "UNIBLU", observacoes: "Amenities para 100 quartos.", dataCadastro: "2026-02-03T15:45:00" },
  { id: "OPP-2026-011", nomeFantasia: "Hospital Santa Maria", razaoSocial: "Santa Maria Saúde Ltda", cnpj: "11234567000190", segmento: "Hospitalar", cidade: "Recife", estado: "PE", email: "compras@santamaria.com", telefone: "(81) 95555-4444", gestao: 2, operacao: "IM IN", observacoes: "Kit amenities para pacientes VIP.", dataCadastro: "2026-02-02T08:30:00" },
  { id: "OPP-2026-012", nomeFantasia: "Pousada Mar Azul", razaoSocial: "Mar Azul Hospedagens Ltda", cnpj: "22345678000101", segmento: "Hotelaria", cidade: "Florianópolis", estado: "SC", email: "reservas@marazul.com", telefone: "(48) 94444-3333", gestao: 3, operacao: "REDES DE DORMIR", observacoes: "Redes para área de lazer.", dataCadastro: "2026-02-01T11:00:00" },
  { id: "OPP-2026-013", nomeFantasia: "Cantina Italiana", razaoSocial: "Cantina Bella Italia ME", cnpj: "33456789000112", segmento: "Gastronomia", cidade: "São Paulo", estado: "SP", email: "contato@cantina.com", telefone: "(11) 93333-2222", gestao: 2, operacao: "MIDEA", observacoes: "Ar condicionado split para cozinha.", dataCadastro: "2026-01-30T14:20:00" },
  { id: "OPP-2026-014", nomeFantasia: "Hotel Serra Verde", razaoSocial: "Serra Verde Hotelaria Eireli", cnpj: "44567890000123", segmento: "Hotelaria", cidade: "Gramado", estado: "RS", email: "contato@serraverde.com", telefone: "(54) 92222-1111", gestao: 1, operacao: "CASTOR", observacoes: "Colchões king size para suítes premium.", dataCadastro: "2026-01-28T09:00:00" },
  { id: "OPP-2026-015", nomeFantasia: "Clínica Bem Estar", razaoSocial: "Bem Estar Clínica Médica Ltda", cnpj: "55678901000134", segmento: "Hospitalar", cidade: "Brasília", estado: "DF", email: "admin@bemestar.com", telefone: "(61) 91111-0000", gestao: 3, operacao: "TEKA", observacoes: "Toalhas hospitalares.", dataCadastro: "2026-01-25T16:00:00" },
];
