// Downloads the Ranade variable font for next/font/local.
// The ITF Free Font License allows self-hosting for our own app but forbids redistributing the
// file from a public repository, so the .woff2 is gitignored and fetched from Fontshare instead.
// Usage: bun run fonts  (also runs before dev and build)
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "app", "fonts", "ranade-variable.woff2");

if (existsSync(out)) process.exit(0);

const css = await (await fetch("https://api.fontshare.com/v2/css?f[]=ranade@1&display=swap")).text();
const url = css.match(/url\('(\/\/cdn\.fontshare\.com\/[^']+\.woff2)'\)/)?.[1];
if (!url) throw new Error("Ranade: no woff2 URL in the Fontshare CSS response");

const res = await fetch(`https:${url}`);
if (!res.ok) throw new Error(`Ranade: download failed with HTTP ${res.status}`);
mkdirSync(join(out, ".."), { recursive: true });
writeFileSync(out, new Uint8Array(await res.arrayBuffer()));
console.log("Ranade variable font saved to", out);
