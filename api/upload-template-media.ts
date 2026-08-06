/**
 * Sobe uma imagem de exemplo pra Meta e devolve o "handle" que o template
 * precisa pra ter cabeçalho de imagem — é um passo separado da criação do
 * template em si (API de Resumable Upload da Meta, não o endpoint de
 * message_templates). Usado por Admin › Templates WhatsApp antes de
 * chamar /api/criar-template ou /api/editar-template com headerHandle.
 *
 * Exige META_APP_ID (App ID do app "Api Oficial 3W" na Meta — não
 * confundir com META_WABA_ID). Duas chamadas à Graph API:
 *   1) cria a sessão de upload (informa tamanho/tipo do arquivo)
 *   2) envia os bytes, recebe de volta o handle (campo "h")
 */

import { usuarioAutenticado, respostaNaoAutorizado } from "./_auth";

export const config = { runtime: "edge" };

const META_API_VERSION = "v23.0";
const TIPOS_ACEITOS = ["image/jpeg", "image/png"];
const TAMANHO_MAXIMO_BYTES = 4 * 1024 * 1024; // 4MB — margem de segurança abaixo do limite de corpo de requisição

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!(await usuarioAutenticado(req))) {
    return respostaNaoAutorizado();
  }

  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const META_APP_ID = process.env.META_APP_ID;
  if (!META_ACCESS_TOKEN || !META_APP_ID) {
    return new Response(
      JSON.stringify({ ok: false, error: "META_ACCESS_TOKEN/META_APP_ID não configuradas no servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Envie o arquivo no campo 'file'" }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!TIPOS_ACEITOS.includes(file.type)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Formato não aceito — use JPEG ou PNG" }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }
    if (file.size > TAMANHO_MAXIMO_BYTES) {
      return new Response(
        JSON.stringify({ ok: false, error: "Imagem grande demais (máx. 4MB)" }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const bytes = await file.arrayBuffer();

    // 1) Cria a sessão de upload
    const sessionUrl = `https://graph.facebook.com/${META_API_VERSION}/${META_APP_ID}/uploads?file_length=${bytes.byteLength}&file_type=${encodeURIComponent(file.type)}`;
    const sessionRes = await fetch(sessionUrl, {
      method: "POST",
      headers: { Authorization: `OAuth ${META_ACCESS_TOKEN}` },
    });
    const sessionJson = await sessionRes.json();
    if (!sessionRes.ok || !sessionJson.id) {
      return new Response(
        JSON.stringify({ ok: false, error: sessionJson?.error?.message || `Erro ao criar sessão de upload (${sessionRes.status})` }),
        { status: sessionRes.status || 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2) Envia os bytes da imagem
    const uploadRes = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${sessionJson.id}`, {
      method: "POST",
      headers: { Authorization: `OAuth ${META_ACCESS_TOKEN}`, file_offset: "0" },
      body: bytes,
    });
    const uploadJson = await uploadRes.json();
    if (!uploadRes.ok || !uploadJson.h) {
      return new Response(
        JSON.stringify({ ok: false, error: uploadJson?.error?.message || `Erro ao enviar imagem (${uploadRes.status})` }),
        { status: uploadRes.status || 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true, handle: uploadJson.h }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[upload-template-media] erro:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
