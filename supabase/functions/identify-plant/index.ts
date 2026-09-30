// Supabase Edge Function: identify-plant
// Déployable avec: supabase functions deploy identify-plant
// Secrets requis: PLANT_ID_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorise" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Utilisateur introuvable" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { imageBase64, latitude, longitude } = body;

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "Image requise (base64)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plantIdKey = Deno.env.get("PLANT_ID_API_KEY");
    if (!plantIdKey) {
      // Repli dev/mock si pas de clé configurée
      return new Response(JSON.stringify({
        plantId: "11111111-1111-1111-1111-111111111111",
        nomScientifique: "Monstera deliciosa",
        nomCommun: "Monstera",
        famille: "Araceae",
        toxicite: "orange",
        badgeRarete: "Commun",
        aPropos: "Plante tropicale populaire.",
        conseilsEntretien: {
          lumiere: "Lumière indirecte",
          sol: "Drainant",
          arrosage: "1x par semaine",
          multiplication: "Bouturage"
        },
        urlImage: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400",
        xpGagne: 25,
        confiance: 95
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Appel API Plant.id v3
    const plantIdRes = await fetch("https://plant.id/api/v3/identification", {
      method: "POST",
      headers: {
        "Api-Key": plantIdKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        images: [imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`],
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        similar_images: true,
      }),
    });

    const plantIdData = await plantIdRes.json();
    const bestSuggestion = plantIdData?.result?.classification?.suggestions?.[0];

    if (!bestSuggestion) {
      return new Response(JSON.stringify({ error: "Plante non reconnue" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nomScientifique = bestSuggestion.name;
    const nomCommun = bestSuggestion.details?.common_names?.[0] ?? nomScientifique;
    const famille = bestSuggestion.details?.taxonomy?.family ?? "Inconnue";
    const confiance = Math.round((bestSuggestion.probability ?? 0) * 100);

    // Upsert plant dans la base
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let { data: existingPlant } = await adminSupabase
      .from("plants")
      .select("id, badge_rarete")
      .eq("nom_scientifique", nomScientifique)
      .maybeSingle();

    let plantId = existingPlant?.id;
    let badgeRarete = existingPlant?.badge_rarete ?? "Commun";

    if (!plantId) {
      const { data: newPlant } = await adminSupabase
        .from("plants")
        .insert({
          nom_scientifique: nomScientifique,
          nom_commun: nomCommun,
          famille: famille,
          toxicite: "green",
          badge_rarete: "Commun",
          url_image: bestSuggestion.similar_images?.[0]?.url ?? null,
        })
        .select()
        .single();
      plantId = newPlant?.id;
    }

    // Logger le scan
    await adminSupabase.from("identification_logs").insert({
      user_id: user.id,
      plant_id: plantId,
      score_confiance: confiance,
      reussi: true,
    });

    return new Response(JSON.stringify({
      plantId,
      nomScientifique,
      nomCommun,
      famille,
      toxicite: "green",
      badgeRarete,
      aPropos: bestSuggestion.details?.description?.value ?? null,
      conseilsEntretien: {
        lumiere: bestSuggestion.details?.best_light_condition ?? "Lumière indirecte",
        sol: bestSuggestion.details?.best_soil_type ?? "Terreau riche",
        arrosage: bestSuggestion.details?.watering?.max ? `${bestSuggestion.details.watering.max} jours` : "Modéré",
        multiplication: "Bouturage"
      },
      urlImage: bestSuggestion.similar_images?.[0]?.url ?? null,
      xpGagne: badgeRarete === "Épique" ? 100 : badgeRarete === "Rare" ? 50 : 25,
      confiance,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
