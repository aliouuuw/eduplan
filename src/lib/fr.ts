// French typography for UI copy (D16: speak the school's own language).

const NNBSP = " "; // espace fine insécable

/** "3ème B" -> "3ᵉ B", "1ère S" -> "1ʳᵉ S", "2nde A" -> "2ᵈᵉ A" (superscript abbreviations, Imprimerie nationale). */
export function classLabel(name: string): string {
  return name
    .replace(/\b1(?:ère|ere|re)\b/g, "1ʳᵉ")
    .replace(/\b(\d+)(?:nde|de)\b/g, "$1ᵈᵉ")
    .replace(/\b(\d+)(?:ème|eme|e)\b/g, "$1ᵉ");
}

/**
 * Thin no-break space before ; : ! ? » and after «, so the mark never wraps to a new line.
 * Idempotent. Leaves URLs and times (10:00) untouched.
 */
export function frSpaces(text: string): string {
  const urls: string[] = [];
  const guarded = text.replace(/\b(?:https?:\/\/|www\.)\S+/g, (u) => `\u0000${urls.push(u) - 1}\u0000`);
  const spaced = guarded
    .replace(/([ \u00A0\u202F]?)([;:!?»])/g, (m, space: string, mark: string, offset: number, all: string) => {
      const before = all[offset - 1];
      const after = all[offset + m.length];
      if (!space && mark === ":" && /\d/.test(before ?? "") && /\d/.test(after ?? "")) return m; // 10:00
      if (!space && (before === undefined || /\s/.test(before))) return m; // nothing to attach to
      return `${NNBSP}${mark}`;
    })
    .replace(/«[ \u00A0\u202F]?/g, `«${NNBSP}`);
  return spaced.replace(/\u0000(\d+)\u0000/g, (_, i: string) => urls[Number(i)]);
}

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Dakar" });

/** "26 oct. 2026". Dakar time (UTC+0), so a date never shifts by a day between server and screen. */
export function formatDay(date: Date): string {
  return DAY.format(date);
}
