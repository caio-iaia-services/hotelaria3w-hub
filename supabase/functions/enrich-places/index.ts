// Edge Function: enriquece uma empresa com dados do Google Places (nova Places API).
// Recebe { cnpj }, monta a consulta a partir dos dados da empresa, chama o
// searchText do Google (telefone, site, rating, horário, localização) e faz
// upsert em empresa_enriquecimento (cache). A chave do Google fica em secret.
//
// Secrets necessários (supabase secrets set ...):
//   GOOGLE_PLACES_API_KEY   -> chave da Places API (New) do Google Cloud
//   SUPABASE_URL            -> injetado automaticamente
//   SUPABASE_SERVICE_ROLE_KEY -> injetado automaticamente
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.location",
  "places.regularOpeningHours",
].join(",");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const googleKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!googleKey) return json({ error: "GOOGLE_PLACES_API_KEY não configurada" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { cnpj } = await req.json();
    if (!cnpj) return json({ error: "cnpj é obrigatório" }, 400);

    // Dados da empresa para montar a consulta
    const { data: empresa, error: empErr } = await supabase
      .from("empresas")
      .select("cnpj, razao_social, nome_fantasia, logradouro, numero, bairro, municipio, uf")
      .eq("cnpj", cnpj)
      .maybeSingle();
    if (empErr) return json({ error: empErr.message }, 500);
    if (!empresa) return json({ error: "Empresa não encontrada" }, 404);

    const nome = empresa.nome_fantasia || empresa.razao_social || "";
    const textQuery = [
      nome, empresa.logradouro, empresa.numero, empresa.bairro,
      empresa.municipio, empresa.uf, "Brasil",
    ].filter(Boolean).join(" ");

    // Places API (New) - Text Search
    const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleKey,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
      },
      body: JSON.stringify({ textQuery, languageCode: "pt-BR", regionCode: "BR", maxResultCount: 1 }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return json({ error: `Google Places: ${resp.status}`, detail: txt }, 502);
    }

    const result = await resp.json();
    const place = result.places?.[0];
    if (!place) return json({ enriquecido: false, message: "Nenhum resultado no Google" }, 200);

    const enriquecimento = {
      cnpj: empresa.cnpj,
      fonte: "google_places",
      place_id: place.id ?? null,
      telefone: place.nationalPhoneNumber ?? null,
      site: place.websiteUri ?? null,
      rating: place.rating ?? null,
      total_avaliacoes: place.userRatingCount ?? null,
      horario_funcionamento: place.regularOpeningHours ?? null,
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
      endereco_google: place.formattedAddress ?? null,
      fetched_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabase
      .from("empresa_enriquecimento")
      .upsert(enriquecimento, { onConflict: "cnpj" });
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ enriquecido: true, dados: enriquecimento }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
