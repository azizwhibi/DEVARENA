// Rendered behind the workspace's browser-loaded account gate.
export const instant = false;

import { Suspense } from 'react';
import { KnowledgeDetail } from '@/components/knowledge/KnowledgeDetail';
export default async function ResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="page-container" role="status">
          Loading…
        </div>
      }
    >
      <KnowledgeDetail id={id} />
    </Suspense>
  );
}
