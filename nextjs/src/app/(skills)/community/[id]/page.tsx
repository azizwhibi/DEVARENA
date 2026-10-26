import { PostDetail } from "@/components/community/PostDetail";
import { Suspense } from "react";
export const instant = false;
export const metadata = { title: "Discussion | DevArena" };
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostDetail id={id} />;
}
export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p role="status">Loading discussion…</p>}>
      <Detail {...props} />
    </Suspense>
  );
}
