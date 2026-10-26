#!/usr/bin/env bash
# Tests unitaires des Edge Functions (node:test). Compilés par esbuild, car le Node du
# système n'a pas forcément le support TypeScript intégré.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
for test in supabase/functions/*/*.test.ts; do
  name=$(basename "$(dirname "$test")")-$(basename "$test" .ts)
  node_modules/.bin/esbuild "$test" --bundle --platform=node --format=esm --outfile="$out/$name.mjs" --log-level=error
done
node --test "$out"/*.mjs
