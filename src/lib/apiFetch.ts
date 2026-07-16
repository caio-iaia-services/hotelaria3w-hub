import { supabase } from "@/integrations/supabase/client";

/**
 * fetch com o access token do usuário logado — obrigatório para os endpoints
 * /api/* protegidos (enviar-mensagem, enviar-email-orcamento,
 * enviar-campanha-email, agente-inteligencia).
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  return fetch(input, { ...init, headers });
}
