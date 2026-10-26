import { CommunityFeed } from "@/components/community/CommunityFeed";
export const instant = false;
export const metadata = { title: "My posts | DevArena" };
export default function Page() {
  return <CommunityFeed mode="mine" />;
}
