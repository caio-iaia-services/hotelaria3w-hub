/**
 * Busca mídia recebida do WhatsApp diretamente da Evolution API.
 * As URLs de mídia do WhatsApp (mmg.whatsapp.net/...enc) são criptografadas
 * e inúteis no browser — a Evolution descriptografa via getBase64FromMediaMessage.
 *
 * Uso: GET /api/midia?id=<messageKeyId>
 */

export const config = { runtime: "edge" };

const EVOLUTION_BASE = "https://n8n-evolution-api.3sq8ua.easypanel.host";
const EVOLUTION_INSTANCE = "3W-Atendimento";
const EVOLUTION_APIKEY = "429683C4C977415CAAFCCE10F7D57E11";

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const messageId = url.searchParams.get("id");

  if (!messageId) {
    return new Response(JSON.stringify({ error: "Parâmetro 'id' obrigatório" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const evoRes = await fetch(
      `${EVOLUTION_BASE}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_APIKEY,
        },
        body: JSON.stringify({
          message: { key: { id: messageId } },
          convertToMp4: false,
        }),
      }
    );

    if (!evoRes.ok) {
      const text = await evoRes.text();
      console.error(`[midia] Evolution ${evoRes.status}: ${text}`);
      return new Response(
        JSON.stringify({ error: "Mídia não encontrada", detail: text }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await evoRes.json();
    const base64: string = data.base64 ?? "";
    const mimetype: string = data.mimetype || "application/octet-stream";
    const fileName: string = data.fileName || "arquivo";

    if (!base64) {
      return new Response(JSON.stringify({ error: "Mídia vazia" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // base64 → bytes
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": mimetype,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
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
