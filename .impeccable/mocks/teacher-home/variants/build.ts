// Builds one self-contained mock per direction: base.html + structure.css + <name>.css.
// Usage: bun build.ts   (run from anywhere)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = import.meta.dir;
const out = join(dir, "..");
const read = (f: string) => readFileSync(join(dir, f), "utf8");

export const directions = [
  { id: "plat", name: "A · Plat pastel", how: "Cartes blanches sans bordure sur un fond teinté, deux accents, capsules." },
  { id: "tonal", name: "B · Tonal", how: "Pas de cartes blanches : chaque module est un conteneur teinté, la hiérarchie vient des tons." },
  { id: "bento", name: "C · Bento doux", how: "Des tuiles de tailles différentes dans une grille serrée, un grand chiffre ou un dessin par tuile." },
  { id: "neo", name: "D · Néomorphisme léger", how: "Une seule surface, relief par deux ombres (claire en haut, sombre en bas), éléments choisis enfoncés." },
  { id: "verre", name: "F · Verre dépoli", how: "Panneaux translucides floutés sur un champ de couleur peint et grainé." },
  { id: "edito", name: "G · Éditorial doux", how: "Presque pas de conteneurs : papier, typographie et espace portent la hiérarchie." },
];

export const round2 = [
  { id: "mono", name: "H · Mono verre", how: "Verre dépoli + MonoCode : coque neutre, carte workspace inset, traits fins, system-ui." },
  { id: "sombre", name: "I · Mono sombre", how: "Même coque inset que H, thème sombre MonoCode : shell #0d0d0d, panneau #141414, encre claire." },
];

const base = read("base.html");
const structure = read("structure.css");

const emit = (list: typeof directions, compareName: string, compareTitle: string, compareLead: string) => {
  const items = list.filter((d) => existsSync(join(dir, `${d.id}.css`)));
  for (const d of items) {
    const css = ("extends" in d && d.extends ? `${read(`${d.extends}.css`)}\n` : "") + read(`${d.id}.css`);
    const fonts = (css.match(/^\/\* fonts: (.+?) \*\//)?.[1] ?? "")
      .split(/\s+/).filter(Boolean)
      .map((u) => `<link rel="stylesheet" href="${u}">`).join("\n");
    const html = base
      .replace("{{NAME}}", d.name)
      .replace("{{FONTS}}", fonts)
      .replace("{{CSS}}", `${structure}\n/* ${d.name} */\n${css}`);
    writeFileSync(join(out, `studio-${d.id}-desktop.html`), html);
  }
  const frames = items
    .map(
      (d) =>
        `<section><h2>${d.name}</h2><p>${d.how}</p><a href="studio-${d.id}-desktop.html" target="_blank">Ouvrir en grand</a><div class="f"><iframe src="studio-${d.id}-desktop.html" title="${d.name}" loading="lazy"></iframe></div></section>`,
    )
    .join("\n");
  writeFileSync(
    join(out, compareName),
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>EduPlan · ${compareTitle}</title>
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=ranade@400,500,700&display=swap">
<style>*{box-sizing:border-box;margin:0}body{font:15px/1.5 "Ranade",system-ui,sans-serif;background:#f3f2f7;color:#24212f;padding:40px}
h1{font-size:28px;font-weight:500;letter-spacing:-.02em}header p{color:#55516a;margin:6px 0 32px;max-width:760px}
main{display:grid;grid-template-columns:repeat(2,1fr);gap:32px}section{background:#fff;border-radius:24px;padding:24px}
h2{font-size:18px;font-weight:500}section p{color:#55516a;font-size:14px;margin:4px 0 8px;min-height:42px}section a{font-size:14px;font-weight:500;color:#5a47c7}
.f{margin-top:12px;width:100%;aspect-ratio:1440/1460;overflow:hidden;border-radius:14px;position:relative}
.f iframe{position:absolute;top:0;left:0;width:1440px;height:1460px;border:0;transform-origin:0 0;transform:scale(var(--s,.45))}
</style></head><body><header><h1>${compareTitle}</h1><p>${compareLead}</p></header>
<main>${frames}</main>
<p style="margin-top:28px;font-size:14px;display:flex;gap:18px"><a href="variantes.html">Round 1</a><a href="variantes-round2.html">Round 2</a><a href="variantes-fonds.html">Fonds (test)</a><a href="variantes-plat.html">A et A+</a></p>
<script>const fit=()=>document.querySelectorAll('.f').forEach(f=>f.style.setProperty('--s',f.clientWidth/1440));addEventListener('resize',fit);fit();</script>
</body></html>`,
  );
  return items;
};

const plat = emit(
  [
    { id: "plat", name: "A · Plat pastel", how: "Le A d'origine (round 8)." },
    { id: "vif", extends: "plat", name: "A+ · Plat vif", how: "Le même monde, plus net et plus vivant : dégradés sur ce qui porte un sens, lueurs teintées, une animation de remplissage." },
  ] as typeof directions,
  "variantes-plat.html",
  "Studio · A et A+",
  "A+ garde le monde de A (feuilles blanches, brume lavande, corail = maintenant, lavande = progrès, Ranade) et le rend plus frais.",
);
const built = emit(
  directions,
  "variantes.html",
  "Studio · six façons d'être « soft »",
  "Même page, même contenu, même ordre des modules. Seuls la surface, le relief, la forme, la logique de couleur et les repères changent.",
);
const blended = emit(
  round2,
  "variantes-round2.html",
  "Studio · round 2 (mélanges)",
  "Round 1 retenu : A, F, G. Round 2 : H Mono verre (clair) et I Mono sombre. Même coque inset, deux thèmes MonoCode.",
);
// Scene tests: the F glass (verre.css + glass.css) over authored backdrops.
// soie.jpg and dunes.jpg come from render_fields.py (2880 x 3200, 2x). nature.jpg is a 1280 x 720 painting,
// so it is used as a top band that fades into its own sampled tone (render_fields.py prints it).
const glass = `${read("verre.css")}\n${read("glass.css")}`;
const fade = "linear-gradient(180deg,#000 0%,#000 50%,rgba(0,0,0,.92) 57%,rgba(0,0,0,.8) 63%,rgba(0,0,0,.64) 69%,rgba(0,0,0,.47) 75%,rgba(0,0,0,.31) 81%,rgba(0,0,0,.18) 87%,rgba(0,0,0,.08) 93%,rgba(0,0,0,.02) 97%,transparent 100%)";
const scenes = [
  { id: "soie", name: "J · Verre sur soie", how: "Soie pliée rendue sur mesure, une seule famille teal, reflets chauds. Le verre a de vrais plis à flouter.",
    vars: `--scene-img:url("backgrounds/soie.jpg");--scene-h:1600px;--scene-base:#123a3d;--scene-deep:#0d2c2f` },
  { id: "dunes", name: "K · Verre sur dunes", how: "Dunes vues d'en haut, lumière rasante, sable et terre cuite. Chaud, minéral, calme.",
    vars: `--scene-img:url("backgrounds/dunes.jpg");--scene-h:1600px;--scene-base:#7a432e;--scene-deep:#5a3123` },
  { id: "jardin", name: "L · Verre sur jardin", how: "Jardin côtier peint en bandeau ; il se fond dans sa propre teinte, sans couture.",
    vars: `--scene-img:url("backgrounds/nature.jpg");--scene-h:920px;--scene-mask:${fade};--scene-base:#2b3324;--scene-deep:#172017` },
];
for (const sc of scenes) writeFileSync(join(dir, `${sc.id}.css`), `${glass}\n/* scene */\n:root{${sc.vars}}\n`);
const painted = emit(
  [{ id: "verre", name: "F · Verre dépoli", how: "Le F d'origine : champ peint teal vers sable, grain." }, ...scenes],
  "variantes-fonds.html",
  "Studio · F avec des fonds",
  "Même contenu, même verre vivant (teinte légère, reflet, bord lumineux, dock flottant). Seul le fond change. Test, pas une direction retenue.",
);
console.log(
  "round1",
  built.map((d) => d.id).join(", "),
  "| round2",
  blended.map((d) => d.id).join(", "),
  "| fonds",
  painted.map((d) => d.id).join(", "),
);
