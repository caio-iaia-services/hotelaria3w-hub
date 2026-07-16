/**
 * Autenticação dos endpoints /api/* — valida o JWT do Supabase do usuário
 * logado no hub (o prefixo "_" impede o Vercel de expor este arquivo como rota).
 *
 * A anon key é pública por natureza (já vai no bundle do frontend); o que
 * autentica é o access token do usuário, verificado no GoTrue.
 */

const SUPABASE_URL = "https://zaitvvwoqwdgtliocvtf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphaXR2dndvcXdkZ3RsaW9jdnRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTEwNzAsImV4cCI6MjA4NTc4NzA3MH0.jQwaWsV_kcrrvbrYwSoy7yAkEZR6dTw4Ve3iMg5VCbU";

/** True se o request traz um access token válido de usuário logado. */
export async function usuarioAutenticado(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === SUPABASE_ANON_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * True se o request traz o segredo interno (para chamadas máquina-a-máquina,
 * ex.: n8n). Só é aceito quando a env var API_INTERNAL_SECRET está configurada.
 */
export function segredoInternoValido(req: Request): boolean {
  const esperado = process.env.API_INTERNAL_SECRET;
  if (!esperado) return false;
  return req.headers.get("x-api-secret") === esperado;
}

export function respostaNaoAutorizado(): Response {
  return new Response(
    JSON.stringify({ ok: false, error: "Não autorizado — faça login no hub" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
