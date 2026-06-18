import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// CASTOR com ilike (evita problema de espaço/case)
const castorOrcs = await sb.from("orcamentos").select("id").is("gestao", null).ilike("fornecedor_nome", "CASTOR%");
if (castorOrcs.data?.length) {
  const { error } = await sb.from("orcamentos").update({ gestao: "G1" }).in("id", castorOrcs.data.map(o => o.id));
  console.log("CASTOR -> G1 :", castorOrcs.data.length, error?.message || "OK");
}

// IM IN (sem apostrofe)
const iminOrcs = await sb.from("orcamentos").select("id").is("gestao", null).eq("fornecedor_nome", "IM IN");
if (iminOrcs.data?.length) {
  await sb.from("orcamentos").update({ gestao: "G4" }).in("id", iminOrcs.data.map(o => o.id));
  console.log("IM IN -> G4 :", iminOrcs.data.length);
}

// Restantes conhecidos
const extras = [
  { forn: "ADEL TECNOLOGIA", gestao: "G4" },
  { forn: "SND", gestao: "G4" },
  { forn: "3W HOTELARIA", gestao: "G1" },
  { forn: "BRALÍMPIA/RENKO", gestao: "G1" },
  { forn: "ELETECH SOLAR", gestao: "G4" },
  { forn: "IMBERA", gestao: "G4" },
  { forn: "SOLEMAR", gestao: "G4" },
  { forn: "MOBELLO", gestao: "G1" },
  { forn: "ROCHA EPI/STICKY SHOES", gestao: "G1" },
  { forn: "LEVE-ME", gestao: "G1" },
  { forn: "FUTMESA", gestao: "G1" },
  { forn: "TASSELLO", gestao: "G4" },
];

for (const { forn, gestao } of extras) {
  const { data } = await sb.from("orcamentos").select("id").is("gestao", null).eq("fornecedor_nome", forn);
  if (!data?.length) continue;
  await sb.from("orcamentos").update({ gestao }).in("id", data.map(o => o.id));
  console.log(forn, "->", gestao, ":", data.length);
}

const { count } = await sb.from("orcamentos").select("*", { count: "exact", head: true }).is("gestao", null);
console.log("\nAinda sem gestão:", count);
