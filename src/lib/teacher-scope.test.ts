import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'bun:test';
import { PgDialect } from 'drizzle-orm/pg-core';
import { activeTeacher } from './teacher-scope';

test('activeTeacher excludes soft-deleted accounts', () => {
  const { sql } = new PgDialect().sqlToQuery(activeTeacher());
  expect(sql).toContain('"role" = $1');
  expect(sql).toContain('"deleted_at" is null');
});

test('no query selects teachers without the soft-delete filter', () => {
  const out = Bun.spawnSync(['grep', '-rln', "eq(users.role, 'teacher')", join(import.meta.dirname, '..')]).stdout.toString();
  const offenders = out.split('\n').filter((f) => f && !f.endsWith('teacher-scope.ts') && !f.endsWith('.test.ts'));
  expect(offenders).toEqual([]);
});
