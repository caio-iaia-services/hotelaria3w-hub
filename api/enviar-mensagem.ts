/**
 * Proxy server-side — chama a WhatsApp Cloud API (Meta) diretamente.
 * Substitui a Evolution API (migração concluída em 2026-07). Mantém o mesmo
 * contrato de entrada ({telefone_cliente, mensagem, arquivo_url, tipo_midia})
 * para que os nós de envio do n8n não precisem mudar.
 *
 * Janela de 24h: a Cloud API só permite mensagem livre se o destinatário
 * escreveu pra 3W nas últimas 24h (Meta responde erro 131047 fora da janela).
 * Fora da janela, cai automaticamente num template aprovado só pra reabrir a
 * conversa — o conteúdo real (resumo de handoff, resposta da IA etc.) não é
 * entregue nesse envio; precisa ser reenviado como mensagem livre depois que
 * o destinatário responder ao template.
 */

import { usuarioAutenticado, segredoInternoValido, respostaNaoAutorizado } from "./_auth";

export const config = { runtime: "edge" };

const META_API_VERSION = "v23.0";
const RE_ENGAGEMENT_ERROR_CODE = 131047;
const FALLBACK_TEMPLATE_NAME = process.env.META_FALLBACK_TEMPLATE || "tudo_bem";
const FALLBACK_TEMPLATE_LANG = process.env.META_FALLBACK_TEMPLATE_LANG || "pt_BR";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Usuário logado no hub OU segredo interno (n8n/automação)
  if (!segredoInternoValido(req) && !(await usuarioAutenticado(req))) {
    return respostaNaoAutorizado();
  }

  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    return new Response(
      JSON.stringify({ ok: false, error: "META_ACCESS_TOKEN/META_PHONE_NUMBER_ID não configuradas no servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    console.log("[enviar-mensagem] payload →", JSON.stringify(body));

    const { telefone_cliente, mensagem, arquivo_url, tipo_midia, template } = body;

    // Sanitiza: remove tudo que não é dígito, garante DDI 55 (Meta exige código do país, sem "+")
    const telRaw = String(telefone_cliente || "").replace(/\D/g, "");
    const telDigits = telRaw.startsWith("55") ? telRaw : "55" + telRaw;

    console.log(`[enviar-mensagem] telefone raw="${telefone_cliente}" → "${telDigits}"`);

    if (telDigits.length < 10) {
      return new Response(
        JSON.stringify({ ok: false, error: "Número de telefone inválido", numero: telDigits }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const temMidia = !!(arquivo_url && arquivo_url.length > 0);

    let payload: Record<string, unknown>;

    if (template?.name) {
      // Envio explícito de template (botão no hub) — usado pra iniciar ou
      // reabrir conversa fora da janela de 24h, sem depender do fallback automático.
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: telDigits,
        type: "template",
        template: { name: template.name, language: { code: template.language || FALLBACK_TEMPLATE_LANG } },
      };
    } else if (temMidia) {
      const tipoMap: Record<string, string> = {
        imagem: "image",
        documento: "document",
        audio: "audio",
        video: "video",
      };
      const mediaType = tipoMap[tipo_midia] ?? "document";
      const fileName = (arquivo_url as string).split("/").pop()?.split("?")[0] ?? "arquivo";

      const mediaObj: Record<string, unknown> = { link: arquivo_url };
      if (mediaType === "document") mediaObj.filename = fileName;
      if (mediaType === "image" || mediaType === "video" || mediaType === "document") {
        mediaObj.caption = mensagem || "";
      }

      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: telDigits,
        type: mediaType,
        [mediaType]: mediaObj,
      };
    } else {
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: telDigits,
        type: "text",
        text: { preview_url: false, body: mensagem },
      };
    }

    const graphUrl = `https://graph.facebook.com/${META_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`;
    const enviar = (p: Record<string, unknown>) =>
      fetch(graphUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${META_ACCESS_TOKEN}` },
        body: JSON.stringify(p),
      });

    console.log(`[enviar-mensagem] → ${graphUrl}`, JSON.stringify(payload));
    let metaRes = await enviar(payload);
    let text = await metaRes.text();
    console.log(`[enviar-mensagem] Meta status=${metaRes.status} body=${text}`);

    if (!metaRes.ok) {
      let errorCode: number | undefined;
      let errorMsg = `Erro ${metaRes.status}`;
      try {
        const parsed = JSON.parse(text);
        errorCode = parsed?.error?.code;
        if (parsed?.error?.message) errorMsg = parsed.error.error_user_msg || parsed.error.message;
      } catch {}

      // Fora da janela de 24h: tenta reabrir a conversa com um template aprovado
      // (só cobre mensagem de texto — mídia fora da janela ainda falha, sem template com mídia hoje).
      if (errorCode === RE_ENGAGEMENT_ERROR_CODE && payload.type !== "template") {
        const templatePayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: telDigits,
          type: "template",
          template: { name: FALLBACK_TEMPLATE_NAME, language: { code: FALLBACK_TEMPLATE_LANG } },
        };
        console.log(`[enviar-mensagem] fora da janela de 24h → tentando template "${FALLBACK_TEMPLATE_NAME}"`);
        metaRes = await enviar(templatePayload);
        text = await metaRes.text();
        console.log(`[enviar-mensagem] Meta (template) status=${metaRes.status} body=${text}`);

        if (metaRes.ok) {
          return new Response(
            JSON.stringify({
              ok: true,
              status: metaRes.status,
              body: text,
              viaTemplate: true,
              aviso: "Fora da janela de 24h — enviado template de reengajamento, não a mensagem original. Reenvie o conteúdo real após o destinatário responder.",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        // Template também falhou (ex.: não aprovado ainda) — cai pro erro abaixo com info do template
        errorMsg = `Fora da janela de 24h e template "${FALLBACK_TEMPLATE_NAME}" falhou: ${errorMsg}`;
      }

      return new Response(
        JSON.stringify({ ok: false, status: metaRes.status, error: errorMsg, raw: text }),
        { status: metaRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, status: metaRes.status, body: text }),
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
