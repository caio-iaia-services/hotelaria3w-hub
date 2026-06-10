/**
 * Descriptografa e serve mídia recebida do WhatsApp.
 *
 * As URLs de mídia do WhatsApp (mmg.whatsapp.net/...enc) são criptografadas
 * (AES-256-CBC com chave derivada via HKDF do mediaKey). A Evolution API não
 * consegue recuperá-las depois (armazena message=null para mensagens LID),
 * então o n8n salva url+mediaKey+mimetype no momento do webhook e este
 * endpoint descriptografa sob demanda.
 *
 * Uso: GET /api/midia?u=<url .enc>&k=<mediaKey base64>&t=<tipoMensagem>&m=<mimetype>
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

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
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
    const mediaKey = b64ToBytes(mediaKeyB64);
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
