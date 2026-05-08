#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
(cd "$ROOT/vue-md-viewer" && npm run build:extension)
cargo oxichrome build && "$ROOT/scripts/unix/merge-manifest.sh" && bash "$ROOT/scripts/unix/patch-background-dir-fetch.sh"
