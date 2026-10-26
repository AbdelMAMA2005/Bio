#!/usr/bin/env bash
# Lance les tests SQL (supabase/tests/*.sql) sur un PostgreSQL 16 jetable (Docker) :
# simulation Supabase, schéma de base, puis toutes les migrations dans l'ordre.
# Usage : ./scripts/tests_sql.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

NAME=planai-tests-sql
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=tests postgres:16 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1' EXIT
until docker exec "$NAME" pg_isready -q -U postgres; do sleep 1; done
sleep 2

psql_test() { docker exec -i "$NAME" psql -v ON_ERROR_STOP=1 -q -X -U postgres "$@"; }

psql_test < supabase/tests/support/supabase_shim.sql >/dev/null
psql_test < schema_supabase.sql >/dev/null 2>&1
for migration in supabase/migrations/*.sql; do
  psql_test < "$migration" >/dev/null 2>&1 || { echo "ÉCHEC de la migration $migration"; psql_test < "$migration"; exit 1; }
done

status=0
for test in supabase/tests/*.sql; do
  if output=$(psql_test < "$test" 2>&1); then
    echo "ok    $(basename "$test")"
  else
    echo "ÉCHEC $(basename "$test")"; echo "$output" | grep -E "ERROR|ÉCHEC" | sed 's/^/      /'
    status=1
  fi
done
exit $status
