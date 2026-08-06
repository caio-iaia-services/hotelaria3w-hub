/**
 * Cria um template de mensagem na WABA via Graph API e submete pra
 * aprovação da Meta — usado pela aba Templates do módulo Marketing, pra
 * ninguém precisar entrar no Business Manager pra isso.
 *
 * Exige que META_ACCESS_TOKEN tenha o escopo whatsapp_business_management
 * (não só whatsapp_business_messaging). Se faltar, a Meta devolve um erro
 * de permissão que é repassado tal como veio — ver [[atendimento-whatsapp-arquitetura]]
 * sobre a incerteza de qual escopo o token atual realmente tem.
 *
 * A Meta audita o CONTEÚDO, não a categoria declarada — pode reclassificar
 * (ex.: Utility → Marketing) na revisão. Aprovação leva de minutos a ~24h;
 * o template fica "PENDING" até lá, não pode ser usado em campanha.
 */

import { usuarioAutenticado, respostaNaoAutorizado } from "./_auth";

export const config = { runtime: "edge" };

const META_API_VERSION = "v23.0";
const NOME_VALIDO = /^[a-z0-9_]+$/;

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
    const body = await req.json();
    const { name, language, category, corpo, rodape, exemplos } = body as {
      name?: string; language?: string; category?: string; corpo?: string; rodape?: string; exemplos?: string[];
    };

    if (!name || !NOME_VALIDO.test(name)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Nome inválido — use só letras minúsculas, números e _ (sem espaços ou acentos)" }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!corpo || !corpo.trim()) {
      return new Response(
        JSON.stringify({ ok: false, error: "O corpo da mensagem é obrigatório" }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const categoriaValida = ["MARKETING", "UTILITY"].includes((category || "").toUpperCase())
      ? (category as string).toUpperCase()
      : "MARKETING";

    const bodyComponent: Record<string, unknown> = { type: "BODY", text: corpo };
    if (Array.isArray(exemplos) && exemplos.length > 0) {
      bodyComponent.example = { body_text: [exemplos] };
    }

    const components: Record<string, unknown>[] = [bodyComponent];
    if (rodape && rodape.trim()) {
      components.push({ type: "FOOTER", text: rodape.trim() });
    }

    const payload = { name, language: language || "pt_BR", category: categoriaValida, components };

    const graphUrl = `https://graph.facebook.com/${META_API_VERSION}/${META_WABA_ID}/message_templates`;
    const metaRes = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${META_ACCESS_TOKEN}` },
      body: JSON.stringify(payload),
    });
    const json = await metaRes.json();

    if (!metaRes.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: json?.error?.error_user_msg || json?.error?.message || `Erro ${metaRes.status}`, raw: json }),
        { status: metaRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, id: json.id, status: json.status || "PENDING" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[criar-template] erro:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
