import { RelatedToolsSkeleton } from "@/components/related-tools";
import { ToolShellSkeleton } from "@/components/tool-shell";

export default function ToolLoading() {
  return (
    <>
      <ToolShellSkeleton />
      <RelatedToolsSkeleton />
    </>
  );
}
