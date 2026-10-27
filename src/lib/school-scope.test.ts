import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'bun:test';
import { schoolScopeFor } from './school-scope';

test('only a superadmin can reach another school', () => {
  expect(schoolScopeFor({ role: 'superadmin', schoolId: null }, 'thies')).toBe('thies');
  expect(schoolScopeFor({ role: 'admin', schoolId: 'dakar' }, 'thies')).toBeNull();
  expect(schoolScopeFor({ role: 'admin', schoolId: 'dakar' }, 'dakar')).toBe('dakar');
  expect(schoolScopeFor({ role: 'admin', schoolId: 'dakar' })).toBe('dakar');
  expect(schoolScopeFor({ role: 'teacher', schoolId: null })).toBeNull();
});

test('no API route falls back from a requested schoolId to the session school', () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'route.ts' && /get\('schoolId'\)\s*\|\||requestedSchoolId\s*\|\|/.test(readFileSync(p, 'utf8'))) offenders.push(p);
    }
  };
  walk(join(import.meta.dirname, '..', 'app', 'api'));
  expect(offenders).toEqual([]);
});
