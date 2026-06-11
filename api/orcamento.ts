/**
 * Serve o HTML público de visualização de um orçamento por número.
 * Link curto: /orcamento/<numero>  (rewrite → /api/orcamento?n=<numero>)
 * O HTML é hospedado no bucket público orcamentos-html no momento do envio.
 */

export const config = { runtime: "edge" };

const STORAGE_BASE =
  "https://zaitvvwoqwdgtliocvtf.supabase.co/storage/v1/object/public/orcamentos-html";

function paginaErro(titulo: string, msg: string, status: number): Response {
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;display:flex;min-height:100vh;margin:0;align-items:center;justify-content:center;background:#f1f5f9;color:#1e293b}
.card{background:#fff;padding:48px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.08);text-align:center;max-width:420px}
h1{margin:0 0 8px;font-size:20px;color:#1a4168}p{margin:0;color:#64748b;font-size:14px}</style></head>
<body><div class="card"><h1>${titulo}</h1><p>${msg}</p></div></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const numero = (url.searchParams.get("n") || "").replace(/[^a-zA-Z0-9_-]/g, "");

  if (!numero) {
    return paginaErro("Orçamento não informado", "Verifique o link recebido.", 400);
  }

  try {
    const res = await fetch(`${STORAGE_BASE}/${numero}.html`, {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) {
      return paginaErro(
        "Orçamento não encontrado",
        "Este orçamento pode ter sido removido ou o link está incorreto.",
        404
      );
    }
    const html = await res.text();
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error("[orcamento] erro:", err);
    return paginaErro("Erro ao carregar", "Tente novamente em instantes.", 500);
  }
}
