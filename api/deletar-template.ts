/**
 * Apaga um template da WABA (todas as variantes de idioma daquele nome) —
 * usado pela tela Admin › Templates WhatsApp. Ação irreversível: se o
 * template estiver em uso (fallback de reengajamento do Atendimento ou
 * campanha ativa), quem chama isso quebra esse fluxo — a confirmação fica
 * a cargo do frontend (AlertDialog), este endpoint só executa.
 */

import { usuarioAutenticado, respostaNaoAutorizado } from "./_auth";

export const config = { runtime: "edge" };

const META_API_VERSION = "v23.0";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!(await usuarioAutenticado(req))) {
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
    const { name } = (await req.json()) as { name?: string };
    if (!name) {
      return new Response(
        JSON.stringify({ ok: false, error: "Nome do template é obrigatório" }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const graphUrl = `https://graph.facebook.com/${META_API_VERSION}/${META_WABA_ID}/message_templates?name=${encodeURIComponent(name)}`;
    const metaRes = await fetch(graphUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` },
    });
    const json = await metaRes.json();

    if (!metaRes.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: json?.error?.error_user_msg || json?.error?.message || `Erro ${metaRes.status}` }),
        { status: metaRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[deletar-template] erro:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
