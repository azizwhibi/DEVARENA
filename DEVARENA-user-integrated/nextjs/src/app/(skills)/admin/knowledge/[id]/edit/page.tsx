// Rendered behind the workspace's browser-loaded account gate.
export const instant = false;

import { KnowledgeEditor } from '@/components/knowledge/KnowledgeEditor';
export default async function EditKnowledgePage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <KnowledgeEditor id={id}/>;}
