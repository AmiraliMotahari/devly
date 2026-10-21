import { appName } from "@/lib/constants";
import type { MetadataRoute } from "next";

const manifest = (): MetadataRoute.Manifest => {
  return {
    name: appName,
    short_name: appName,
    description:
      "A single place for file, media, developer, data, text, PDF and general-purpose utilities. Most tools run entirely in your browser.",
    id: "/",
    start_url: "/",
    scope: "/",
    lang: "en",
    categories: ["utilities", "productivity"],
    theme_color: "#09111e",
    background_color: "#09111e",
    display: "standalone",
    orientation: "any",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
};

export default manifest;
