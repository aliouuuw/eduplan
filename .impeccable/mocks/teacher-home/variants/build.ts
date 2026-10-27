// Builds the A+ Plat vif home mock (D32): base.html + structure.css + plat.css + vif.css -> ../studio-vif-desktop.html.
// The other soft UI directions explored before D32 are in git history (STUDIO_VARIANTS_PLAN.md).
// Usage: bun build.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = import.meta.dir;
const read = (f: string) => readFileSync(join(dir, f), "utf8");
const css = `${read("structure.css")}\n/* A+ · Plat vif */\n${read("plat.css")}\n${read("vif.css")}`;
const html = read("base.html").replace("{{NAME}}", "A+ · Plat vif").replace("{{FONTS}}", "").replace("{{CSS}}", css);
writeFileSync(join(dir, "..", "studio-vif-desktop.html"), html);
console.log("built studio-vif-desktop.html");
