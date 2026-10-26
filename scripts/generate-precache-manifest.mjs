import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const defs = readFileSync(resolve(root, "src/tools/definitions.ts"), "utf8");
const slugs = [...defs.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);

const urls = ["/", "/tools", "/offline", "/manifest.webmanifest"];
for (const slug of slugs) {
  urls.push(`/tools/${slug}`);
}

// Include all JS chunks from the build output for offline tool loading.
const chunksDir = resolve(root, ".next/static/chunks");
if (existsSync(chunksDir)) {
  const chunkFiles = readdirSync(chunksDir).filter((f) => f.endsWith(".js"));
  for (const f of chunkFiles) {
    urls.push(`/_next/static/chunks/${f}`);
  }
  console.log(`  + ${chunkFiles.length} chunk files`);
}

// Include CSS files.
const cssDir = resolve(root, ".next/static/css");
if (existsSync(cssDir)) {
  const cssFiles = readdirSync(cssDir).filter((f) => f.endsWith(".css"));
  for (const f of cssFiles) {
    urls.push(`/_next/static/css/${f}`);
  }
  console.log(`  + ${cssFiles.length} CSS files`);
}

writeFileSync(
  resolve(root, "public/precache-manifest.json"),
  JSON.stringify({ urls, generated: new Date().toISOString() }, null, 2),
);
console.log(`Generated precache manifest: ${urls.length} URLs total`);
