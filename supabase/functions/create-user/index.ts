import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Autoriza: o chamador precisa estar logado e ter o módulo admin_usuarios
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Não autenticado" }, 401);

    const { data: caller, error: authError } = await admin.auth.getUser(token);
    if (authError || !caller?.user) return json({ error: "Não autenticado" }, 401);

    const { data: perfilCaller } = await admin
      .from("user_profiles")
      .select("role, modulos, ativo")
      .eq("id", caller.user.id)
      .single();

    const autorizado =
      perfilCaller?.ativo !== false &&
      (perfilCaller?.role === "admin" ||
        (perfilCaller?.modulos ?? []).includes("admin_usuarios"));
    if (!autorizado) {
      return json({ error: "Sem permissão para criar usuários" }, 403);
    }

    const { email, password, nome, role, gestao, modulos } = await req.json();

    if (!email || !password || !nome) {
      return json({ error: "Nome, e-mail e senha são obrigatórios" }, 400);
    }
    if (String(password).length < 6) {
      return json({ error: "Senha deve ter no mínimo 6 caracteres" }, 400);
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) return json({ error: error.message }, 400);

    const userId = data.user?.id;
    if (!userId) return json({ error: "Usuário criado mas ID não retornado" }, 500);

    const { error: perfilError } = await admin.from("user_profiles").insert({
      id: userId,
      email,
      nome,
      role: role ?? "comercial",
      gestao: gestao ?? null,
      modulos: modulos ?? [],
      ativo: true,
    });
    if (perfilError) {
      // Desfaz a criação no Auth para não deixar usuário órfão sem perfil
      await admin.auth.admin.deleteUser(userId);
      return json({ error: `Erro ao criar perfil: ${perfilError.message}` }, 500);
    }

    return json({ user: { id: userId, email } }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
