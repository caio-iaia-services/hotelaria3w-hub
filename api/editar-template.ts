/**
 * Edita o conteúdo de um template já existente (categoria/corpo/rodapé/
 * imagem de cabeçalho) — usado pela tela Admin › Templates WhatsApp.
 *
 * Limitações da própria Meta, não nossas: não dá pra mudar nome nem idioma
 * de um template (teria que apagar e criar outro); editar o CONTEÚDO de um
 * template já APROVADO manda ele de volta pra revisão (some do dropdown de
 * campanha/atendimento até aprovar de novo) e a Meta limita quantas edições
 * são permitidas por template num período — se vier erro de limite, a
 * mensagem da própria Meta é repassada tal como chegou.
 *
 * IMPORTANTE sobre imagem: se o template já tinha cabeçalho de imagem e
 * esta edição não manda um headerHandle novo, o cabeçalho de imagem NÃO é
 * reenviado — o comportamento exato da Meta nesse caso (mantém a imagem
 * antiga ou remove) não foi testado nesta sessão. Pra garantir que a
 * imagem continue lá, sempre envie um headerHandle (pode ser o mesmo
 * arquivo reenviado) quando o template já tiver uma.
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
  if (!META_ACCESS_TOKEN) {
    return new Response(
      JSON.stringify({ ok: false, error: "META_ACCESS_TOKEN não configurada no servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { id, category, corpo, rodape, exemplos, headerHandle } = body as {
      id?: string; category?: string; corpo?: string; rodape?: string; exemplos?: string[]; headerHandle?: string;
    };

    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: "ID do template é obrigatório (não dá pra editar por nome)" }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!corpo || !corpo.trim()) {
      return new Response(
        JSON.stringify({ ok: false, error: "O corpo da mensagem é obrigatório" }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const bodyComponent: Record<string, unknown> = { type: "BODY", text: corpo };
    if (Array.isArray(exemplos) && exemplos.length > 0) {
      bodyComponent.example = { body_text: [exemplos] };
    }
    const components: Record<string, unknown>[] = [bodyComponent];
    if (headerHandle) {
      components.push({ type: "HEADER", format: "IMAGE", example: { header_handle: [headerHandle] } });
    }
    if (rodape && rodape.trim()) {
      components.push({ type: "FOOTER", text: rodape.trim() });
    }

    const categoriaValida = ["MARKETING", "UTILITY"].includes((category || "").toUpperCase())
      ? (category as string).toUpperCase()
      : undefined;

    const payload: Record<string, unknown> = { components };
    if (categoriaValida) payload.category = categoriaValida;

    const graphUrl = `https://graph.facebook.com/${META_API_VERSION}/${id}`;
    const metaRes = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${META_ACCESS_TOKEN}` },
      body: JSON.stringify(payload),
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
    console.error("[editar-template] erro:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
