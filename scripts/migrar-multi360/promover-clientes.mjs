/**
 * Promove a Cliente os contatos do Multi360 cujas conversas mencionam um CNPJ válido.
 * - CNPJ já cadastrado  → vincula a conversa ao cliente + etiqueta "Multi360" nas tags
 * - CNPJ novo           → cria o cliente (cnpj+nome+telefone) com tags ["Multi360","Revisão"]
 *
 * Uso:
 *   node --env-file=.env promover-clientes.mjs --dry   # simula, não grava
 *   node --env-file=.env promover-clientes.mjs         # executa
 */
import { createClient } from "@supabase/supabase-js";

const DRY = process.argv.includes("--dry");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function cnpjValido(c) {
  c = c.replace(/\D/g, "");
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (base) => {
    let soma = 0, pos = base.length - 7;
    for (let i = 0; i < base.length; i++) { soma += parseInt(base[i]) * pos--; if (pos < 2) pos = 9; }
    const r = soma % 11; return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c.substring(0, 12));
  const d2 = calc(c.substring(0, 12) + d1);
  return c === c.substring(0, 12) + "" + d1 + "" + d2;
}
const CNPJ_RE = /\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}\b/g;

const estat = { chats: 0, vinculados: 0, criados: 0, etiquetados: 0, jaVinculado: 0, erros: 0 };

async function main() {
  console.log(`\n🏷  Promovendo contatos Multi360 a Cliente ${DRY ? "(DRY-RUN, não grava)" : ""}\n`);

  // 1. chat_id → Set(CNPJ) das conversas migradas
  const chatCnpjs = new Map();
  let offset = 0;
  for (;;) {
    const { data } = await supabase.from("mensagens")
      .select("chat_id, conteudo").not("multi360_msg_id", "is", null).range(offset, offset + 999);
    if (!data?.length) break;
    for (const m of data) {
      for (const mt of (m.conteudo || "").matchAll(CNPJ_RE)) {
        const dig = mt[0].replace(/\D/g, "");
        if (cnpjValido(dig)) {
          if (!chatCnpjs.has(m.chat_id)) chatCnpjs.set(m.chat_id, new Set());
          chatCnpjs.get(m.chat_id).add(dig);
        }
      }
    }
    offset += 1000;
    if (data.length < 1000) break;
  }

  // 2. clientes existentes para esses CNPJs (cnpj → {id, tags})
  const todos = [...new Set([...chatCnpjs.values()].flatMap((s) => [...s]))];
  const cliPorCnpj = new Map();
  for (let i = 0; i < todos.length; i += 200) {
    const { data } = await supabase.from("clientes").select("id, cnpj, tags").in("cnpj", todos.slice(i, i + 200));
    for (const c of data ?? []) cliPorCnpj.set(c.cnpj, { id: c.id, tags: c.tags || [] });
  }

  // 3. dados dos contatos das conversas (para criar cliente novo)
  const chatIds = [...chatCnpjs.keys()];
  const chatInfo = new Map();
  for (let i = 0; i < chatIds.length; i += 200) {
    const { data } = await supabase.from("chats")
      .select("id, cliente_id, contato:contatos_whatsapp(nome, telefone)").in("id", chatIds.slice(i, i + 200));
    for (const ch of data ?? []) chatInfo.set(ch.id, ch);
  }

  // garante a etiqueta numa lista de tags
  const comTag = (tags, ...add) => {
    const set = new Set(tags || []);
    for (const t of add) set.add(t);
    return [...set];
  };

  // 4. processa cada conversa
  for (const [chatId, cnpjSet] of chatCnpjs) {
    estat.chats++;
    const info = chatInfo.get(chatId);
    if (!info) continue;
    const cnpjs = [...cnpjSet];
    // prioriza um CNPJ que já existe na base; senão o primeiro
    const cnpjAlvo = cnpjs.find((c) => cliPorCnpj.has(c)) || cnpjs[0];

    try {
      let clienteId;
      if (cliPorCnpj.has(cnpjAlvo)) {
        const cli = cliPorCnpj.get(cnpjAlvo);
        clienteId = cli.id;
        if (!(cli.tags || []).includes("Multi360")) {
          if (!DRY) await supabase.from("clientes").update({ tags: comTag(cli.tags, "Multi360") }).eq("id", cli.id);
          estat.etiquetados++;
          cli.tags = comTag(cli.tags, "Multi360");
        }
      } else {
        // cria cliente novo (cadastro mínimo, para revisão)
        const nome = info.contato?.nome || `Cliente ${cnpjAlvo}`;
        const tel = info.contato?.telefone || null;
        if (!DRY) {
          const { data, error } = await supabase.from("clientes").insert({
            cnpj: cnpjAlvo, razao_social: nome, nome_fantasia: nome,
            telefone: tel, whatsapp: tel, status: "ativo", pessoa_tipo: "PJ",
            cnpj_validado: true, tags: ["Multi360", "Revisão"],
          }).select("id").single();
          if (error) throw error;
          clienteId = data.id;
        } else { clienteId = "novo"; }
        cliPorCnpj.set(cnpjAlvo, { id: clienteId, tags: ["Multi360", "Revisão"] });
        estat.criados++;
      }

      // vincula a conversa ao cliente
      if (info.cliente_id) { estat.jaVinculado++; }
      else {
        if (!DRY && clienteId !== "novo") await supabase.from("chats").update({ cliente_id: clienteId }).eq("id", chatId);
        estat.vinculados++;
      }
    } catch (e) {
      estat.erros++;
      console.error(`\n  ✖ chat ${chatId} (cnpj ${cnpjAlvo}): ${e.message || JSON.stringify(e)}`);
    }
    process.stdout.write(`\r  Processadas: ${estat.chats}/${chatCnpjs.size}  | criados:${estat.criados} vinculados:${estat.vinculados} etiquetados:${estat.etiquetados}`);
  }

  console.log("\n\n──────── RESUMO ────────");
  console.log(`Conversas com CNPJ processadas : ${estat.chats}`);
  console.log(`Clientes novos criados         : ${estat.criados}`);
  console.log(`Clientes existentes etiquetados: ${estat.etiquetados}`);
  console.log(`Conversas vinculadas a cliente : ${estat.vinculados} (já vinculadas antes: ${estat.jaVinculado})`);
  console.log(`Erros                          : ${estat.erros}`);
  console.log("────────────────────────\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
