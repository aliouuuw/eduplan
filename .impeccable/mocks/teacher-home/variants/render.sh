#!/bin/sh
# Renders the A+ home mock to .impeccable/review/vif.png and runs the slop detector from the project root.
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT" || exit 1
f=.impeccable/mocks/teacher-home/studio-vif-desktop.html
~/Library/Caches/ms-playwright/chromium_headless_shell-1194/chrome-mac/headless_shell --headless --hide-scrollbars \
  --virtual-time-budget=10000 --window-size=1440,1400 --screenshot="$ROOT/.impeccable/review/vif.png" "file://$ROOT/$f" 2>/dev/null
~/.claude/skills/impeccable/scripts/impeccable detect --json "$f"
