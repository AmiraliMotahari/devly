import { appName } from "@/lib/constants";
import type { MetadataRoute } from "next";

const manifest = (): MetadataRoute.Manifest => {
  return {
    name: appName,
    short_name: appName,
    theme_color: "#09111e",
    background_color: "#09111e",
    display: "standalone",
    orientation: "portrait",
    icons: [
      {
        src: "/images/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/images/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
};

export default manifest;
