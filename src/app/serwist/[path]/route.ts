import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createSerwistRoute } from "@serwist/turbopack";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..", "..", "..");


const defs = readFileSync(resolve(root, "src/tools/definitions.ts"), "utf8");
const slugs = [...defs.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);

const additionalPrecacheEntries = [
  "/",
  "/tools",
  "/about",
  "/privacy",
  "/~offline",
  ...["images", "pdf", "files", "developer", "text", "data", "web", "colors", "datetime", "converters"].map((c) => `/category/${c}`),
  ...slugs.map((slug) => `/tools/${slug}`),
];

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries,
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
  });
