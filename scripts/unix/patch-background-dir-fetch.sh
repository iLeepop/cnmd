#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${ROOT}/dist/chromium/background.js"
PRELUDE="${ROOT}/scripts/sw-fetch-prelude.js"

if [[ ! -f "$OUT" ]]; then
  echo "patch-background-dir-fetch: missing $OUT — run 'cargo oxichrome build' first." >&2
  exit 1
fi
if [[ ! -f "$PRELUDE" ]]; then
  echo "patch-background-dir-fetch: missing $PRELUDE" >&2
  exit 1
fi

tmp="$(mktemp)"
{
  cat "$PRELUDE"
  printf "\n"
  cat "$OUT"
} >"$tmp"
mv "$tmp" "$OUT"
echo "patch-background-dir-fetch: prepended CNMD_FETCH_FILE listener to $OUT"
