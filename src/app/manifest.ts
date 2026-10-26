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
    dir: "ltr",
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
        purpose: "any",
      },
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
        purpose: "any",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/opengraph-image.jpeg",
        sizes: "1200x630",
        type: "image/jpeg",
        form_factor: "wide",
        label: "Devly home page",
      },
    ],
    shortcuts: [
      {
        name: "Advanced Image Editor",
        short_name: "Image Editor",
        url: "/tools/advanced-image-editor",
        icons: [
          {
            src: "/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "Merge PDF",
        short_name: "Merge PDF",
        url: "/tools/merge-pdf",
        icons: [
          {
            src: "/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "JSON Formatter",
        short_name: "JSON",
        url: "/tools/json-formatter",
        icons: [
          {
            src: "/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "QR Code Generator",
        short_name: "QR Code",
        url: "/tools/qr-code-generator",
        icons: [
          {
            src: "/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "Currency Converter",
        short_name: "Currency",
        url: "/tools/currency-converter",
        icons: [
          {
            src: "/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
};

export default manifest;
