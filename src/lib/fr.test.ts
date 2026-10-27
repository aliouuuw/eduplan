import { expect, test } from "bun:test";
import { classLabel, frSpaces } from "./fr";

test("class names use French superscript ordinals", () => {
  expect(classLabel("3ème B")).toBe("3ᵉ B");
  expect(classLabel("6ème A · Soutien")).toBe("6ᵉ A · Soutien");
  expect(classLabel("1ère S")).toBe("1ʳᵉ S");
  expect(classLabel("2nde A")).toBe("2ᵈᵉ A");
  expect(classLabel("Terminale L")).toBe("Terminale L");
});

test("high punctuation gets a thin no-break space, times stay intact", () => {
  expect(frSpaces("Échéance : 11 décembre")).toBe("Échéance : 11 décembre");
  expect(frSpaces("Prêt ?")).toBe("Prêt ?");
  expect(frSpaces("« Bravo »")).toBe("« Bravo »");
  expect(frSpaces("En cours depuis 10:00")).toBe("En cours depuis 10:00");
});
