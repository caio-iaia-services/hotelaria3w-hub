import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const mapa = [
  { forn: "CASTOR", gestao: "G1" },
  { forn: "IM'IN", gestao: "G4" },
  { forn: "LG", gestao: "G4" },
  { forn: "SAMSUNG", gestao: "G4" },
  { forn: "TEKA", gestao: "G4" },
  { forn: "LEVEROS", gestao: "G4" },
  { forn: "ARTE OBJETOS", gestao: "G1" },
  { forn: "EURO COLCHÕES", gestao: "G1" },
  { forn: "AGIS", gestao: "G1" },
  { forn: "AMENIX", gestao: "G1" },
  { forn: "FRIOPEÇAS", gestao: "G4" },
  { forn: "RUBBERMAID", gestao: "G4" },
  { forn: "BOM SABOR", gestao: "G1" },
  { forn: "TESTE", gestao: "G1" },
];

let total = 0;
for (const { forn, gestao } of mapa) {
  const { data: orcs } = await sb.from("orcamentos").select("id").is("gestao", null).eq("fornecedor_nome", forn);
  if (!orcs?.length) { console.log(forn, "-> 0 encontrados"); continue; }
  const { error } = await sb.from("orcamentos").update({ gestao }).in("id", orcs.map(o => o.id));
  if (!error) { console.log(forn, "->", gestao, ":", orcs.length); total += orcs.length; }
  else console.error("Erro", forn, error.message);
}

const { count } = await sb.from("orcamentos").select("*", { count: "exact", head: true }).is("gestao", null);
console.log("\nAtualizados:", total, "| Ainda sem gestão:", count);

const { data: restantes } = await sb.from("orcamentos").select("fornecedor_nome").is("gestao", null).not("fornecedor_nome", "is", null);
const uniq = [...new Set((restantes || []).map(r => r.fornecedor_nome))];
console.log("Fornecedores restantes sem gestão:", uniq);
