import { KnowledgeLibrary } from '@/components/knowledge/KnowledgeLibrary';

// The workspace renders this page after loading the signed-in account in the browser.
// It cannot be inspected by Next.js's prerender-time instant-navigation validator.
export const instant = false;

export default function KnowledgePage() {
  return <KnowledgeLibrary />;
}
