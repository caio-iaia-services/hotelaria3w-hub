import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let total = 0;
for (;;) {
  // Sempre busca do início — o set encolhe a cada update
  const { data } = await sb.from("orcamentos").select("id").is("gestao", null).ilike("fornecedor_nome", "CASTOR%").range(0, 99);
  if (!data?.length) break;
  const { error } = await sb.from("orcamentos").update({ gestao: "G1" }).in("id", data.map(o => o.id));
  if (error) { console.error("Erro:", error.message); break; }
  total += data.length;
  process.stdout.write(`\r  CASTOR: ${total}`);
}
console.log(`\nConcluído: ${total}`);
const { count } = await sb.from("orcamentos").select("*", { count: "exact", head: true }).is("gestao", null);
console.log("Sem gestão restantes:", count);
