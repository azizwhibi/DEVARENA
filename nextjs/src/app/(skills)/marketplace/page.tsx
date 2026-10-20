import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';

export default function MarketplacePage() {
  return (
    <div className="page-container">
      <header className="page-header"><h1 className="page-title">Marketplace</h1></header>
      <section className="card empty-state" aria-labelledby="marketplace-empty-title">
        <WorkspaceIcon name="marketplace" size={20} />
        <h2 id="marketplace-empty-title">Aucune offre disponible</h2>
      </section>
    </div>
  );
}
