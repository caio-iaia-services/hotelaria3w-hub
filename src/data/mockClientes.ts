export interface Cliente {
  id: number;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  cidade: string;
  estado: string;
  segmento: "Hotelaria" | "Gastronomia" | "Hospitalar";
  tipo: "VIP" | "Regular";
  email: string;
  telefone: string;
  total_comprado: number;
  total_pedidos: number;
  ultima_compra: string;
  status: "Ativo" | "Inativo";
  endereco?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
  observacoes?: string;
}

const nomes = [
  ["Hotel Fasano", "Fasano Participações Ltda"],
  ["Marriott São Paulo", "Marriott International BR Ltda"],
  ["Grand Hyatt", "Hyatt Hotels Brasil S.A."],
  ["Copacabana Palace", "Belmond Hotéis Ltda"],
  ["Hotel Emiliano", "Emiliano Hotéis S.A."],
  ["Renaissance São Paulo", "Renaissance Hotel Mgmt Ltda"],
  ["Palácio Tangará", "Tangará Hotelaria Ltda"],
  ["Tivoli Mofarrej", "Minor Hotels BR Ltda"],
  ["Rosewood São Paulo", "Rosewood Hotels Brasil S.A."],
  ["Hotel Unique", "Unique Empreendimentos Ltda"],
  ["Restaurante DOM", "D.O.M. Gastronomia Ltda"],
  ["Restaurante Maní", "Maní Gastronomia Ltda"],
  ["A Casa do Porco", "Casa do Porco Bar Ltda"],
  ["Restaurante Mocotó", "Mocotó Alimentos Ltda"],
  ["Chez Claude", "Claude Gastronomia Ltda"],
  ["Gero Ristorante", "Gero Fasano Gastronomia Ltda"],
  ["Jun Sakamoto", "Sakamoto Gastronomia Ltda"],
  ["Noma Brasil", "Noma Culinária Ltda"],
  ["Figueira Rubaiyat", "Rubaiyat Brasil Ltda"],
  ["Dalva e Dito", "Dalva e Dito Gastronomia Ltda"],
  ["Hospital Albert Einstein", "Soc. Beneficente Israelita BR"],
  ["Hospital Sírio-Libanês", "Hosp. Sírio-Libanês S.A."],
  ["Hospital São Luiz", "Rede D'Or São Luiz S.A."],
  ["Hospital Oswaldo Cruz", "Fund. Ant. Prudente Ltda"],
  ["Hospital Samaritano", "Samaritano Saúde S.A."],
  ["Hotel Maksoud Plaza", "Maksoud Hotéis Ltda"],
  ["Blue Tree Premium", "Blue Tree Hotels Brasil Ltda"],
  ["Ibis Paulista", "Accor Hotéis Brasil S.A."],
  ["Novotel Morumbi", "Accor Premium Brasil S.A."],
  ["Meliá Ibirapuera", "Meliá Hotels Brasil Ltda"],
  ["Restaurante Arturito", "Arturito Gastronomia Ltda"],
  ["Spot Restaurante", "Spot Food Ltda"],
  ["Kinoshita", "Kinoshita Culinária Ltda"],
  ["Evvai", "Evvai Gastronomia Ltda"],
  ["Hospital Nipo-Brasileiro", "Assoc. Nipo-Brasileira Ltda"],
  ["Pousada Maravilha", "Maravilha Hosp. Ltda"],
  ["Hotel Santa Teresa", "Santa Teresa Hotéis Ltda"],
  ["Hotel Fasano RJ", "Fasano RJ Participações Ltda"],
  ["Belmond Cataratas", "Belmond Iguaçu Ltda"],
  ["Restaurante Olympe", "Olympe Gastronomia Ltda"],
  ["Hospital Copa D'Or", "Copa D'Or Saúde S.A."],
  ["Txai Resort", "Txai Resorts Ltda"],
  ["Nannai Resort", "Nannai Muro Alto Ltda"],
  ["Kenshô Boutique", "Kenshô Hotelaria Ltda"],
  ["Restaurante Oro", "Oro Gastronomia Ltda"],
  ["Hospital Moinhos", "Moinhos de Vento S.A."],
  ["Fera Palace Hotel", "Fera Hotels Ltda"],
  ["Vila Galé Salvador", "Vila Galé Brasil Ltda"],
  ["Restaurante Cora", "Cora Gastronomia Ltda"],
  ["Hospital Mãe de Deus", "Mãe de Deus Saúde S.A."],
];

const cidades = [
  ["São Paulo", "SP"], ["Rio de Janeiro", "RJ"], ["Curitiba", "PR"],
  ["Belo Horizonte", "MG"], ["Salvador", "BA"], ["Porto Alegre", "RS"],
  ["Florianópolis", "SC"], ["Brasília", "DF"], ["Recife", "PE"], ["Fortaleza", "CE"],
];

const segmentos: Cliente["segmento"][] = ["Hotelaria", "Gastronomia", "Hospitalar"];

function fakeCnpj(i: number): string {
  const base = (10000000 + i * 137) % 99999999;
  const branch = "0001";
  const check = ((i * 31) % 90 + 10).toString();
  return `${String(base).padStart(8, "0")}${branch}${check}`;
}

function fmtCnpj(raw: string): string {
  return `${raw.slice(0,2)}.${raw.slice(2,5)}.${raw.slice(5,8)}/${raw.slice(8,12)}-${raw.slice(12,14)}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const mockClientes: Cliente[] = nomes.map(([nf, rs], i) => {
  const seg = i < 10 ? "Hotelaria" : i < 20 ? "Gastronomia" : i < 25 ? "Hospitalar"
    : segmentos[i % 3];
  const [cidade, estado] = cidades[i % cidades.length];
  return {
    id: i + 1,
    nome_fantasia: nf,
    razao_social: rs,
    cnpj: fakeCnpj(i),
    cidade,
    estado,
    segmento: seg,
    tipo: i % 5 === 0 || i % 7 === 0 ? "VIP" : "Regular",
    email: `contato@${nf.toLowerCase().replace(/\s+/g, "").slice(0, 12)}.com.br`,
    telefone: `(11) 9${String(8000 + i * 71).slice(0, 4)}-${String(1000 + i * 43).slice(0, 4)}`,
    total_comprado: Math.round((50000 + Math.random() * 450000) * 100) / 100,
    total_pedidos: Math.floor(5 + Math.random() * 95),
    ultima_compra: daysAgo(Math.floor(Math.random() * 60)),
    status: i % 8 === 0 ? "Inativo" : "Ativo",
    endereco: `Rua ${nf.split(" ")[1] || "Central"}, ${100 + i}`,
    bairro: "Centro",
    cep: `0${1000 + i}-000`,
    observacoes: "",
  };
});

export { fmtCnpj };
