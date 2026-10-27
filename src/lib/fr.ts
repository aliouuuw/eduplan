// French typography for UI copy (D16: speak the school's own language).

const NNBSP = " "; // espace fine insécable

/** "3ème B" -> "3ᵉ B", "1ère S" -> "1ʳᵉ S", "2nde A" -> "2ᵈᵉ A" (superscript abbreviations, Imprimerie nationale). */
export function classLabel(name: string): string {
  return name
    .replace(/\b1(?:ère|ere|re)\b/g, "1ʳᵉ")
    .replace(/\b(\d+)(?:nde|de)\b/g, "$1ᵈᵉ")
    .replace(/\b(\d+)(?:ème|eme|e)\b/g, "$1ᵉ");
}

/** Thin no-break space before ; : ! ? » and after «, so the mark never wraps to a new line. */
export function frSpaces(text: string): string {
  return text
    .replace(/ ?([;:!?»])/g, (m, mark: string, offset: number, all: string) =>
      // leave times (10:00) and URLs (https://) alone: only add the space after a word or a closing mark
      mark === ":" && /\d$/.test(all.slice(0, offset)) ? m : `${NNBSP}${mark}`)
    .replace(/« ?/g, `«${NNBSP}`);
}
