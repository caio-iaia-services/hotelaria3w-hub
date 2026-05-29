/**
 * Proxy server-side para o webhook n8n de envio de mensagens WhatsApp.
 * Elimina problemas de CORS/rede do browser — a chamada ao n8n ocorre no servidor.
 */

export const config = { runtime: "edge" };

const N8N_WEBHOOK =
  "https://n8n-n8n-start.3sq8ua.easypanel.host/webhook/enviar_mensagem_humano";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    console.log("[proxy enviar-mensagem] payload →", JSON.stringify(body));

    const n8nRes = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await n8nRes.text();
    console.log(`[proxy enviar-mensagem] n8n status=${n8nRes.status} body=${text}`);

    // Sempre devolve o status real do n8n para o frontend poder tratar
    return new Response(
      JSON.stringify({ ok: n8nRes.ok, status: n8nRes.status, body: text }),
      {
        status: n8nRes.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[proxy enviar-mensagem] erro:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
