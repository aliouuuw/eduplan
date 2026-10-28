import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'bun:test';

// CLAUDE.md: design-system components use tokens, never raw hex. Palette changes then live in globals.css only.
test('ui and layout components use colour tokens, not raw hex', () => {
  const dirs = [import.meta.dirname, join(import.meta.dirname, '..', 'layout')];
  const offenders: string[] = [];
  for (const dir of dirs) {
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.tsx'))) {
      const src = readFileSync(join(dir, f), 'utf8');
      for (const m of src.matchAll(/-\[#[0-9a-fA-F]{3,8}/g)) offenders.push(`${f}: ${m[0]}`);
    }
  }
  expect(offenders).toEqual([]);
});
