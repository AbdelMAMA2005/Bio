#!/usr/bin/env bash
# Contrôle de sécurité de la production, vu de l'extérieur : uniquement avec la clé
# publique (celle livrée dans l'app), comme le ferait n'importe qui.
# Usage : ./scripts/verifier_prod.sh   (variables SUPABASE_URL / SUPABASE_ANON_KEY optionnelles)
set -uo pipefail

URL="${SUPABASE_URL:-https://fzllbtkjpwhadkdragno.supabase.co}"
KEY="${SUPABASE_ANON_KEY:-sb_publishable_LF3NdZ7ly02PSE4qapImSg_OAmUZ_Ga}"
fail=0
ok()   { echo "ok    $*"; }
ko()   { echo "ÉCHEC $*"; fail=1; }
code() { curl -s -o /dev/null -w '%{http_code}' -H "apikey: $KEY" "$@"; }

echo "== Données inaccessibles sans connexion"
for table in profiles plants collection posts comments likes stories story_views story_likes \
             conversations messages reminders identification_logs quests quest_progress reports \
             feature_flags device_tokens admin_audit_logs app_feedback collection_xp_credits; do
  c=$(code "$URL/rest/v1/$table?select=*&limit=1")
  [ "$c" = 200 ] && ko "table $table lisible sans connexion" || ok "table $table fermée ($c)"
done

echo "== Fonctions inaccessibles sans connexion"
while read -r rpc args; do
  c=$(code -X POST -H 'Content-Type: application/json' "$URL/rest/v1/rpc/$rpc" -d "$args")
  case "$c" in 401|403) ok "rpc $rpc fermée ($c)";; 404) ko "rpc $rpc absente (migration non appliquée ?)";; *) ko "rpc $rpc exécutable sans connexion ($c)";; esac
done <<'RPC'
get_user_stats {"uid":"00000000-0000-0000-0000-000000000000"}
get_daily_quests {}
get_my_badges {}
admin_me {}
admin_stats {}
report_content {"p_target_type":"post","p_target_id":"00000000-0000-0000-0000-000000000000","p_motif":"x"}
delete_my_account {}
RPC

echo "== Edge Functions déployées"
for fn in identify-plant diagnose-health send-feedback admin-status; do
  c=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "$URL/functions/v1/$fn")
  [ "$c" = 200 ] && ok "$fn répond" || ko "$fn ne répond pas ($c)"
  c=$(code -X POST -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' "$URL/functions/v1/$fn" -d '{}')
  case "$c" in 401|403) ok "$fn refuse un appel sans session ($c)";; *) ko "$fn accepte un appel sans session ($c)";; esac
done

echo "== Authentification"
settings=$(curl -s -H "apikey: $KEY" "$URL/auth/v1/settings")
echo "$settings" | grep -q '"google":true' && ok "connexion Google active" || ko "connexion Google inactive"
echo "$settings" | grep -q '"mailer_autoconfirm":true' \
  && echo "info  e-mails non vérifiés à l'inscription (mailer_autoconfirm)" \
  || ok "vérification de l'e-mail à l'inscription"

exit $fail
