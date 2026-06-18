/**
 * Importa orçamentos do Wix (EXPORT ORÇAMENTOS WIX PARA SISTEMA CAIO.xlsx)
 * para a tabela `orcamentos` do Supabase.
 *
 * Mapeamento de colunas:
 *   Numero      → numero
 *   Titulo      → (ignorado)
 *   Cliente     → extrai CNPJ/CPF + nome; busca/cria cliente
 *   Data        → data_emissao
 *   Valor       → total
 *   Status      → status (FATURADO→refutado, ACEITO→consolidado, resto lowercase)
 *   FORNECEDOR  → fornecedor_nome
 *
 * Uso:
 *   node --env-file=.env importar-orcamentos-wix.mjs --dry
 *   node --env-file=.env importar-orcamentos-wix.mjs
 *   node --env-file=.env importar-orcamentos-wix.mjs --arquivo "outro.xlsx"
 */

import { createClient } from "@supabase/supabase-js";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRY = process.argv.includes("--dry");
const arquivoArg = (() => {
  const idx = process.argv.indexOf("--arquivo");
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const ARQUIVO_XLSX = arquivoArg
  ? path.resolve(arquivoArg)
  : path.resolve(
      __dirname,
      "../../../../Banco_Dados/EXPORT ORÇAMENTOS WIX PARA SISTEMA CAIO.xlsx"
    );

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ── Mapeamento de status ──────────────────────────────────────────────────────
function mapStatus(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "faturado") return "refutado";
  if (s === "aceito")   return "consolidado";
  // enviado, aprovado, expirado, rascunho → mantém em lowercase
  return s || "rascunho";
}

// ── Parse de valor "R$ 1.238,50" → 1238.50 ───────────────────────────────────
function parseValor(raw) {
  if (!raw) return 0;
  let s = String(raw).replace(/[^\d,.-]/g, ""); // remove R$, espaços etc
  // Formato BR: ponto = milhar, vírgula = decimal → "6.620,60"
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

// ── Parse de data "29/05/2026" → "2026-05-29" ────────────────────────────────
function parseData(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

// ── Extrai CNPJ/CPF e nome do campo Cliente ───────────────────────────────────
// Exemplos:
//   "01.043.755/0001-36 Izzi Hotéis"
//   "76.993.344/0001-00 - HOTEL SABARA"
//   "CPF 804.668.509-72 LUCIANE SOPPA"
//   "TRIPLE BORDERS LODGE HOTEL LTDA"  → sem documento
function parseCliente(raw) {
  if (!raw) return { doc: null, docRaw: null, nome: "" };
  let s = String(raw).trim();

  // CPF com prefixo "CPF": "CPF 804.668.509-72 NOME"
  const cpfPrefixMatch = s.match(/^CPF\s+([\d.\-]+)\s*(.*)/i);
  if (cpfPrefixMatch) {
    const doc = cpfPrefixMatch[1].trim();
    const nome = cpfPrefixMatch[2].trim() || doc;
    return { doc, docRaw: doc.replace(/\D/g, ""), nome, tipoPessoa: "PF" };
  }

  // CPF sem prefixo: "093.512.797-66 - Nome" (formato ###.###.###-##)
  const cpfMatch = s.match(/^(\d{3}\.\d{3}\.\d{3}-\d{2})\s*[-–]?\s*(.*)/);
  if (cpfMatch) {
    const doc = cpfMatch[1].trim();
    const nome = cpfMatch[2].trim() || doc;
    return { doc, docRaw: doc.replace(/\D/g, ""), nome, tipoPessoa: "PF" };
  }

  // CNPJ: padrão XX.XXX.XXX/XXXX-XX
  const cnpjMatch = s.match(/^(\d{2}[\.\d]{0,3}[\.\d]{0,3}\/\d{4}-\d{2})\s*[-–]?\s*(.*)/);
  if (cnpjMatch) {
    const doc = cnpjMatch[1].trim();
    const nome = cnpjMatch[2].trim() || s;
    return { doc, docRaw: doc.replace(/\D/g, ""), nome, tipoPessoa: "PJ" };
  }

  // Apenas dígitos que se parecem com CNPJ (14 dígitos no início)
  const apenasDigitos = s.replace(/\D/g, "");
  if (apenasDigitos.length === 14) {
    return { doc: s.split(/\s+/)[0], docRaw: apenasDigitos, nome: s, tipoPessoa: "PJ" };
  }

  return { doc: null, docRaw: null, nome: s, tipoPessoa: "PJ" };
}

// ── Validação de CNPJ (dígitos verificadores) ─────────────────────────────────
function cnpjValido(c) {
  c = String(c).replace(/\D/g, "");
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
  return c === c.substring(0, 12) + String(d1) + String(d2);
}

// Verifica duplicata considerando zeros à esquerda (0012946 == 12946)
function jaExiste(numero, existentes) {
  return existentes.has(numero) || existentes.has(String(parseInt(numero, 10)));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📊 Importar Orçamentos Wix ${DRY ? "(DRY-RUN)" : ""}`);
  console.log(`   Arquivo: ${ARQUIVO_XLSX}\n`);

  // 1. Lê o Excel
  const buf = readFileSync(ARQUIVO_XLSX);
  const wb = xlsxRead(buf);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = xlsxUtils.sheet_to_json(ws, { defval: "" });

  console.log(`   Total de linhas: ${rawRows.length}`);

  // 2. Mapeia colunas (case-insensitive)
  const col = (row, ...candidates) => {
    for (const k of Object.keys(row)) {
      if (candidates.some((c) => k.toLowerCase().includes(c.toLowerCase()))) return k;
    }
    return null;
  };

  const primeiraLinha = rawRows[0] || {};
  const colNumero    = col(primeiraLinha, "numero", "número", "nro");
  const colCliente   = col(primeiraLinha, "cliente");
  const colData      = col(primeiraLinha, "data");
  const colValor     = col(primeiraLinha, "valor");
  const colStatus    = col(primeiraLinha, "status");
  const colFornec    = col(primeiraLinha, "fornecedor");

  console.log("   Colunas detectadas:", { colNumero, colCliente, colData, colValor, colStatus, colFornec });
  if (!colNumero) { console.error("❌ Coluna Numero não encontrada!"); process.exit(1); }

  // 3. Parseia cada linha e coleta documentos únicos
  const linhas = rawRows
    .map((row) => {
      const numero = String(row[colNumero] || "").trim();
      if (!numero) return null;
      const clienteParsed = colCliente ? parseCliente(row[colCliente]) : { doc: null, docRaw: null, nome: "", tipoPessoa: "PJ" };
      return {
        numero,
        status:       mapStatus(colStatus ? row[colStatus] : ""),
        data_emissao: colData ? parseData(row[colData]) : null,
        total:        colValor ? parseValor(row[colValor]) : 0,
        fornecedor_nome: colFornec ? String(row[colFornec] || "").trim() || null : null,
        clienteParsed,
      };
    })
    .filter(Boolean);

  // 4. Verifica quais números já existem no banco
  const todosNumeros = linhas.map((l) => l.numero);
  // Busca por número exato E por número sem zeros à esquerda (evita duplicatas de formato)
  const todosNumerosNormalizados = [...new Set(todosNumeros.map((n) => String(parseInt(n, 10))))];
  const { data: existentes } = await supabase.from("orcamentos").select("numero").in("numero", todosNumeros);
  const { data: existentesNorm } = await supabase.from("orcamentos").select("numero").in("numero", todosNumerosNormalizados);
  const numerosExistentes = new Set([
    ...(existentes || []).map((e) => String(e.numero)),
    ...(existentesNorm || []).map((e) => String(parseInt(e.numero, 10))),
  ]);
  console.log(`\n   Já existem no banco: ${numerosExistentes.size} orçamentos`);

  // 5. Busca clientes por CNPJ/CPF no banco
  const docsUnicos = [...new Set(
    linhas.map((l) => l.clienteParsed.docRaw).filter((d) => d && d.length >= 11)
  )];

  const cliPorDoc = new Map(); // docRaw → {id, nome}
  if (docsUnicos.length > 0) {
    for (let i = 0; i < docsUnicos.length; i += 200) {
      const lote = docsUnicos.slice(i, i + 200);
      const { data } = await supabase.from("clientes")
        .select("id, cnpj, nome_fantasia, razao_social")
        .in("cnpj", lote);
      for (const c of data || []) {
        const raw = String(c.cnpj || "").replace(/\D/g, "");
        if (raw) cliPorDoc.set(raw, { id: c.id, nome: c.nome_fantasia || c.razao_social || "" });
      }
    }
    console.log(`   Clientes já cadastrados encontrados: ${cliPorDoc.size} / ${docsUnicos.length} CNPJs únicos`);
  }

  // 5b. Busca por nome para entradas sem CNPJ/CPF
  const nomesSemDoc = [...new Set(
    linhas
      .filter((l) => !jaExiste(l.numero, numerosExistentes) && !l.clienteParsed.docRaw)
      .map((l) => l.clienteParsed.nome.trim())
      .filter((n) => n && n.length > 2)
  )];

  const cliPorNome = new Map(); // nome normalizado → {id, nome}
  if (nomesSemDoc.length > 0) {
    console.log(`\n   Buscando ${nomesSemDoc.length} nomes únicos sem CNPJ/CPF no cadastro de clientes...`);
    for (let i = 0; i < nomesSemDoc.length; i += 50) {
      const lote = nomesSemDoc.slice(i, i + 50);
      // Busca por nome_fantasia OU razao_social (ilike para case-insensitive)
      for (const nome of lote) {
        const { data: found } = await supabase
          .from("clientes")
          .select("id, nome_fantasia, razao_social")
          .or(`nome_fantasia.ilike.%${nome}%,razao_social.ilike.%${nome}%`)
          .limit(1);
        if (found && found.length > 0) {
          const c = found[0];
          cliPorNome.set(nome.toLowerCase(), { id: c.id, nome: c.nome_fantasia || c.razao_social || nome });
        }
      }
    }
    const encontrados = cliPorNome.size;
    console.log(`   Encontrados por nome: ${encontrados} / ${nomesSemDoc.length}`);
    if (encontrados < nomesSemDoc.length) {
      const naoEncontrados = nomesSemDoc.filter((n) => !cliPorNome.has(n.toLowerCase()));
      console.log(`   Sem match por nome (serão pulados):`);
      for (const n of naoEncontrados) console.log(`     - "${n}"`);
    }
  }

  // 6. Processa cada linha
  const estat = {
    inseridos: 0,
    duplicatas: 0,
    clientesCriados: 0,
    semDoc: 0,
    erros: 0,
  };

  const inserts = [];
  const novosClientes = []; // para criar em lote

  // Pré-cria clientes novos (com CNPJ válido e não encontrados)
  for (const linha of linhas) {
    if (jaExiste(linha.numero, numerosExistentes)) continue;
    const { docRaw, doc, nome, tipoPessoa } = linha.clienteParsed;
    if (!docRaw || docRaw.length < 11) continue;
    if (cliPorDoc.has(docRaw)) continue;

    // Evita criar o mesmo CNPJ duas vezes
    const jaAdicionado = novosClientes.some((c) => c._docRaw === docRaw);
    if (jaAdicionado) continue;

    const ehCnpj = docRaw.length === 14;
    novosClientes.push({
      _docRaw: docRaw,
      cnpj: docRaw,
      razao_social: nome || `Cliente ${docRaw}`,
      nome_fantasia: nome || `Cliente ${docRaw}`,
      status: "ativo",
      pessoa_tipo: ehCnpj ? "PJ" : "PF",
      cnpj_validado: ehCnpj ? cnpjValido(docRaw) : false,
      tags: ["Wix", "Validação"],
    });
  }

  if (novosClientes.length > 0) {
    console.log(`\n   Criando ${novosClientes.length} clientes novos (etiqueta "Wix" + "Validação")...`);
    if (!DRY) {
      for (let i = 0; i < novosClientes.length; i += 50) {
        const lote = novosClientes.slice(i, i + 50).map(({ _docRaw, ...c }) => c);
        const { data: criados, error } = await supabase.from("clientes").insert(lote).select("id, cnpj");
        if (error) {
          console.error(`   ⚠️  Erro ao criar clientes: ${error.message}`);
        } else {
          for (const c of criados || []) {
            const raw = String(c.cnpj || "").replace(/\D/g, "");
            const nc = novosClientes.find((n) => n._docRaw === raw);
            if (raw && nc) cliPorDoc.set(raw, { id: c.id, nome: nc.razao_social });
          }
          estat.clientesCriados += (criados || []).length;
        }
      }
    } else {
      // dry-run: simula os ids
      for (const nc of novosClientes) {
        cliPorDoc.set(nc._docRaw, { id: `novo-${nc._docRaw}`, nome: nc.razao_social });
        estat.clientesCriados++;
      }
    }
    console.log(`   ✅ ${estat.clientesCriados} clientes criados`);
  }

  // 7. Monta inserts de orçamentos
  for (const linha of linhas) {
    if (jaExiste(linha.numero, numerosExistentes)) {
      estat.duplicatas++;
      continue;
    }

    const { docRaw, doc, nome } = linha.clienteParsed;
    const clienteInfo = docRaw
      ? cliPorDoc.get(docRaw)
      : cliPorNome.get(nome.trim().toLowerCase()) || null;

    if (!clienteInfo) {
      estat.semDoc++;
      if (estat.semDoc <= 10) {
        console.log(`   ⚠️  Sem cliente: Nº ${linha.numero} | "${linha.clienteParsed.nome}" (doc: ${docRaw || "—"})`);
      }
      continue;
    }

    inserts.push({
      numero:          linha.numero,
      status:          linha.status,
      data_emissao:    linha.data_emissao,
      cliente_id:      clienteInfo.id,
      cliente_nome:    clienteInfo.nome,
      cliente_cnpj:    doc || docRaw || null,
      fornecedor_nome: linha.fornecedor_nome,
      total:           linha.total,
    });
  }

  // 8. Insere orçamentos em lotes
  console.log(`\n   Orçamentos a inserir: ${inserts.length}`);
  console.log(`   Duplicatas ignoradas: ${estat.duplicatas}`);
  console.log(`   Sem cliente (sem doc/CNPJ): ${estat.semDoc}`);

  if (inserts.length === 0) {
    console.log("\n   Nada a inserir.\n");
    return;
  }

  if (!DRY) {
    for (let i = 0; i < inserts.length; i += 100) {
      const lote = inserts.slice(i, i + 100);
      const { error } = await supabase.from("orcamentos").insert(lote);
      if (error) {
        console.error(`   ❌ Erro no lote ${i}–${i + lote.length}: ${error.message}`);
        estat.erros += lote.length;
      } else {
        estat.inseridos += lote.length;
      }
      process.stdout.write(`\r   Inseridos: ${estat.inseridos}/${inserts.length}  `);
    }
    console.log();
  } else {
    estat.inseridos = inserts.length;
    console.log(`   (dry-run) Seriam inseridos: ${inserts.length}`);
    // Mostra amostra
    console.log("\n   Amostra (5 primeiros):");
    for (const o of inserts.slice(0, 5)) {
      console.log(`     Nº ${o.numero} | ${o.status} | ${o.data_emissao} | R$ ${o.total} | ${o.cliente_nome} | ${o.fornecedor_nome}`);
    }
  }

  // 9. Resumo
  console.log("\n──────── RESUMO ────────");
  console.log(`Orçamentos inseridos    : ${estat.inseridos}`);
  console.log(`Duplicatas ignoradas    : ${estat.duplicatas}`);
  console.log(`Sem cliente/doc         : ${estat.semDoc}`);
  console.log(`Clientes criados (novos): ${estat.clientesCriados}`);
  console.log(`Erros                   : ${estat.erros}`);
  console.log("────────────────────────\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
