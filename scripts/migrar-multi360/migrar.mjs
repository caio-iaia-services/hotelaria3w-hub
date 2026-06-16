/**
 * Migração Multi360 → Hub 3W (conversas de WhatsApp).
 *
 * Extrai os atendimentos ativos do Multi360 (contatos + histórico de mensagens
 * + mídias) e grava no Supabase do hub 3W. Idempotente: pode rodar/re-rodar
 * sem duplicar (upsert por multi360_id / multi360_msg_id).
 *
 * Pré-requisitos:
 *   1. Rodar a migration supabase/migrations/20260611120000_migracao_multi360.sql
 *   2. Criar um .env nesta pasta (ver .env.example) com:
 *        MULTI360_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   3. Node 20+ (usa fetch nativo e --env-file)
 *
 * Uso:
 *   cd scripts/migrar-multi360
 *   node --env-file=.env migrar.mjs            # migra tudo
 *   node --env-file=.env migrar.mjs --limit 5  # teste: só 5 atendimentos
 *   node --env-file=.env migrar.mjs --dry       # não grava no Supabase (só extrai)
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────────
const MULTI360_BASE = "https://painel.multi360.com.br";
const TOKEN = process.env.MULTI360_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "chat-midia";

const args = process.argv.slice(2);
const LIMIT = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
const DRY = args.includes("--dry");
const SEM_MIDIA = args.includes("--sem-midia"); // migra só texto (mídia vira "[tipo] nome")
// --midia-desde YYYY-MM-DD : só baixa mídia de mensagens a partir dessa data;
// anteriores viram rótulo [tipo]. Texto de TODAS as conversas é sempre migrado.
const MIDIA_DESDE = args.includes("--midia-desde")
  ? new Date(args[args.indexOf("--midia-desde") + 1] + "T00:00:00").getTime()
  : null;
const CONCORRENCIA = args.includes("--concorrencia")
  ? Number(args[args.indexOf("--concorrencia") + 1])
  : 8;       // atendimentos processados em paralelo (maior = mais rápido)
const MIDIA_TIMEOUT_MS = 20000; // aborta download de mídia preso após 20s

if (!TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
  console.error("✖ Faltam variáveis no .env: MULTI360_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ── Mapeamento Multi360 → canal do hub 3W ──────────────────────────────────────
// Atendentes conhecidos (id do Multi360) → canal
const ATENDENTE_CANAL = {
  240745: "G1",  // Fabiano Gomes  → Comercial 1
  240734: "G4",  // Alex Monteiro  → Comercial 4
  263006: "ADM", // Celso          → Admin
};
function resolverCanal(at) {
  if (ATENDENTE_CANAL[at.atendenteId]) return ATENDENTE_CANAL[at.atendenteId];
  const dep = (at.departamentoNome || "").toLowerCase();
  if (dep.includes("fornecedor")) return "FORNECEDORES";
  if (dep.includes("comercial 1")) return "G1";
  if (dep.includes("comercial 4")) return "G4";
  if (dep.includes("admin")) return "ADM";
  return "G1"; // fallback comercial (logado no resumo para validação)
}

// ── Tipos de mensagem Multi360 → hub ───────────────────────────────────────────
const TIPO_MSG = {
  TEXTO: "texto", IMAGEM: "imagem", VIDEO: "video",
  AUDIO: "audio", ARQUIVO: "documento", DOCUMENTO: "documento",
  STICKER: "sticker", LOCALIZACAO: "texto", CONTATO: "texto",
};

// ── Helpers HTTP Multi360 (com retry) ──────────────────────────────────────────
async function m360(path, tentativas = 4) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(MULTI360_BASE + path, { headers: { Authorization: TOKEN } });
      if (r.status === 401) throw new Error("401 — token do Multi360 expirou. Atualize MULTI360_TOKEN no .env.");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (String(e).includes("401")) { console.error("\n✖ " + e.message); process.exit(1); }
      if (i === tentativas - 1) throw e;
      await sleep(800 * (i + 1));
    }
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const soDigitos = (s) => String(s || "").replace(/\D/g, "");
const sanitizar = (s) => String(s || "arquivo").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").toLowerCase().slice(0, 80);

// ── 1. Coleta todos os atendimentos ativos (metadados) ─────────────────────────
async function coletarAtendimentos() {
  const todos = [];
  for (let offset = 0; ; offset += 20) {
    const j = await m360(`/api/atendimentos/chat/ativos?offset=${offset}&apenasNovasMensagens=false&orderByAsc=false`);
    const regs = j.registros || [];
    todos.push(...regs);
    process.stdout.write(`\r  Listando atendimentos: ${todos.length}`);
    if (regs.length < 20) break;
    if (todos.length >= LIMIT) break;
  }
  console.log("");
  return todos.slice(0, LIMIT);
}

// ── 2. Coleta todas as mensagens de um atendimento ─────────────────────────────
async function coletarMensagens(atendimentoId) {
  const todas = [];
  const vistos = new Set(); // dedup — a paginação do Multi360 repete mensagens entre páginas
  let offset = 0;
  // Limite de segurança: a API às vezes ignora o offset e repete a 1ª página
  // (loop infinito → OOM). Paramos quando uma página não traz nenhum ID novo.
  for (let pagina = 0; pagina < 500; pagina++) {
    const arr = await m360(
      `/api/atendimentos/${atendimentoId}/mensagens/v2?filtro=0&filtroDataCriacao=0&filtroOriginalId=0&offset=${offset}&limit=200&paginationDownUpEnum=UP`
    );
    const lote = Array.isArray(arr) ? arr : (arr.registros || []);
    let novos = 0;
    for (const m of lote) {
      if (!vistos.has(m.id)) { vistos.add(m.id); todas.push(m); novos++; }
    }
    if (lote.length < 200 || novos === 0) break; // fim da conversa OU página só repetida
    offset += 200;
  }
  return todas;
}

// ── 3. Baixa a mídia do Multi360 e sobe no Storage do hub ──────────────────────
async function migrarMidia(msg, atendimentoId) {
  if (!msg.fileUrl) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), MIDIA_TIMEOUT_MS);
    const resp = await fetch(msg.fileUrl, { signal: ctrl.signal }).finally(() => clearTimeout(t));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());
    const ct = resp.headers.get("content-type") || "application/octet-stream";
    const nome = sanitizar(msg.nomePDF || msg.fileUrl.split("/").pop());
    const path = `migracao-multi360/${atendimentoId}/${msg.id}-${nome}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: ct, upsert: true,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    // Fallback: mantém a URL original (pode expirar quando o cliente cancelar)
    estat.midiaFalha++;
    return msg.fileUrl;
  }
}

// ── 4. Upsert de contato (dedupe por últimos 8 dígitos do telefone) ────────────
const cacheContato = new Map(); // sufixo8 → contato_id
async function obterContatoId(at) {
  const tel = soDigitos(at.contatoTelefone);
  const suf = tel.slice(-8);
  if (cacheContato.has(suf)) return cacheContato.get(suf);

  const { data: existentes } = await supabase
    .from("contatos_whatsapp").select("id").like("telefone", `%${suf}`).limit(1);
  let id = existentes?.[0]?.id;
  if (!id) {
    const { data, error } = await supabase.from("contatos_whatsapp").insert({
      telefone: tel,
      nome: at.nome || null,
      tipo: "cliente",
      origem_migracao: "multi360",
    }).select("id").single();
    if (error) throw error;
    id = data.id;
  }
  cacheContato.set(suf, id);
  return id;
}

// ── 5. Processa um atendimento completo ────────────────────────────────────────
const estat = { atend: 0, msgs: 0, midia: 0, midiaPulada: 0, midiaFalha: 0, sistema: 0, erros: 0, porCanal: {} };

async function processarAtendimento(at) {
  const canal = resolverCanal(at);
  estat.porCanal[canal] = (estat.porCanal[canal] || 0) + 1;

  if (DRY) { const m = await coletarMensagens(at.id); estat.msgs += m.length; estat.atend++; return; }

  const contatoId = await obterContatoId(at);

  // chat (upsert por multi360_id)
  let chatId;
  const { data: chatRow, error: chatErr } = await supabase.from("chats").upsert({
    multi360_id: at.id,
    contato_id: contatoId,
    canal,
    status: "ativo",
    ia_ativa: false,
    ultima_mensagem_em: new Date(Number(at.dataUltimaMensagem || at.dataCriacao)).toISOString(),
  }, { onConflict: "multi360_id" }).select("id").single();
  if (chatErr) {
    // Contato já tem uma conversa ativa neste canal (vários atendimentos no
    // Multi360 → 1 chat no hub): mescla as mensagens na conversa existente.
    if (chatErr.code === "23505") {
      const { data: existente } = await supabase.from("chats")
        .select("id").eq("contato_id", contatoId).eq("canal", canal).eq("status", "ativo").limit(1).maybeSingle();
      if (!existente) throw chatErr;
      chatId = existente.id;
      estat.mesclados = (estat.mesclados || 0) + 1;
    } else throw chatErr;
  } else {
    chatId = chatRow.id;
  }

  // mensagens
  const mensagens = await coletarMensagens(at.id);
  const linhas = [];
  for (const msg of mensagens) {
    // pula eventos de sistema (transferência de atendente, etc.)
    const ehEvento = msg.categoria === "INFO" || /^\s*\{"message"/.test(String(msg.mensagem || ""));
    if (ehEvento) { estat.sistema++; continue; }

    const tipo = TIPO_MSG[msg.tipoMensagem] || "texto";
    let mediaUrl = null;
    let conteudo = msg.mensagem || "";
    if (msg.fileUrl) {
      const dataMsg = Number(msg.dataCriacao || msg.createdAt) || 0;
      const baixar = !SEM_MIDIA && (MIDIA_DESDE === null || dataMsg >= MIDIA_DESDE);
      if (baixar) {
        mediaUrl = await migrarMidia(msg, at.id);
        estat.midia++;
        if (!conteudo) conteudo = msg.nomePDF || mediaUrl || "";
      } else {
        // Fora da janela de mídia (ou --sem-midia): mantém o tipo e um rótulo legível
        estat.midiaPulada++;
        if (!conteudo) conteudo = msg.nomePDF || `[${tipo}]`;
      }
    }
    linhas.push({
      multi360_msg_id: msg.id,
      chat_id: chatId,
      origem: msg.tipo === "USUARIO" ? "cliente" : "humano",
      conteudo,
      tipo,
      media_url: mediaUrl,
      lida: true,
      criado_em: new Date(Number(msg.dataCriacao || msg.createdAt)).toISOString(),
    });
  }
  // upsert em lotes de 500
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await supabase.from("mensagens")
      .upsert(linhas.slice(i, i + 500), { onConflict: "multi360_msg_id" });
    if (error) throw error;
  }
  estat.msgs += linhas.length;
  estat.atend++;
}

// ── Orquestração com concorrência limitada + checkpoint ────────────────────────
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const CHECKPOINT = "./.progress.json";
const feitos = new Set(existsSync(CHECKPOINT) ? JSON.parse(readFileSync(CHECKPOINT, "utf8")) : []);

async function main() {
  console.log(`\n🚀 Migração Multi360 → Hub 3W  ${DRY ? "(DRY-RUN, não grava)" : ""}`);
  const atendimentos = await coletarAtendimentos();
  const pendentes = atendimentos.filter((a) => !feitos.has(a.id));
  console.log(`  Total: ${atendimentos.length} | já migrados: ${feitos.size} | a processar: ${pendentes.length}\n`);

  let i = 0;
  async function worker() {
    while (i < pendentes.length) {
      const at = pendentes[i++];
      const n = i;
      try {
        await processarAtendimento(at);
        feitos.add(at.id);
        if (n % 10 === 0) writeFileSync(CHECKPOINT, JSON.stringify([...feitos]));
        process.stdout.write(`\r  [${n}/${pendentes.length}] atend ${at.id} ✓  | msgs:${estat.msgs} mídia:${estat.midia}   `);
      } catch (e) {
        estat.erros++;
        const det = e?.message || e?.details || e?.hint || e?.code
          ? `${e.message || ""} | details: ${e.details || ""} | hint: ${e.hint || ""} | code: ${e.code || ""}`
          : JSON.stringify(e);
        console.error(`\n  ✖ atend ${at.id}: ${det}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCORRENCIA }, worker));
  writeFileSync(CHECKPOINT, JSON.stringify([...feitos]));

  console.log("\n\n──────── RESUMO ────────");
  console.log(`Atendimentos migrados : ${estat.atend}`);
  console.log(`Mensagens             : ${estat.msgs}`);
  console.log(`Mídias migradas       : ${estat.midia} (falhas de download: ${estat.midiaFalha})`);
  console.log(`Mídias puladas (rótulo): ${estat.midiaPulada}${MIDIA_DESDE ? " — fora da janela de data" : ""}`);
  console.log(`Eventos de sistema    : ${estat.sistema} (ignorados)`);
  console.log(`Erros                 : ${estat.erros}`);
  console.log(`Distribuição por canal: ${JSON.stringify(estat.porCanal)}`);
  console.log("────────────────────────\n");
}

main().catch((e) => { console.error("\n✖ Falha geral:", e); process.exit(1); });
