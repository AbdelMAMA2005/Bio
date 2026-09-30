// Supabase Edge Function: diagnose-health
// Déployable avec: supabase functions deploy diagnose-health
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
    const { collectionId, imageBase64 } = body;

    if (!collectionId) {
      return new Response(JSON.stringify({ error: "collectionId requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plantIdKey = Deno.env.get("PLANT_ID_API_KEY");
    let resultDiagnosis = {
      isHealthy: true,
      diseaseName: null as string | null,
      confidence: 96,
      treatment: null as any,
      description: null as string | null,
    };

    if (plantIdKey && imageBase64) {
      const plantHealthRes = await fetch("https://plant.id/api/v3/health_assessment", {
        method: "POST",
        headers: {
          "Api-Key": plantIdKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: [imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`],
          disease_details: ["description", "treatment"],
        }),
      });

      const healthData = await plantHealthRes.json();
      const isHealthy = healthData?.result?.is_healthy?.binary ?? true;
      const topDisease = healthData?.result?.disease?.suggestions?.[0];

      resultDiagnosis = {
        isHealthy,
        diseaseName: isHealthy ? null : (topDisease?.name ?? "Maladie non specifiee"),
        confidence: Math.round((topDisease?.probability ?? (healthData?.result?.is_healthy?.probability ?? 0.95)) * 100),
        treatment: topDisease?.details?.treatment ?? null,
        description: topDisease?.details?.description ?? null,
      };
    }

    // Sauvegarder dans la table collection
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const savedDiag = {
      maladieNom: resultDiagnosis.diseaseName,
      scoreGlobal: resultDiagnosis.confidence,
      traitement: resultDiagnosis.treatment,
      description: resultDiagnosis.description,
      estSain: resultDiagnosis.isHealthy,
      dateDiagnostic: new Date().toISOString(),
    };

    await adminSupabase
      .from("collection")
      .update({
        etat_sante: resultDiagnosis.isHealthy ? "green" : "red",
        dernier_diagnostic: savedDiag,
      })
      .eq("id", collectionId)
      .eq("user_id", user.id);

    return new Response(JSON.stringify(savedDiag), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
