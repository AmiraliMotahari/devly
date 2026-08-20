import { siteUrl } from "@/lib/constants";
import { TOOL_CATEGORIES, toolDefinitions } from "@/tools";

import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const categories = TOOL_CATEGORIES.map((cat) => ({
    url: new URL(`/category/${cat}`, siteUrl).toString(),
    changeFrequency: "monthly",
    priority: 0.8,
  })) satisfies MetadataRoute.Sitemap;

  const tools = toolDefinitions.map((tool) => ({
    url: new URL(`/tools/${tool.slug}`, siteUrl).toString(),
    changeFrequency: "monthly",
    priority: 0.7,
  })) satisfies MetadataRoute.Sitemap;

  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/about`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/category`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/tools`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...categories,
    ...tools,
  ];
}
