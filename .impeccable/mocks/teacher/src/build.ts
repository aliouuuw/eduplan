// Builds the teacher screen mocks: src/<page>.html + app.css + the dock -> ../<page>.html (self-contained).
// In a page: {{HEAD}} in <head>, {{DOCK:<item>}} where the dock goes (item = accueil|classes|notes|presences|agenda).
// Usage: bun build.ts
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = import.meta.dir;
const app = readFileSync(join(dir, "app.css"), "utf8");
const icons: Record<string, string> = {
  accueil: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  classes: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M8 9.5h8M8 13.5h5"/>',
  notes: '<path d="M7 3.5h7.5L19 8v12.5H7z"/><path d="M10 13h6M10 16.5h4"/>',
  presences: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c.8-3.6 3.4-5.5 6.5-5.5 1.6 0 3 .5 4.1 1.4M15 18l2 2 4-4.5"/>',
  agenda: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
};
const labels: Record<string, string> = { accueil: "Accueil", classes: "Classes", notes: "Notes", presences: "Présences", agenda: "Agenda" };
const dock = (active: string) =>
  `<nav class="dock" aria-label="Navigation"><div class="brand">e</div>${Object.keys(icons)
    .map((k) => `<a class="nav-item${k === active ? " is-active" : ""}" href="#"${k === active ? ' aria-current="page"' : ""}><span class="nav-ic"><svg viewBox="0 0 24 24">${icons[k]}</svg></span>${labels[k]}</a>`)
    .join("")}<div class="dock-end"><svg viewBox="0 0 24 24" aria-label="Notifications"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4"/></svg><span class="avatar">AD</span></div></nav>`;
const head = `<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=ranade@400,500,700&display=swap">\n<style>\n${app}</style>`;

const pages = readdirSync(dir).filter((f) => f.endsWith(".html"));
for (const f of pages) {
  const html = readFileSync(join(dir, f), "utf8")
    .replace("{{HEAD}}", head)
    .replace(/\{\{DOCK:(\w+)\}\}/, (_, k) => dock(k));
  writeFileSync(join(dir, "..", f), html);
}
console.log("built", pages.join(", "));
