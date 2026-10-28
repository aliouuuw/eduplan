// Which school a request may act on. A superadmin may pick any school; everyone else only gets their own,
// and asking for another school returns null (answer 403). Never write `requested || user.schoolId`.
export function schoolScopeFor(
  user: { role: string; schoolId?: string | null },
  requested?: string | null
): string | null {
  if (user.role === 'superadmin') return requested || user.schoolId || null;
  if (requested && requested !== user.schoolId) return null;
  return user.schoolId ?? null;
}
