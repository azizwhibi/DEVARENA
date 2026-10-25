import { PostEditor } from "@/components/community/PostEditor";
import { Suspense } from "react";
export const instant = false;
export const metadata = { title: "Edit post | DevArena" };
async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostEditor id={id} />;
}
export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p role="status">Loading editor…</p>}>
      <Editor {...props} />
    </Suspense>
  );
}
