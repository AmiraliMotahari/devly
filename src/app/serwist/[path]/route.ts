import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createSerwistRoute } from "@serwist/turbopack";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..", "..", "..");

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
  crypto.randomUUID();

const defs = readFileSync(resolve(root, "src/tools/definitions.ts"), "utf8");
const slugs = [...defs.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
const additionalPrecacheEntries = [
  { url: "/~offline", revision },
  { url: "/", revision },
  ...slugs.map((slug) => ({ url: `/tools/${slug}`, revision })),
];

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries,
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
  });
