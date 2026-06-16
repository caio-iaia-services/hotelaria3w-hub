/**
 * Análise (somente leitura): varre as conversas migradas do Multi360 procurando
 * CNPJs mencionados, valida o dígito verificador e cruza com a base de clientes.
 * NÃO altera nada — só reporta os números para decidir a promoção a Cliente.
 *
 * Uso: node --env-file=.env analisar-cnpj.mjs
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Valida CNPJ pelos dígitos verificadores (evita falsos positivos de 14 dígitos)
function cnpjValido(c) {
  c = c.replace(/\D/g, "");
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (base) => {
    let soma = 0, pos = base.length - 7;
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base[i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c.substring(0, 12));
  const d2 = calc(c.substring(0, 12) + d1);
  return c === c.substring(0, 12) + d1 + "" + d2;
}

const CNPJ_RE = /\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}\b/g;

async function main() {
  console.log("\n🔎 Analisando CNPJs nas conversas importadas do Multi360...\n");

  // Map chat_id → Set de CNPJs válidos mencionados
  const chatCnpjs = new Map();
  let offset = 0, total = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("mensagens")
      .select("chat_id, conteudo")
      .not("multi360_msg_id", "is", null)
      .range(offset, offset + 999);
    if (error) { console.error(error); process.exit(1); }
    if (!data.length) break;
    for (const m of data) {
      const txt = m.conteudo || "";
      for (const match of txt.matchAll(CNPJ_RE)) {
        const dig = match[0].replace(/\D/g, "");
        if (cnpjValido(dig)) {
          if (!chatCnpjs.has(m.chat_id)) chatCnpjs.set(m.chat_id, new Set());
          chatCnpjs.get(m.chat_id).add(dig);
        }
      }
    }
    total += data.length;
    process.stdout.write(`\r  Mensagens varridas: ${total}`);
    offset += 1000;
    if (data.length < 1000) break;
  }
  console.log("");

  // CNPJs únicos
  const todosCnpjs = new Set();
  for (const set of chatCnpjs.values()) for (const c of set) todosCnpjs.add(c);

  // Quais já existem na base de clientes
  const existentes = new Set();
  const lista = [...todosCnpjs];
  for (let i = 0; i < lista.length; i += 200) {
    const lote = lista.slice(i, i + 200);
    const { data } = await supabase.from("clientes").select("cnpj").in("cnpj", lote);
    for (const c of data ?? []) existentes.add(c.cnpj);
  }

  // Quantas conversas já estão vinculadas a um cliente
  let chatsVinculados = 0;
  const chatIds = [...chatCnpjs.keys()];
  for (let i = 0; i < chatIds.length; i += 200) {
    const lote = chatIds.slice(i, i + 200);
    const { data } = await supabase.from("chats").select("id, cliente_id").in("id", lote);
    for (const ch of data ?? []) if (ch.cliente_id) chatsVinculados++;
  }

  const novos = lista.filter((c) => !existentes.has(c));

  console.log("\n──────── RESULTADO ────────");
  console.log(`Conversas migradas com CNPJ válido : ${chatCnpjs.size}`);
  console.log(`CNPJs únicos mencionados           : ${todosCnpjs.size}`);
  console.log(`  → já existem no cadastro Clientes : ${existentes.size}  (vincular + etiquetar)`);
  console.log(`  → novos (não cadastrados)         : ${novos.length}  (criar com etiqueta)`);
  console.log(`Conversas dessas já vinculadas      : ${chatsVinculados}`);
  console.log("───────────────────────────\n");
  if (novos.length) console.log("Exemplos de CNPJ novo:", novos.slice(0, 5).join(", "));
}

main().catch((e) => { console.error(e); process.exit(1); });
