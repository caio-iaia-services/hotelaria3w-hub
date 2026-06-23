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

    // Sanitiza: remove tudo que não é dígito, garante DDI 55
    const telRaw = String(telefone_cliente || "").replace(/\D/g, "");
    let telFinal = telRaw.startsWith("55") ? telRaw : "55" + telRaw;

    // Brasil: números móveis precisam do dígito 9 após o DDD
    // 12 dígitos = 55 + DDD(2) + número(8) → insere 9 antes dos 8 dígitos finais
    if (telFinal.length === 12) {
      telFinal = telFinal.slice(0, 4) + "9" + telFinal.slice(4);
    }

    console.log(`[enviar-mensagem] telefone raw="${telefone_cliente}" → "${telFinal}"`);

    if (telFinal.length < 12 || telFinal.length > 13) {
      return new Response(
        JSON.stringify({ ok: false, error: "Número de telefone inválido", numero: telFinal }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

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
        number: telFinal,
        mediatype,
        media: arquivo_url,
        caption: mensagem || "",
        fileName,
      };
    } else {
      endpoint = "sendText";
      payload = {
        number: telFinal,
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

    // Evolution retorna 400 com exists:false quando número não está no WhatsApp
    if (!evoRes.ok) {
      let errorMsg = `Erro ${evoRes.status}`;
      try {
        const parsed = JSON.parse(text);
        const msgs = parsed?.response?.message;
        if (Array.isArray(msgs) && msgs[0]?.exists === false) {
          errorMsg = `Número ${telFinal} não encontrado no WhatsApp`;
        } else if (parsed?.message) {
          errorMsg = parsed.message;
        }
      } catch {}
      return new Response(
        JSON.stringify({ ok: false, status: evoRes.status, error: errorMsg, raw: text }),
        { status: evoRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, status: evoRes.status, body: text }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[enviar-mensagem] erro:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
