/**
 * Serve mídia recebida do WhatsApp — dois provedores possíveis:
 *
 * 1. Evolution/Baileys (legado): URLs mmg.whatsapp.net/...enc são criptografadas
 *    (AES-256-CBC com chave derivada via HKDF do mediaKey). O n8n salva
 *    url+mediaKey+mimetype no momento do webhook e este endpoint descriptografa
 *    sob demanda. Sentinela: k = mediaKey real (base64 ou lista de bytes).
 *
 * 2. Meta Cloud API (atual): mídia não é criptografada client-side — só existe
 *    media_id, que precisa ser resolvido via Graph API (GET /{media_id} com
 *    Bearer → url temporária → baixar com o mesmo Bearer). Sentinela: k = "META"
 *    e u = media_id.
 *
 * Uso: GET /api/midia?u=<url .enc | media_id>&k=<mediaKey | "META">&t=<tipoMensagem>&m=<mimetype>
 * Com &fmt=b64 devolve JSON { base64, mimetype } — usado pelo n8n
 * (nó Converter Imagem/Áudio espera a propriedade base64).
 */

export const config = { runtime: "edge" };

// Info strings do HKDF conforme protocolo WhatsApp (por tipo de mídia)
const HKDF_INFO: Record<string, string> = {
  imageMessage: "WhatsApp Image Keys",
  stickerMessage: "WhatsApp Image Keys",
  videoMessage: "WhatsApp Video Keys",
  audioMessage: "WhatsApp Audio Keys",
  documentMessage: "WhatsApp Document Keys",
  documentWithCaptionMessage: "WhatsApp Document Keys",
};

// Aceita mediaKey como base64 OU lista de bytes "17,42,..." (Evolution
// serializa o Buffer como objeto; o n8n converte para lista de bytes)
function keyToBytes(k: string): Uint8Array {
  if (/^[\d,\s]+$/.test(k)) {
    return new Uint8Array(k.split(",").map(n => parseInt(n.trim(), 10)));
  }
  let b64 = k.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  while (b64.length % 4 !== 0) b64 += "=";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const encUrl = url.searchParams.get("u");
  const mediaKeyB64 = url.searchParams.get("k");
  const tipo = url.searchParams.get("t") ?? "imageMessage";
  const mimetype = url.searchParams.get("m") || "application/octet-stream";

  if (!encUrl || !mediaKeyB64) {
    return new Response(
      JSON.stringify({ error: "Parâmetros 'u' (url) e 'k' (mediaKey) obrigatórios" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Mídia da Meta Cloud API: "u" é o media_id, não uma URL — resolve e baixa via Graph API.
  if (mediaKeyB64 === "META") {
    return servirMidiaMeta(encUrl, mimetype, url.searchParams.get("fmt") === "b64");
  }

  if (!/^https:\/\/[^/]*\.whatsapp\.net\//i.test(encUrl)) {
    return new Response(JSON.stringify({ error: "URL não permitida" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Baixa o arquivo criptografado
    const encRes = await fetch(encUrl);
    if (!encRes.ok) {
      return new Response(
        JSON.stringify({ error: `Falha ao baixar mídia (${encRes.status}) — pode ter expirado no WhatsApp` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const encData = new Uint8Array(await encRes.arrayBuffer());

    // 2. Deriva as chaves: HKDF-SHA256(mediaKey, salt=vazio, info=por tipo) → 112 bytes
    //    iv = bytes 0..16, cipherKey = bytes 16..48 (o restante é macKey/refKey)
    const mediaKey = keyToBytes(mediaKeyB64);
    const info = HKDF_INFO[tipo] ?? "WhatsApp Document Keys";
    const hkdfKey = await crypto.subtle.importKey("raw", mediaKey, "HKDF", false, ["deriveBits"]);
    const derived = new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: new Uint8Array(32), // protocolo usa salt de zeros
          info: new TextEncoder().encode(info),
        },
        hkdfKey,
        112 * 8
      )
    );
    const iv = derived.slice(0, 16);
    const cipherKey = derived.slice(16, 48);

    // 3. Os últimos 10 bytes do arquivo são o MAC — remove antes de descriptografar
    const cipherText = encData.slice(0, encData.length - 10);

    const aesKey = await crypto.subtle.importKey("raw", cipherKey, "AES-CBC", false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, aesKey, cipherText);

    // fmt=b64: devolve JSON com base64 (consumido pelo n8n / Converter Imagem)
    if (url.searchParams.get("fmt") === "b64") {
      const bytes = new Uint8Array(plain);
      let bin = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      return new Response(
        JSON.stringify({ base64: btoa(bin), mimetype }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        }
      );
    }

    return new Response(plain, {
      status: 200,
      headers: {
        "Content-Type": mimetype,
        // Mídia do WhatsApp é imutável — cache agressivo
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[midia] erro:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Mídia da Meta Cloud API não é criptografada client-side: media_id → GET /{id}
// (Graph API) devolve uma URL temporária, que é baixada com o mesmo Bearer token.
async function servirMidiaMeta(mediaId: string, mimetypeFallback: string, fmtB64: boolean): Promise<Response> {
  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  if (!META_ACCESS_TOKEN) {
    return new Response(
      JSON.stringify({ error: "META_ACCESS_TOKEN não configurada no servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const metaRes = await fetch(`https://graph.facebook.com/v23.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` },
    });
    if (!metaRes.ok) {
      return new Response(
        JSON.stringify({ error: `Falha ao resolver media_id (${metaRes.status}) — pode ter expirado (mídia da Meta expira em ~30 dias)` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    const { url: tempUrl, mime_type } = await metaRes.json();
    const mimetype = mime_type || mimetypeFallback;

    const fileRes = await fetch(tempUrl, { headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` } });
    if (!fileRes.ok) {
      return new Response(
        JSON.stringify({ error: `Falha ao baixar mídia (${fileRes.status})` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (fmtB64) {
      const bytes = new Uint8Array(await fileRes.arrayBuffer());
      let bin = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      return new Response(JSON.stringify({ base64: btoa(bin), mimetype }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=31536000, immutable" },
      });
    }

    return new Response(fileRes.body, {
      status: 200,
      headers: { "Content-Type": mimetype, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (err) {
    console.error("[midia] erro (Meta):", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
