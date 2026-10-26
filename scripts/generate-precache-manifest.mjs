import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Extract slugs from definitions.ts (simple regex, no TS parsing needed).
const defs = readFileSync(resolve(root, "src/tools/definitions.ts"), "utf8");
const slugs = [...defs.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);

const urls = ["/", "/tools", "/offline", "/manifest.webmanifest"];
for (const slug of slugs) {
  urls.push(`/tools/${slug}`);
}

// Also add _next static assets — these are discovered at runtime from the HTML,
// so we only list route URLs here.
writeFileSync(
  resolve(root, "public/precache-manifest.json"),
  JSON.stringify({ urls, generated: new Date().toISOString() }, null, 2),
);
console.log(`Generated precache manifest: ${urls.length} URLs`);
