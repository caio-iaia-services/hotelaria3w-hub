/**
 * Proxy server-side — chama a Evolution API diretamente (sem n8n).
 * Elimina CORS e dependência de webhook n8n.
 */

export const config = { runtime: "edge" };

const EVOLUTION_BASE = "https://n8n-evolution-api.3sq8ua.easypanel.host";
const EVOLUTION_INSTANCE = "3W-Hotelaria";
const EVOLUTION_APIKEY = "429683C4C977415CAAFCCE10F7D57E11";

/**
 * Workaround Evolution 2.3.7: a sessão pareada em 02/07/2026 não consegue
 * enviar para JIDs de número (@s.whatsapp.net) — retorna ERROR silencioso.
 * Enviar para o JID @lid do contato funciona. O lid não vem no webhook
 * (que normaliza para número), mas fica gravado no store de mensagens da
 * Evolution em key.remoteJid, com key.remoteJidAlt = número real.
 * Remover quando migrar para Evolution >= 2.4.0.
 */
async function resolverLid(telDigits: string): Promise<string | null> {
  // Variantes com/sem o nono dígito (celulares BR podem estar gravados das duas formas)
  const variantes = [telDigits];
  if (/^55\d{2}9\d{8}$/.test(telDigits)) {
    variantes.push(telDigits.slice(0, 4) + telDigits.slice(5));
  } else if (/^55\d{10}$/.test(telDigits)) {
    variantes.push(telDigits.slice(0, 4) + "9" + telDigits.slice(4));
  }

  for (const v of variantes) {
    try {
      const res = await fetch(
        `${EVOLUTION_BASE}/chat/findMessages/${EVOLUTION_INSTANCE}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: EVOLUTION_APIKEY,
          },
          body: JSON.stringify({
            where: { key: { remoteJidAlt: `${v}@s.whatsapp.net` } },
            limit: 1,
          }),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const jid = data?.messages?.records?.[0]?.key?.remoteJid;
      if (typeof jid === "string" && jid.endsWith("@lid")) {
        console.log(`[enviar-mensagem] lid resolvido: ${v} → ${jid}`);
        return jid;
      }
    } catch (e) {
      console.error(`[enviar-mensagem] falha ao resolver lid de ${v}:`, e);
    }
  }
  return null;
}

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
    const telDigits = telRaw.startsWith("55") ? telRaw : "55" + telRaw;

    console.log(`[enviar-mensagem] telefone raw="${telefone_cliente}" → "${telDigits}"`);

    if (telDigits.length < 10) {
      return new Response(
        JSON.stringify({ ok: false, error: "Número de telefone inválido", numero: telDigits }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    // Passa o JID completo para bypassar a validação de existência da Evolution API
    // (evita falso "exists: false" em números VoIP, linhas com 8 dígitos, etc.)
    // Prioriza o JID @lid — envio por número está quebrado na sessão atual (ver resolverLid)
    const lid = await resolverLid(telDigits);
    const telFinal = lid ?? `${telDigits}@s.whatsapp.net`;

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
