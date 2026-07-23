/**
 * Lista os templates de mensagem aprovados pela Meta pra essa WABA — usado
 * pelo hub pra oferecer botões de "iniciar/reabrir conversa" fora da janela
 * de 24h (só template aprovado pode iniciar conversa nesse caso).
 */

import { usuarioAutenticado, segredoInternoValido, respostaNaoAutorizado } from "./_auth";

export const config = { runtime: "edge" };

const META_API_VERSION = "v23.0";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!segredoInternoValido(req) && !(await usuarioAutenticado(req))) {
    return respostaNaoAutorizado();
  }

  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const META_WABA_ID = process.env.META_WABA_ID;
  if (!META_ACCESS_TOKEN || !META_WABA_ID) {
    return new Response(
      JSON.stringify({ ok: false, error: "META_ACCESS_TOKEN/META_WABA_ID não configuradas no servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const url = `https://graph.facebook.com/${META_API_VERSION}/${META_WABA_ID}/message_templates?fields=name,status,language,category,components&limit=100`;
    const metaRes = await fetch(url, { headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` } });
    const json = await metaRes.json();

    if (!metaRes.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: json?.error?.message ?? `Erro ${metaRes.status}` }),
        { status: metaRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const templates = (json.data ?? [])
      .filter((t: { status: string }) => t.status === "APPROVED")
      .map((t: { name: string; language: string; category: string; components?: { type: string; text?: string }[] }) => {
        const body = (t.components ?? []).find(c => c.type === "BODY");
        return { name: t.name, language: t.language, category: t.category, texto: body?.text ?? "" };
      });

    return new Response(JSON.stringify({ ok: true, templates }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[templates] erro:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
