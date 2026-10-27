#!/bin/sh
# Stop hook (.claude/settings.json): Claude cannot end a turn while app code it changed fails the checks.
# Skips instantly when src/ and proxy.ts match the last commit. Exit 2 = block, output goes back to Claude.
cd "$(dirname "$0")/.." || exit 0
if [ -z "$(git status --porcelain -- src proxy.ts 2>/dev/null)" ]; then
  exit 0
fi
out=$(mktemp)
if ! bunx tsc --noEmit >"$out" 2>&1; then
  echo "Typecheck failed (bunx tsc --noEmit):" >&2; tail -20 "$out" >&2; rm -f "$out"; exit 2
fi
if ! bun run lint >"$out" 2>&1; then
  echo "Lint has errors (bun run lint):" >&2; grep -B1 " error " "$out" | tail -20 >&2; rm -f "$out"; exit 2
fi
if ! bun test >"$out" 2>&1; then
  echo "Tests failed (bun test):" >&2; grep -E "fail|error|Expected|Received" "$out" | tail -20 >&2; rm -f "$out"; exit 2
fi
rm -f "$out"
exit 0
