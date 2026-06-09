/**
 * Proxy server-side — chama a Evolution API diretamente (sem n8n).
 * Elimina CORS e dependência de webhook n8n.
 */

export const config = { runtime: "edge" };

const EVOLUTION_BASE = "https://n8n-evolution-api.3sq8ua.easypanel.host";
const EVOLUTION_INSTANCE = "3W-Atendimento";
const EVOLUTION_APIKEY = "429683C4C977415CAAFCCE10F7D57E11";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    console.log("[enviar-mensagem] payload →", JSON.stringify(body));

    const { telefone_cliente, mensagem, arquivo_url, tipo_midia } = body;
    const temMidia = !!(arquivo_url && arquivo_url.length > 0);

    let endpoint: string;
    let payload: Record<string, unknown>;

    if (temMidia) {
      const tipoMap: Record<string, string> = {
        imagem: "image",
        documento: "document",
        audio: "audio",
        video: "video",
      };
      const mediatype = tipoMap[tipo_midia] ?? "document";
      const fileName = (arquivo_url as string).split("/").pop()?.split("?")[0] ?? "arquivo";
      endpoint = "sendMedia";
      payload = {
        number: telefone_cliente,
        mediatype,
        media: arquivo_url,
        caption: mensagem || "",
        fileName,
      };
    } else {
      endpoint = "sendText";
      payload = {
        number: telefone_cliente,
        text: mensagem,
      };
    }

    const url = `${EVOLUTION_BASE}/message/${endpoint}/${EVOLUTION_INSTANCE}`;
    console.log(`[enviar-mensagem] → ${url}`, JSON.stringify(payload));

    const evoRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_APIKEY,
      },
      body: JSON.stringify(payload),
    });

    const text = await evoRes.text();
    console.log(`[enviar-mensagem] Evolution status=${evoRes.status} body=${text}`);

    return new Response(
      JSON.stringify({ ok: evoRes.ok, status: evoRes.status, body: text }),
      {
        status: evoRes.ok ? 200 : evoRes.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[enviar-mensagem] erro:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
