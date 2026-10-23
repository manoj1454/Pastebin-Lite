import { Suspense, use } from "react";
import { PasteViewer, PasteLoadingSkeleton } from "@/components/PasteViewer";

function PasteViewerContainer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PasteViewer id={id} />;
}

export default function ViewPastePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PasteLoadingSkeleton />}>
      <PasteViewerContainer params={params} />
    </Suspense>
  );
}
