export interface Opportunity {
  id: string;
  clientName: string;
  value: number;
  daysInStage: number;
  product: string;
  initials: string;
  stage: string;
  contact?: string;
  email?: string;
  notes?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  opportunities: Opportunity[];
}

export interface OperationData {
  name: string;
  opportunities: number;
  pipeline: string;
  conversion: string;
  avgCycle: string;
  columns: KanbanColumn[];
}

export interface GestaoData {
  id: number;
  title: string;
  subtitle: string;
  operations: string[];
  totalOpportunities: number;
  totalPipeline: string;
  totalConversion: string;
  avgTicket: string;
  operationsData: OperationData[];
}

const gestao1Operations: OperationData[] = [
  {
    name: "CASTOR",
    opportunities: 23,
    pipeline: "R$ 285k",
    conversion: "32%",
    avgCycle: "18 dias",
    columns: [
      {
        id: "lead", title: "LEAD", color: "bg-muted",
        opportunities: [
          { id: "c1", clientName: "Hotel Paradise Resort", value: 25000, daysInStage: 5, product: "Móveis", initials: "HP", stage: "lead", contact: "João Silva", email: "joao@paradise.com", notes: "Interesse em renovação completa do lobby" },
          { id: "c2", clientName: "Grand Palazzo Hotel", value: 38000, daysInStage: 3, product: "Outdoor", initials: "GP", stage: "lead", contact: "Maria Santos", email: "maria@palazzo.com" },
          { id: "c3", clientName: "Resort Atlântica", value: 22000, daysInStage: 7, product: "Móveis", initials: "RA", stage: "lead" },
          { id: "c4", clientName: "Hotel Bella Vista", value: 15000, daysInStage: 2, product: "Utensílios", initials: "HB", stage: "lead" },
          { id: "c5", clientName: "Pátio Maldivas Hotel", value: 31000, daysInStage: 4, product: "Outdoor", initials: "PM", stage: "lead" },
          { id: "c6", clientName: "Hotel Costa Dourada", value: 19000, daysInStage: 6, product: "Móveis", initials: "HC", stage: "lead" },
          { id: "c7", clientName: "Resort Blue Lagoon", value: 42000, daysInStage: 1, product: "Outdoor", initials: "RB", stage: "lead" },
          { id: "c8", clientName: "Hotel Majestic", value: 28000, daysInStage: 8, product: "Utensílios", initials: "HM", stage: "lead" },
        ],
      },
      {
        id: "contato", title: "CONTATO", color: "bg-blue-100 dark:bg-blue-900/30",
        opportunities: [
          { id: "c9", clientName: "Tropical Palace", value: 35000, daysInStage: 4, product: "Móveis", initials: "TP", stage: "contato" },
          { id: "c10", clientName: "Hotel Imperador", value: 18000, daysInStage: 6, product: "Utensílios", initials: "HI", stage: "contato" },
          { id: "c11", clientName: "Resort Emerald Bay", value: 29000, daysInStage: 3, product: "Outdoor", initials: "RE", stage: "contato" },
          { id: "c12", clientName: "Hotel Riviera", value: 21000, daysInStage: 5, product: "Móveis", initials: "HR", stage: "contato" },
          { id: "c13", clientName: "Pousada Premium", value: 16000, daysInStage: 7, product: "Utensílios", initials: "PP", stage: "contato" },
          { id: "c14", clientName: "Hotel Solaris", value: 27000, daysInStage: 2, product: "Outdoor", initials: "HS", stage: "contato" },
        ],
      },
      {
        id: "proposta", title: "PROPOSTA", color: "bg-yellow-100 dark:bg-yellow-900/30",
        opportunities: [
          { id: "c15", clientName: "Hotel Sunset Marina", value: 45000, daysInStage: 3, product: "Móveis", initials: "SM", stage: "proposta" },
          { id: "c16", clientName: "Resort Diamond", value: 33000, daysInStage: 5, product: "Outdoor", initials: "RD", stage: "proposta" },
          { id: "c17", clientName: "Hotel Crystal", value: 20000, daysInStage: 2, product: "Utensílios", initials: "HC", stage: "proposta" },
          { id: "c18", clientName: "Grand Oasis Hotel", value: 38000, daysInStage: 4, product: "Móveis", initials: "GO", stage: "proposta" },
        ],
      },
      {
        id: "negociacao", title: "NEGOCIAÇÃO", color: "bg-orange-100 dark:bg-orange-900/30",
        opportunities: [
          { id: "c19", clientName: "Hotel Platinum Plaza", value: 42000, daysInStage: 6, product: "Outdoor", initials: "PP", stage: "negociacao" },
          { id: "c20", clientName: "Resort Golden Sand", value: 35000, daysInStage: 4, product: "Móveis", initials: "RG", stage: "negociacao" },
          { id: "c21", clientName: "Hotel Elite", value: 28000, daysInStage: 3, product: "Utensílios", initials: "HE", stage: "negociacao" },
        ],
      },
      {
        id: "fechado", title: "FECHADO", color: "bg-green-100 dark:bg-green-900/30",
        opportunities: [
          { id: "c22", clientName: "Hotel Royal Crown", value: 39000, daysInStage: 1, product: "Móveis", initials: "RC", stage: "fechado" },
          { id: "c23", clientName: "Resort Pearl Bay", value: 44000, daysInStage: 2, product: "Outdoor", initials: "RP", stage: "fechado" },
        ],
      },
    ],
  },
  {
    name: "RUBBERMAID",
    opportunities: 19,
    pipeline: "R$ 210k",
    conversion: "26%",
    avgCycle: "21 dias",
    columns: [
      {
        id: "lead", title: "LEAD", color: "bg-muted",
        opportunities: [
          { id: "r1", clientName: "Hotel Ibiza Premium", value: 18000, daysInStage: 3, product: "Utensílios", initials: "HI", stage: "lead" },
          { id: "r2", clientName: "Resort Mar Azul", value: 32000, daysInStage: 5, product: "Outdoor", initials: "RM", stage: "lead" },
          { id: "r3", clientName: "Hotel Panorama", value: 22000, daysInStage: 2, product: "Utensílios", initials: "HP", stage: "lead" },
          { id: "r4", clientName: "Pousada Tropical", value: 15000, daysInStage: 4, product: "Outdoor", initials: "PT", stage: "lead" },
          { id: "r5", clientName: "Hotel Atlântico", value: 27000, daysInStage: 6, product: "Utensílios", initials: "HA", stage: "lead" },
        ],
      },
      {
        id: "contato", title: "CONTATO", color: "bg-blue-100 dark:bg-blue-900/30",
        opportunities: [
          { id: "r6", clientName: "Resort Praia Norte", value: 29000, daysInStage: 3, product: "Outdoor", initials: "RP", stage: "contato" },
          { id: "r7", clientName: "Hotel Continental", value: 21000, daysInStage: 5, product: "Utensílios", initials: "HC", stage: "contato" },
          { id: "r8", clientName: "Hotel Esmeralda", value: 17000, daysInStage: 4, product: "Outdoor", initials: "HE", stage: "contato" },
          { id: "r9", clientName: "Grand Resort", value: 35000, daysInStage: 2, product: "Utensílios", initials: "GR", stage: "contato" },
        ],
      },
      {
        id: "proposta", title: "PROPOSTA", color: "bg-yellow-100 dark:bg-yellow-900/30",
        opportunities: [
          { id: "r10", clientName: "Hotel Porto Seguro", value: 30000, daysInStage: 3, product: "Outdoor", initials: "HP", stage: "proposta" },
          { id: "r11", clientName: "Resort Coral", value: 25000, daysInStage: 5, product: "Utensílios", initials: "RC", stage: "proposta" },
          { id: "r12", clientName: "Hotel Cascata", value: 19000, daysInStage: 2, product: "Outdoor", initials: "HC", stage: "proposta" },
        ],
      },
      {
        id: "negociacao", title: "NEGOCIAÇÃO", color: "bg-orange-100 dark:bg-orange-900/30",
        opportunities: [
          { id: "r13", clientName: "Resort Ilha Bela", value: 38000, daysInStage: 4, product: "Utensílios", initials: "RI", stage: "negociacao" },
          { id: "r14", clientName: "Hotel Marina Bay", value: 24000, daysInStage: 6, product: "Outdoor", initials: "HM", stage: "negociacao" },
          { id: "r15", clientName: "Hotel Veneza", value: 20000, daysInStage: 3, product: "Utensílios", initials: "HV", stage: "negociacao" },
        ],
      },
      {
        id: "fechado", title: "FECHADO", color: "bg-green-100 dark:bg-green-900/30",
        opportunities: [
          { id: "r16", clientName: "Grand Palace Hotel", value: 33000, daysInStage: 1, product: "Outdoor", initials: "GP", stage: "fechado" },
          { id: "r17", clientName: "Hotel Presidente", value: 28000, daysInStage: 2, product: "Utensílios", initials: "HP", stage: "fechado" },
        ],
      },
    ],
  },
  {
    name: "SOLEMAR",
    opportunities: 16,
    pipeline: "R$ 180k",
    conversion: "30%",
    avgCycle: "15 dias",
    columns: [
      {
        id: "lead", title: "LEAD", color: "bg-muted",
        opportunities: [
          { id: "s1", clientName: "Hotel Beira Mar", value: 20000, daysInStage: 4, product: "Outdoor", initials: "HB", stage: "lead" },
          { id: "s2", clientName: "Resort Oceano", value: 35000, daysInStage: 2, product: "Móveis", initials: "RO", stage: "lead" },
          { id: "s3", clientName: "Hotel Farol", value: 18000, daysInStage: 5, product: "Outdoor", initials: "HF", stage: "lead" },
          { id: "s4", clientName: "Pousada Sol Nascente", value: 15000, daysInStage: 3, product: "Móveis", initials: "PS", stage: "lead" },
        ],
      },
      {
        id: "contato", title: "CONTATO", color: "bg-blue-100 dark:bg-blue-900/30",
        opportunities: [
          { id: "s5", clientName: "Hotel Marítimo", value: 28000, daysInStage: 3, product: "Outdoor", initials: "HM", stage: "contato" },
          { id: "s6", clientName: "Resort Vento Sul", value: 22000, daysInStage: 5, product: "Móveis", initials: "RV", stage: "contato" },
          { id: "s7", clientName: "Hotel Brisa", value: 17000, daysInStage: 4, product: "Outdoor", initials: "HB", stage: "contato" },
        ],
      },
      {
        id: "proposta", title: "PROPOSTA", color: "bg-yellow-100 dark:bg-yellow-900/30",
        opportunities: [
          { id: "s8", clientName: "Hotel Porto Real", value: 40000, daysInStage: 2, product: "Móveis", initials: "HP", stage: "proposta" },
          { id: "s9", clientName: "Resort Ondas", value: 25000, daysInStage: 4, product: "Outdoor", initials: "RO", stage: "proposta" },
          { id: "s10", clientName: "Hotel Ancora", value: 19000, daysInStage: 3, product: "Móveis", initials: "HA", stage: "proposta" },
        ],
      },
      {
        id: "negociacao", title: "NEGOCIAÇÃO", color: "bg-orange-100 dark:bg-orange-900/30",
        opportunities: [
          { id: "s11", clientName: "Resort Coral Beach", value: 33000, daysInStage: 5, product: "Outdoor", initials: "RC", stage: "negociacao" },
          { id: "s12", clientName: "Hotel Navegantes", value: 26000, daysInStage: 3, product: "Móveis", initials: "HN", stage: "negociacao" },
        ],
      },
      {
        id: "fechado", title: "FECHADO", color: "bg-green-100 dark:bg-green-900/30",
        opportunities: [
          { id: "s13", clientName: "Hotel Areia Branca", value: 37000, daysInStage: 1, product: "Outdoor", initials: "HA", stage: "fechado" },
          { id: "s14", clientName: "Resort Maré Alta", value: 30000, daysInStage: 2, product: "Móveis", initials: "RM", stage: "fechado" },
        ],
      },
    ],
  },
  {
    name: "UNIBLU",
    opportunities: 14,
    pipeline: "R$ 155k",
    conversion: "28%",
    avgCycle: "20 dias",
    columns: [
      {
        id: "lead", title: "LEAD", color: "bg-muted",
        opportunities: [
          { id: "u1", clientName: "Hotel Safira", value: 23000, daysInStage: 3, product: "Utensílios", initials: "HS", stage: "lead" },
          { id: "u2", clientName: "Resort Azul Royal", value: 30000, daysInStage: 5, product: "Móveis", initials: "RA", stage: "lead" },
          { id: "u3", clientName: "Hotel Cristalino", value: 17000, daysInStage: 2, product: "Utensílios", initials: "HC", stage: "lead" },
        ],
      },
      {
        id: "contato", title: "CONTATO", color: "bg-blue-100 dark:bg-blue-900/30",
        opportunities: [
          { id: "u4", clientName: "Hotel Premium Inn", value: 26000, daysInStage: 4, product: "Móveis", initials: "HP", stage: "contato" },
          { id: "u5", clientName: "Resort Diamante", value: 34000, daysInStage: 3, product: "Utensílios", initials: "RD", stage: "contato" },
          { id: "u6", clientName: "Hotel Plaza Central", value: 19000, daysInStage: 6, product: "Móveis", initials: "HP", stage: "contato" },
        ],
      },
      {
        id: "proposta", title: "PROPOSTA", color: "bg-yellow-100 dark:bg-yellow-900/30",
        opportunities: [
          { id: "u7", clientName: "Hotel Bourbon Select", value: 41000, daysInStage: 3, product: "Utensílios", initials: "HB", stage: "proposta" },
          { id: "u8", clientName: "Resort Garden", value: 22000, daysInStage: 5, product: "Móveis", initials: "RG", stage: "proposta" },
        ],
      },
      {
        id: "negociacao", title: "NEGOCIAÇÃO", color: "bg-orange-100 dark:bg-orange-900/30",
        opportunities: [
          { id: "u9", clientName: "Hotel Splendor", value: 36000, daysInStage: 4, product: "Utensílios", initials: "HS", stage: "negociacao" },
          { id: "u10", clientName: "Resort Imperial", value: 28000, daysInStage: 2, product: "Móveis", initials: "RI", stage: "negociacao" },
        ],
      },
      {
        id: "fechado", title: "FECHADO", color: "bg-green-100 dark:bg-green-900/30",
        opportunities: [
          { id: "u11", clientName: "Hotel Magna", value: 45000, daysInStage: 1, product: "Utensílios", initials: "HM", stage: "fechado" },
          { id: "u12", clientName: "Grand Hotel Luxe", value: 32000, daysInStage: 2, product: "Móveis", initials: "GL", stage: "fechado" },
        ],
      },
    ],
  },
];

const gestao2Operations: OperationData[] = [
  {
    name: "MIDEA",
    opportunities: 20,
    pipeline: "R$ 230k",
    conversion: "30%",
    avgCycle: "16 dias",
    columns: [
      {
        id: "lead", title: "LEAD", color: "bg-muted",
        opportunities: [
          { id: "m1", clientName: "Hotel Vitória Palace", value: 22000, daysInStage: 4, product: "Amenidades", initials: "HV", stage: "lead" },
          { id: "m2", clientName: "Clínica Santa Clara", value: 18000, daysInStage: 3, product: "Enxovais", initials: "CS", stage: "lead" },
          { id: "m3", clientName: "Hotel Recanto Verde", value: 25000, daysInStage: 5, product: "Amenidades", initials: "HR", stage: "lead" },
          { id: "m4", clientName: "Hospital São Lucas", value: 30000, daysInStage: 2, product: "Enxovais", initials: "HS", stage: "lead" },
          { id: "m5", clientName: "Hotel Monte Carlo", value: 15000, daysInStage: 6, product: "Amenidades", initials: "HM", stage: "lead" },
          { id: "m6", clientName: "Clínica Vida Nova", value: 12000, daysInStage: 3, product: "Enxovais", initials: "CV", stage: "lead" },
        ],
      },
      {
        id: "contato", title: "CONTATO", color: "bg-blue-100 dark:bg-blue-900/30",
        opportunities: [
          { id: "m7", clientName: "Hotel Serra Azul", value: 28000, daysInStage: 4, product: "Amenidades", initials: "HS", stage: "contato" },
          { id: "m8", clientName: "Hospital Esperança", value: 35000, daysInStage: 2, product: "Enxovais", initials: "HE", stage: "contato" },
          { id: "m9", clientName: "Hotel Campos Elíseos", value: 20000, daysInStage: 5, product: "Amenidades", initials: "HC", stage: "contato" },
          { id: "m10", clientName: "Clínica Saúde Plus", value: 16000, daysInStage: 3, product: "Enxovais", initials: "CS", stage: "contato" },
        ],
      },
      {
        id: "proposta", title: "PROPOSTA", color: "bg-yellow-100 dark:bg-yellow-900/30",
        opportunities: [
          { id: "m11", clientName: "Hotel Vale Encantado", value: 33000, daysInStage: 3, product: "Amenidades", initials: "HV", stage: "proposta" },
          { id: "m12", clientName: "Hospital Central", value: 27000, daysInStage: 4, product: "Enxovais", initials: "HC", stage: "proposta" },
          { id: "m13", clientName: "Hotel Florença", value: 19000, daysInStage: 2, product: "Amenidades", initials: "HF", stage: "proposta" },
        ],
      },
      {
        id: "negociacao", title: "NEGOCIAÇÃO", color: "bg-orange-100 dark:bg-orange-900/30",
        opportunities: [
          { id: "m14", clientName: "Hotel Harmonia", value: 31000, daysInStage: 5, product: "Enxovais", initials: "HH", stage: "negociacao" },
          { id: "m15", clientName: "Clínica Premium Care", value: 24000, daysInStage: 3, product: "Amenidades", initials: "CP", stage: "negociacao" },
          { id: "m16", clientName: "Hotel Primavera", value: 18000, daysInStage: 4, product: "Enxovais", initials: "HP", stage: "negociacao" },
        ],
      },
      {
        id: "fechado", title: "FECHADO", color: "bg-green-100 dark:bg-green-900/30",
        opportunities: [
          { id: "m17", clientName: "Hospital Albert", value: 34000, daysInStage: 1, product: "Enxovais", initials: "HA", stage: "fechado" },
          { id: "m18", clientName: "Hotel Ouro Preto", value: 26000, daysInStage: 2, product: "Amenidades", initials: "HO", stage: "fechado" },
        ],
      },
    ],
  },
  {
    name: "D-LOCK",
    opportunities: 17,
    pipeline: "R$ 195k",
    conversion: "29%",
    avgCycle: "19 dias",
    columns: [
      {
        id: "lead", title: "LEAD", color: "bg-muted",
        opportunities: [
          { id: "d1", clientName: "Hotel Seguro Plus", value: 20000, daysInStage: 3, product: "Fechaduras", initials: "HS", stage: "lead" },
          { id: "d2", clientName: "Resort Blindado", value: 28000, daysInStage: 5, product: "Fechaduras", initials: "RB", stage: "lead" },
          { id: "d3", clientName: "Hotel Smart Lock", value: 15000, daysInStage: 2, product: "Fechaduras", initials: "HS", stage: "lead" },
          { id: "d4", clientName: "Hospital Proteção", value: 22000, daysInStage: 4, product: "Fechaduras", initials: "HP", stage: "lead" },
          { id: "d5", clientName: "Hotel Acesso Total", value: 18000, daysInStage: 6, product: "Fechaduras", initials: "HA", stage: "lead" },
        ],
      },
      {
        id: "contato", title: "CONTATO", color: "bg-blue-100 dark:bg-blue-900/30",
        opportunities: [
          { id: "d6", clientName: "Hotel Porta Digital", value: 30000, daysInStage: 3, product: "Fechaduras", initials: "HP", stage: "contato" },
          { id: "d7", clientName: "Resort Key Master", value: 25000, daysInStage: 4, product: "Fechaduras", initials: "RK", stage: "contato" },
          { id: "d8", clientName: "Hotel Entrada VIP", value: 17000, daysInStage: 5, product: "Fechaduras", initials: "HE", stage: "contato" },
        ],
      },
      {
        id: "proposta", title: "PROPOSTA", color: "bg-yellow-100 dark:bg-yellow-900/30",
        opportunities: [
          { id: "d9", clientName: "Hotel Fort Knox", value: 35000, daysInStage: 3, product: "Fechaduras", initials: "HF", stage: "proposta" },
          { id: "d10", clientName: "Resort Guardião", value: 21000, daysInStage: 4, product: "Fechaduras", initials: "RG", stage: "proposta" },
          { id: "d11", clientName: "Hospital Segurança", value: 19000, daysInStage: 2, product: "Fechaduras", initials: "HS", stage: "proposta" },
        ],
      },
      {
        id: "negociacao", title: "NEGOCIAÇÃO", color: "bg-orange-100 dark:bg-orange-900/30",
        opportunities: [
          { id: "d12", clientName: "Hotel Shield", value: 32000, daysInStage: 5, product: "Fechaduras", initials: "HS", stage: "negociacao" },
          { id: "d13", clientName: "Resort Sentinel", value: 24000, daysInStage: 3, product: "Fechaduras", initials: "RS", stage: "negociacao" },
        ],
      },
      {
        id: "fechado", title: "FECHADO", color: "bg-green-100 dark:bg-green-900/30",
        opportunities: [
          { id: "d14", clientName: "Hotel Fortress", value: 33000, daysInStage: 1, product: "Fechaduras", initials: "HF", stage: "fechado" },
          { id: "d15", clientName: "Resort Vigilante", value: 27000, daysInStage: 2, product: "Fechaduras", initials: "RV", stage: "fechado" },
        ],
      },
    ],
  },
  {
    name: "CIÇA ENXOVAIS",
    opportunities: 15,
    pipeline: "R$ 170k",
    conversion: "33%",
    avgCycle: "14 dias",
    columns: [
      {
        id: "lead", title: "LEAD", color: "bg-muted",
        opportunities: [
          { id: "ci1", clientName: "Hotel Conforto Total", value: 18000, daysInStage: 3, product: "Enxovais", initials: "HC", stage: "lead" },
          { id: "ci2", clientName: "Resort Algodão", value: 25000, daysInStage: 4, product: "Enxovais", initials: "RA", stage: "lead" },
          { id: "ci3", clientName: "Hospital Bem Estar", value: 14000, daysInStage: 2, product: "Enxovais", initials: "HB", stage: "lead" },
          { id: "ci4", clientName: "Hotel Lençóis Finos", value: 20000, daysInStage: 5, product: "Enxovais", initials: "HL", stage: "lead" },
        ],
      },
      {
        id: "contato", title: "CONTATO", color: "bg-blue-100 dark:bg-blue-900/30",
        opportunities: [
          { id: "ci5", clientName: "Hotel Macio Palace", value: 22000, daysInStage: 3, product: "Enxovais", initials: "HM", stage: "contato" },
          { id: "ci6", clientName: "Resort Seda", value: 30000, daysInStage: 4, product: "Enxovais", initials: "RS", stage: "contato" },
          { id: "ci7", clientName: "Clínica Sono Bom", value: 12000, daysInStage: 5, product: "Enxovais", initials: "CS", stage: "contato" },
        ],
      },
      {
        id: "proposta", title: "PROPOSTA", color: "bg-yellow-100 dark:bg-yellow-900/30",
        opportunities: [
          { id: "ci8", clientName: "Hotel Fios de Ouro", value: 28000, daysInStage: 2, product: "Enxovais", initials: "HF", stage: "proposta" },
          { id: "ci9", clientName: "Resort Pluma", value: 19000, daysInStage: 4, product: "Enxovais", initials: "RP", stage: "proposta" },
        ],
      },
      {
        id: "negociacao", title: "NEGOCIAÇÃO", color: "bg-orange-100 dark:bg-orange-900/30",
        opportunities: [
          { id: "ci10", clientName: "Hotel Veludo", value: 26000, daysInStage: 3, product: "Enxovais", initials: "HV", stage: "negociacao" },
          { id: "ci11", clientName: "Hospital Ninho", value: 21000, daysInStage: 5, product: "Enxovais", initials: "HN", stage: "negociacao" },
        ],
      },
      {
        id: "fechado", title: "FECHADO", color: "bg-green-100 dark:bg-green-900/30",
        opportunities: [
          { id: "ci12", clientName: "Hotel Cashmere", value: 35000, daysInStage: 1, product: "Enxovais", initials: "HC", stage: "fechado" },
          { id: "ci13", clientName: "Resort Nuvem", value: 24000, daysInStage: 2, product: "Enxovais", initials: "RN", stage: "fechado" },
        ],
      },
    ],
  },
  {
    name: "IM IN",
    opportunities: 13,
    pipeline: "R$ 145k",
    conversion: "25%",
    avgCycle: "22 dias",
    columns: [
      {
        id: "lead", title: "LEAD", color: "bg-muted",
        opportunities: [
          { id: "i1", clientName: "Hotel Welcome Inn", value: 16000, daysInStage: 4, product: "Amenidades", initials: "HW", stage: "lead" },
          { id: "i2", clientName: "Resort Check-In", value: 22000, daysInStage: 3, product: "Amenidades", initials: "RC", stage: "lead" },
          { id: "i3", clientName: "Hotel Lobby Plus", value: 13000, daysInStage: 5, product: "Amenidades", initials: "HL", stage: "lead" },
          { id: "i4", clientName: "Hospital Acolher", value: 18000, daysInStage: 2, product: "Amenidades", initials: "HA", stage: "lead" },
        ],
      },
      {
        id: "contato", title: "CONTATO", color: "bg-blue-100 dark:bg-blue-900/30",
        opportunities: [
          { id: "i5", clientName: "Hotel Guest House", value: 25000, daysInStage: 3, product: "Amenidades", initials: "HG", stage: "contato" },
          { id: "i6", clientName: "Resort Host", value: 19000, daysInStage: 5, product: "Amenidades", initials: "RH", stage: "contato" },
        ],
      },
      {
        id: "proposta", title: "PROPOSTA", color: "bg-yellow-100 dark:bg-yellow-900/30",
        opportunities: [
          { id: "i7", clientName: "Hotel Recepção VIP", value: 30000, daysInStage: 3, product: "Amenidades", initials: "HR", stage: "proposta" },
          { id: "i8", clientName: "Resort Hospitalidade", value: 17000, daysInStage: 4, product: "Amenidades", initials: "RH", stage: "proposta" },
        ],
      },
      {
        id: "negociacao", title: "NEGOCIAÇÃO", color: "bg-orange-100 dark:bg-orange-900/30",
        opportunities: [
          { id: "i9", clientName: "Hotel Embrace", value: 28000, daysInStage: 4, product: "Amenidades", initials: "HE", stage: "negociacao" },
        ],
      },
      {
        id: "fechado", title: "FECHADO", color: "bg-green-100 dark:bg-green-900/30",
        opportunities: [
          { id: "i10", clientName: "Hotel Caloroso", value: 32000, daysInStage: 1, product: "Amenidades", initials: "HC", stage: "fechado" },
          { id: "i11", clientName: "Resort Abraço", value: 20000, daysInStage: 2, product: "Amenidades", initials: "RA", stage: "fechado" },
        ],
      },
    ],
  },
];

const gestao3Operations: OperationData[] = [
  {
    name: "TEKA",
    opportunities: 18,
    pipeline: "R$ 175k",
    conversion: "35%",
    avgCycle: "13 dias",
    columns: [
      {
        id: "lead", title: "LEAD", color: "bg-muted",
        opportunities: [
          { id: "t1", clientName: "Pousada Recanto", value: 12000, daysInStage: 3, product: "Cozinha", initials: "PR", stage: "lead" },
          { id: "t2", clientName: "Restaurante Sabor", value: 18000, daysInStage: 4, product: "Cozinha", initials: "RS", stage: "lead" },
          { id: "t3", clientName: "Pousada Verde Vale", value: 10000, daysInStage: 2, product: "Cozinha", initials: "PV", stage: "lead" },
          { id: "t4", clientName: "Bistrô Elegance", value: 15000, daysInStage: 5, product: "Cozinha", initials: "BE", stage: "lead" },
          { id: "t5", clientName: "Pousada Montanha", value: 9000, daysInStage: 3, product: "Cozinha", initials: "PM", stage: "lead" },
        ],
      },
      {
        id: "contato", title: "CONTATO", color: "bg-blue-100 dark:bg-blue-900/30",
        opportunities: [
          { id: "t6", clientName: "Restaurante Gourmet", value: 22000, daysInStage: 3, product: "Cozinha", initials: "RG", stage: "contato" },
          { id: "t7", clientName: "Pousada Charme", value: 14000, daysInStage: 4, product: "Cozinha", initials: "PC", stage: "contato" },
          { id: "t8", clientName: "Bistrô Central", value: 11000, daysInStage: 5, product: "Cozinha", initials: "BC", stage: "contato" },
          { id: "t9", clientName: "Restaurante Fusion", value: 19000, daysInStage: 2, product: "Cozinha", initials: "RF", stage: "contato" },
        ],
      },
      {
        id: "proposta", title: "PROPOSTA", color: "bg-yellow-100 dark:bg-yellow-900/30",
        opportunities: [
          { id: "t10", clientName: "Pousada Aconchego", value: 16000, daysInStage: 3, product: "Cozinha", initials: "PA", stage: "proposta" },
          { id: "t11", clientName: "Restaurante Delícia", value: 25000, daysInStage: 4, product: "Cozinha", initials: "RD", stage: "proposta" },
          { id: "t12", clientName: "Bistrô Fino", value: 13000, daysInStage: 2, product: "Cozinha", initials: "BF", stage: "proposta" },
        ],
      },
      {
        id: "negociacao", title: "NEGOCIAÇÃO", color: "bg-orange-100 dark:bg-orange-900/30",
        opportunities: [
          { id: "t13", clientName: "Restaurante Imperial", value: 28000, daysInStage: 4, product: "Cozinha", initials: "RI", stage: "negociacao" },
          { id: "t14", clientName: "Pousada Estrela", value: 17000, daysInStage: 3, product: "Cozinha", initials: "PE", stage: "negociacao" },
        ],
      },
      {
        id: "fechado", title: "FECHADO", color: "bg-green-100 dark:bg-green-900/30",
        opportunities: [
          { id: "t15", clientName: "Restaurante Nobel", value: 24000, daysInStage: 1, product: "Cozinha", initials: "RN", stage: "fechado" },
          { id: "t16", clientName: "Pousada Diamante", value: 20000, daysInStage: 2, product: "Cozinha", initials: "PD", stage: "fechado" },
        ],
      },
    ],
  },
  {
    name: "KENBY",
    opportunities: 14,
    pipeline: "R$ 140k",
    conversion: "27%",
    avgCycle: "17 dias",
    columns: [
      {
        id: "lead", title: "LEAD", color: "bg-muted",
        opportunities: [
          { id: "k1", clientName: "Pousada Serena", value: 10000, daysInStage: 3, product: "Decoração", initials: "PS", stage: "lead" },
          { id: "k2", clientName: "Restaurante Arte", value: 16000, daysInStage: 4, product: "Decoração", initials: "RA", stage: "lead" },
          { id: "k3", clientName: "Pousada Flores", value: 8000, daysInStage: 2, product: "Decoração", initials: "PF", stage: "lead" },
          { id: "k4", clientName: "Bistrô Vintage", value: 13000, daysInStage: 5, product: "Decoração", initials: "BV", stage: "lead" },
        ],
      },
      {
        id: "contato", title: "CONTATO", color: "bg-blue-100 dark:bg-blue-900/30",
        opportunities: [
          { id: "k5", clientName: "Pousada Rústica", value: 18000, daysInStage: 3, product: "Decoração", initials: "PR", stage: "contato" },
          { id: "k6", clientName: "Restaurante Design", value: 12000, daysInStage: 4, product: "Decoração", initials: "RD", stage: "contato" },
          { id: "k7", clientName: "Pousada Jardim", value: 9000, daysInStage: 5, product: "Decoração", initials: "PJ", stage: "contato" },
        ],
      },
      {
        id: "proposta", title: "PROPOSTA", color: "bg-yellow-100 dark:bg-yellow-900/30",
        opportunities: [
          { id: "k8", clientName: "Restaurante Estilo", value: 22000, daysInStage: 3, product: "Decoração", initials: "RE", stage: "proposta" },
          { id: "k9", clientName: "Pousada Elegante", value: 15000, daysInStage: 4, product: "Decoração", initials: "PE", stage: "proposta" },
        ],
      },
      {
        id: "negociacao", title: "NEGOCIAÇÃO", color: "bg-orange-100 dark:bg-orange-900/30",
        opportunities: [
          { id: "k10", clientName: "Restaurante Clássico", value: 20000, daysInStage: 4, product: "Decoração", initials: "RC", stage: "negociacao" },
          { id: "k11", clientName: "Pousada Luxo", value: 14000, daysInStage: 3, product: "Decoração", initials: "PL", stage: "negociacao" },
        ],
      },
      {
        id: "fechado", title: "FECHADO", color: "bg-green-100 dark:bg-green-900/30",
        opportunities: [
          { id: "k12", clientName: "Restaurante Prime", value: 25000, daysInStage: 1, product: "Decoração", initials: "RP", stage: "fechado" },
          { id: "k13", clientName: "Pousada Encanto", value: 18000, daysInStage: 2, product: "Decoração", initials: "PE", stage: "fechado" },
        ],
      },
    ],
  },
  {
    name: "REDES DE DORMIR",
    opportunities: 11,
    pipeline: "R$ 95k",
    conversion: "31%",
    avgCycle: "12 dias",
    columns: [
      {
        id: "lead", title: "LEAD", color: "bg-muted",
        opportunities: [
          { id: "rd1", clientName: "Pousada Balanço", value: 9000, daysInStage: 3, product: "Redes", initials: "PB", stage: "lead" },
          { id: "rd2", clientName: "Resort Descanso", value: 15000, daysInStage: 4, product: "Redes", initials: "RD", stage: "lead" },
          { id: "rd3", clientName: "Pousada Preguiça", value: 8000, daysInStage: 2, product: "Redes", initials: "PP", stage: "lead" },
        ],
      },
      {
        id: "contato", title: "CONTATO", color: "bg-blue-100 dark:bg-blue-900/30",
        opportunities: [
          { id: "rd4", clientName: "Pousada Rede Boa", value: 12000, daysInStage: 3, product: "Redes", initials: "PR", stage: "contato" },
          { id: "rd5", clientName: "Resort Sossego", value: 18000, daysInStage: 4, product: "Redes", initials: "RS", stage: "contato" },
        ],
      },
      {
        id: "proposta", title: "PROPOSTA", color: "bg-yellow-100 dark:bg-yellow-900/30",
        opportunities: [
          { id: "rd6", clientName: "Pousada Cochilo", value: 14000, daysInStage: 3, product: "Redes", initials: "PC", stage: "proposta" },
          { id: "rd7", clientName: "Resort Varandas", value: 10000, daysInStage: 4, product: "Redes", initials: "RV", stage: "proposta" },
        ],
      },
      {
        id: "negociacao", title: "NEGOCIAÇÃO", color: "bg-orange-100 dark:bg-orange-900/30",
        opportunities: [
          { id: "rd8", clientName: "Pousada Soneca", value: 16000, daysInStage: 4, product: "Redes", initials: "PS", stage: "negociacao" },
        ],
      },
      {
        id: "fechado", title: "FECHADO", color: "bg-green-100 dark:bg-green-900/30",
        opportunities: [
          { id: "rd9", clientName: "Resort Tranquilo", value: 20000, daysInStage: 1, product: "Redes", initials: "RT", stage: "fechado" },
          { id: "rd10", clientName: "Pousada Paz", value: 13000, daysInStage: 2, product: "Redes", initials: "PP", stage: "fechado" },
        ],
      },
    ],
  },
  {
    name: "SKARA",
    opportunities: 12,
    pipeline: "R$ 110k",
    conversion: "28%",
    avgCycle: "16 dias",
    columns: [
      {
        id: "lead", title: "LEAD", color: "bg-muted",
        opportunities: [
          { id: "sk1", clientName: "Pousada Rústica", value: 11000, daysInStage: 3, product: "Cozinha", initials: "PR", stage: "lead" },
          { id: "sk2", clientName: "Restaurante Fogo", value: 19000, daysInStage: 4, product: "Cozinha", initials: "RF", stage: "lead" },
          { id: "sk3", clientName: "Pousada Brasa", value: 10000, daysInStage: 2, product: "Cozinha", initials: "PB", stage: "lead" },
        ],
      },
      {
        id: "contato", title: "CONTATO", color: "bg-blue-100 dark:bg-blue-900/30",
        opportunities: [
          { id: "sk4", clientName: "Restaurante Churrasco", value: 22000, daysInStage: 3, product: "Cozinha", initials: "RC", stage: "contato" },
          { id: "sk5", clientName: "Pousada Gastrô", value: 14000, daysInStage: 4, product: "Cozinha", initials: "PG", stage: "contato" },
          { id: "sk6", clientName: "Bistrô Parrilla", value: 12000, daysInStage: 5, product: "Cozinha", initials: "BP", stage: "contato" },
        ],
      },
      {
        id: "proposta", title: "PROPOSTA", color: "bg-yellow-100 dark:bg-yellow-900/30",
        opportunities: [
          { id: "sk7", clientName: "Restaurante Lenha", value: 25000, daysInStage: 3, product: "Cozinha", initials: "RL", stage: "proposta" },
          { id: "sk8", clientName: "Pousada Fogão", value: 13000, daysInStage: 4, product: "Cozinha", initials: "PF", stage: "proposta" },
        ],
      },
      {
        id: "negociacao", title: "NEGOCIAÇÃO", color: "bg-orange-100 dark:bg-orange-900/30",
        opportunities: [
          { id: "sk9", clientName: "Restaurante Sabores", value: 21000, daysInStage: 4, product: "Cozinha", initials: "RS", stage: "negociacao" },
        ],
      },
      {
        id: "fechado", title: "FECHADO", color: "bg-green-100 dark:bg-green-900/30",
        opportunities: [
          { id: "sk10", clientName: "Pousada Chef", value: 17000, daysInStage: 1, product: "Cozinha", initials: "PC", stage: "fechado" },
          { id: "sk11", clientName: "Restaurante Noble", value: 23000, daysInStage: 2, product: "Cozinha", initials: "RN", stage: "fechado" },
        ],
      },
    ],
  },
];

export const gestaoDataMap: Record<string, GestaoData> = {
  "gestao-1": {
    id: 1,
    title: "CRM - Gestão 1",
    subtitle: "Operações: CASTOR, RUBBERMAID, SOLEMAR, UNIBLU",
    operations: ["CASTOR", "RUBBERMAID", "SOLEMAR", "UNIBLU"],
    totalOpportunities: 145,
    totalPipeline: "R$ 1.2M",
    totalConversion: "28%",
    avgTicket: "R$ 8.5k",
    operationsData: gestao1Operations,
  },
  "gestao-2": {
    id: 2,
    title: "CRM - Gestão 2",
    subtitle: "Operações: MIDEA, D-LOCK, CIÇA ENXOVAIS, IM IN",
    operations: ["MIDEA", "D-LOCK", "CIÇA ENXOVAIS", "IM IN"],
    totalOpportunities: 130,
    totalPipeline: "R$ 740k",
    totalConversion: "29%",
    avgTicket: "R$ 5.7k",
    operationsData: gestao2Operations,
  },
  "gestao-3": {
    id: 3,
    title: "CRM - Gestão 3",
    subtitle: "Operações: TEKA, KENBY, REDES DE DORMIR, SKARA",
    operations: ["TEKA", "KENBY", "REDES DE DORMIR", "SKARA"],
    totalOpportunities: 110,
    totalPipeline: "R$ 520k",
    totalConversion: "30%",
    avgTicket: "R$ 4.7k",
    operationsData: gestao3Operations,
  },
};
