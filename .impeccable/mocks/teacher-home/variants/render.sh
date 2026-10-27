#!/bin/sh
# Render every built direction to .impeccable/review/v7 and run the slop detector from the project root
# (so .impeccable/config.json suppressions apply).
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT" || exit 1
M=.impeccable/mocks/teacher-home
H=~/Library/Caches/ms-playwright/chromium_headless_shell-1194/chrome-mac/headless_shell
for id in plat vif tonal bento neo verre edito mono sombre soie dunes jardin; do
  f="$M/studio-$id-desktop.html"
  [ -f "$f" ] || continue
  "$H" --headless --hide-scrollbars --virtual-time-budget=10000 --window-size=1440,1600 \
    --screenshot="$ROOT/.impeccable/review/v7/$id.png" "file://$ROOT/$f" 2>/dev/null
  printf '%s ' "$id"; ~/.claude/skills/impeccable/scripts/impeccable detect --json "$f" | tr -d '\n '; echo
done
