import { assessToxicity, preserveToxicWarning, toxicityInstructions, enrichmentSchema } from "./toxicity.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const image=(value:string)=>{const m=value.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/s);if(!m)throw new Error("Image JPEG ou PNG invalide");return{mime:m[1],b64:m[2],blob:new Blob([Uint8Array.from(atob(m[2]),c=>c.charCodeAt(0))],{type:m[1]})}};
const geminiJson=(d:any)=>JSON.parse((d?.candidates?.[0]?.content?.parts??[]).map((p:any)=>p.text??"").join("").replace(/^```json\s*|\s*```$/g,""));
serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization");if(!auth)return reply({error:"Non autorisé"},401);
  const url=Deno.env.get("SUPABASE_URL")??"",anon=Deno.env.get("SUPABASE_ANON_KEY")??"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});const{data:{user}}=await client.auth.getUser();if(!user)return reply({error:"Utilisateur introuvable"},401);
  const{imageBase64,latitude,longitude}=await req.json();if(!imageBase64)return reply({error:"Image requise"},400);
  const pk=Deno.env.get("PLANTNET_API_KEY");if(!pk)return reply({error:"Clé Pl@ntNet absente"},503);
  const img=image(imageBase64),form=new FormData();form.append("images",img.blob,"plant.jpg");form.append("organs","auto");
  const q=new URLSearchParams({"api-key":pk,lang:"fr","include-related-images":"true"});if(typeof latitude==="number")q.set("lat",String(latitude));if(typeof longitude==="number")q.set("lon",String(longitude));
  const pr=await fetch(`https://my-api.plantnet.org/v2/identify/all?${q}`,{method:"POST",body:form}),pd=await pr.json();if(!pr.ok)return reply({error:pd?.message??"Pl@ntNet indisponible"},pr.status);
  const best=pd?.results?.[0];if(!best||(best.score??0)<.05)return reply({error:"Plante non reconnue"},422);
  const taxonomy={nomScientifique:best.species?.scientificNameWithoutAuthor??pd.bestMatch,nomCommun:best.species?.commonNames?.[0]??best.species?.scientificNameWithoutAuthor??pd.bestMatch,famille:best.species?.family?.scientificNameWithoutAuthor??"Inconnue"};
  let extra:any=null;const gk=Deno.env.get("GEMINI_API_KEY");
  if(gk){try{const prompt=`Tu es botaniste. Pl@ntNet propose: ${taxonomy.nomScientifique}, famille ${taxonomy.famille}, score d'identification ${best.score}. ${toxicityInstructions} Réponds uniquement avec le JSON demandé. aPropos et conseilsEntretien en français. La rareté décrit la disponibilité horticole générale. frequenceArrosageJours est l'intervalle conseillé entre deux arrosages, en jours.`;const gr=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gk}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt},{inline_data:{mime_type:img.mime,data:img.b64}}]}],generationConfig:{responseMimeType:"application/json",responseJsonSchema:enrichmentSchema,temperature:0}})});if(gr.ok)extra=geminiJson(await gr.json())??null}catch(e){console.warn(e)}}
  const photo=best.images?.[0]?.url?.m??best.images?.[0]?.url?.o??null;
  const admin=createClient(url,service);
  // limit(1) : maybeSingle() échouait dès qu'une espèce existait en double dans le catalogue.
  const{data:olds,error:readError}=await admin.from("plants").select("*").eq("nom_scientifique",taxonomy.nomScientifique).order("created_at").limit(1);if(readError)throw readError;
  const old=olds?.[0];let plantId=old?.id;
  // Sans réponse de Gemini, on ne réécrit pas la fiche existante : une panne ne doit ni
  // effacer la description ni remplacer la toxicité évaluée par « incertaine ».
  const enriched:Record<string,unknown>={};
  if(extra&&typeof extra==="object"){
   enriched.toxicite=preserveToxicWarning(old?.toxicite,assessToxicity(extra,best.score));
   enriched.toxicity_assessment={policyVersion:1,source:extra.toxicity?"gemini":null,classification:extra.toxicity??"uncertain",modelConfidence:typeof extra.toxicityConfidence==="number"?extra.toxicityConfidence:null,identificationScore:best.score,reason:extra.toxicityReason??null,assessedAt:new Date().toISOString()};
   if(["Commun","Rare","Épique"].includes(extra.badgeRarete))enriched.badge_rarete=extra.badgeRarete;
   if(typeof extra.aPropos==="string"&&extra.aPropos.trim())enriched.a_propos=extra.aPropos.trim();
   if(extra.conseilsEntretien&&typeof extra.conseilsEntretien==="object")enriched.conseils_entretien=extra.conseilsEntretien;
   const freq=Math.round(Number(extra.frequenceArrosageJours));if(freq>=1&&freq<=60)enriched.frequence_arrosage_jours=freq;
  }
  let row:any;
  if(plantId){const patch={...enriched,...(old.url_image?{}:{url_image:photo})};row={...old,...patch};if(Object.keys(patch).length){const{error}=await admin.from("plants").update(patch).eq("id",plantId);if(error)throw error}}
  else{const values={nom_scientifique:taxonomy.nomScientifique,nom_commun:taxonomy.nomCommun,famille:taxonomy.famille,url_image:photo,toxicite:"orange",...enriched};const{data,error}=await admin.from("plants").insert(values).select("*").single();if(error)throw error;plantId=data.id;row=data}
  const values={toxicite:row.toxicite??"orange",badge_rarete:row.badge_rarete??"Commun",a_propos:row.a_propos??null,conseils_entretien:row.conseils_entretien??null,url_image:row.url_image??photo};
  const confiance=Math.round((best.score??0)*100);const{error}=await admin.from("identification_logs").insert({user_id:user.id,plant_id:plantId,score_confiance:confiance,reussi:true});if(error)throw error;
  return reply({plantId,...taxonomy,toxicite:values.toxicite,badgeRarete:values.badge_rarete,aPropos:values.a_propos,conseilsEntretien:values.conseils_entretien,urlImage:values.url_image,xpGagne:values.badge_rarete==="Épique"?100:values.badge_rarete==="Rare"?50:25,confiance,sourceIdentification:"plantnet",sourceEnrichissement:enriched.a_propos?"gemini":null});
 }catch(e){console.error(e);return reply({error:e instanceof Error?e.message:"Erreur interne"},500)}
});
