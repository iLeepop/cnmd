#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$ROOT/scripts/embed_md_viewer_css.py"
cargo oxichrome build && "$ROOT/scripts/merge-manifest.sh"