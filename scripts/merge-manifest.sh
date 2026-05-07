#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAN="${ROOT}/dist/chromium/manifest.json"
FRAG="${ROOT}/manifest.fragment.json"

if [[ ! -f "$MAN" ]]; then
  echo "merge-manifest: missing $MAN — run 'cargo oxichrome build' first." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "merge-manifest: jq is required (brew install jq)." >&2
  exit 1
fi

tmp="$(mktemp)"
jq -s '.[0] * .[1]' "$MAN" "$FRAG" >"$tmp"
mv "$tmp" "$MAN"
echo "merge-manifest: merged host_permissions + content_scripts into $MAN"
