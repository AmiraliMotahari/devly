import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ToolShell } from "@/components/tool-shell";
import { RelatedTools } from "@/components/related-tools";
import { ToolLoader } from "@/components/tool-loader";
import { getToolBySlug, toolDefinitions } from "@/tools";

type PageProps = {
  params: Promise<{ slug: string | undefined }>;
};

export async function generateStaticParams() {
  return toolDefinitions.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return notFound();

  const tool = getToolBySlug(slug);
  if (!tool) return {};

  const title = tool.name;
  const description = tool.description;

  return {
    title,
    description,
    alternates: {
      canonical: `/tools/${tool.slug}`,
    },
    openGraph: {
      title: `${title} | UtilityHub`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | UtilityHub`,
      description,
    },
  };
}

export default async function ToolPage({ params }: PageProps) {
  const { slug } = await params;
  if (!slug) return notFound();

  const tool = getToolBySlug(slug);
  if (!tool) notFound();

  return (
    <>
      <ToolShell tool={tool}>
        <ToolLoader tool={tool} />
      </ToolShell>
      <RelatedTools tool={tool} />
    </>
  );
}
