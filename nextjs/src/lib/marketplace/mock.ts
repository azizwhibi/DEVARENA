import {
  MarketplaceError,
  type AdminMarketplaceItem,
  type ChallengeOption,
  type GrantCreditsInput,
  type Inventory,
  type MarketplaceItem,
  type MarketplaceKind,
  type PurchaseResult,
  type SaveMarketplaceItem,
} from './types';

type CatalogItem = Omit<MarketplaceItem, 'owned' | 'equipped'> & { hint_body?: string };

type DemoState = {
  balance: number;
  owned: string[];
  equipped: { icon: string | null; animation: string | null };
  purchaseCounts: Record<string, number>;
  overrides: Record<string, Partial<CatalogItem>>;
  custom: CatalogItem[];
  networkErrors: boolean;
};

const STORAGE_PREFIX = 'devarena-marketplace-demo:';
const STARTING_BALANCE = 300;

const CATALOG: readonly CatalogItem[] = [
  { id: 'icon-cursor', kind: 'icon', title: 'Curseur terminal', description: 'Un curseur vert pour le profil.', price_credits: 40, preview: '>_', status: 'published' },
  { id: 'icon-hex', kind: 'icon', title: 'Badge hex', description: 'Emblème hexagonal de l’arène.', price_credits: 80, preview: '0x', status: 'published' },
  { id: 'icon-pixel', kind: 'icon', title: 'Bloc pixel', description: 'Icône carrée, style arcade.', price_credits: 120, preview: '[]', status: 'published' },
  { id: 'icon-crown', kind: 'icon', title: 'Couronne', description: 'Réservée aux gros soldes.', price_credits: 450, preview: '^*', status: 'published' },
  { id: 'anim-scan', kind: 'animation', title: 'Balayage', description: 'Une ligne qui traverse l’avatar.', price_credits: 60, preview: '~~', status: 'published', animation_key: 'scanline' },
  { id: 'anim-pulse', kind: 'animation', title: 'Anneau', description: 'Un anneau qui pulse autour de l’icône.', price_credits: 110, preview: '()', status: 'published', animation_key: 'pulse' },
  { id: 'anim-matrix', kind: 'animation', title: 'Pluie de code', description: 'Glyphes qui défilent en fond.', price_credits: 200, preview: '##', status: 'published', animation_key: 'matrix' },
  { id: 'anim-retired', kind: 'animation', title: 'Confettis retirés', description: 'Ancienne animation, plus en vente.', price_credits: 90, preview: '**', status: 'archived', animation_key: 'confetti' },
  { id: 'hint-loop', kind: 'hint', title: 'Indice : borne de boucle', description: 'Un coup de pouce pour la condition d’arrêt.', price_credits: 30, preview: '?', status: 'published', challenge_id: 'ch-loop', challenge_title: 'Boucle bornée', hint_body: 'La borne haute est exclusive : arrête-toi avant le dernier index.' },
  { id: 'hint-join', kind: 'hint', title: 'Indice : jointure', description: 'Pourquoi la requête ne renvoie aucune ligne.', price_credits: 55, preview: '?', status: 'published', challenge_id: 'ch-join', challenge_title: 'Jointure manquante', hint_body: 'Relie les tables sur la clé étrangère, pas sur le titre.' },
  { id: 'hint-regex', kind: 'hint', title: 'Indice : motif', description: 'Le motif laisse passer une chaîne vide.', price_credits: 75, preview: '?', status: 'published', challenge_id: 'ch-regex', challenge_title: 'Motif cassé', hint_body: 'Ancre le motif et exige au moins un caractère.' },
  { id: 'hint-draft', kind: 'hint', title: 'Indice brouillon', description: 'Pas encore proposé à la vente.', price_credits: 40, preview: '?', status: 'draft', challenge_id: 'ch-draft', challenge_title: 'Défi non publié', hint_body: 'Ce texte ne doit pas sortir avant publication et achat.' },
];

function seed(): DemoState {
  return {
    balance: STARTING_BALANCE,
    owned: ['anim-retired'],
    equipped: { icon: null, animation: null },
    purchaseCounts: { 'anim-retired': 1 },
    overrides: {},
    custom: [],
    networkErrors: false,
  };
}

let memory: DemoState | null = null;
let activeUserId: string | null = null;

function storageKey(): string | null {
  return activeUserId ? `${STORAGE_PREFIX}${activeUserId}` : null;
}

function wait(): Promise<void> {
  const ms = 300 + Math.floor(Math.random() * 301);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readStorage(key: string): DemoState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as Partial<DemoState>;
    if (typeof value.balance !== 'number' || !Array.isArray(value.owned)) return null;
    return {
      balance: value.balance,
      owned: value.owned.filter((id) => typeof id === 'string'),
      equipped: {
        icon: typeof value.equipped?.icon === 'string' ? value.equipped.icon : null,
        animation: typeof value.equipped?.animation === 'string' ? value.equipped.animation : null,
      },
      purchaseCounts: value.purchaseCounts && typeof value.purchaseCounts === 'object' ? value.purchaseCounts : {},
      overrides: value.overrides && typeof value.overrides === 'object' ? value.overrides : {},
      custom: Array.isArray(value.custom) ? value.custom : [],
      networkErrors: value.networkErrors === true,
    };
  } catch {
    return null;
  }
}

function persist(state: DemoState) {
  memory = state;
  const key = storageKey();
  if (typeof window === 'undefined' || !key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Private mode or a full quota leaves the in-memory demo usable.
  }
}

function load(): DemoState {
  if (!memory) memory = seed();
  return memory;
}

function resultOf(state: DemoState, item: CatalogItem, alreadyOwned: boolean): PurchaseResult {
  const result: PurchaseResult = {
    credits_balance: state.balance,
    item: toPublic(item, state),
    already_owned: alreadyOwned,
  };
  if (item.kind === 'hint' && item.hint_body) result.hint_content = item.hint_body;
  return result;
}

function itemsOf(state: DemoState): CatalogItem[] {
  const base = CATALOG.map((item) => ({ ...item, ...state.overrides[item.id] }));
  return [...base, ...state.custom.map((item) => ({ ...item }))];
}

function findCatalog(state: DemoState, id: string): CatalogItem | undefined {
  return itemsOf(state).find((item) => item.id === id);
}

function toPublic(item: CatalogItem, state: DemoState): MarketplaceItem {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    description: item.description,
    price_credits: item.price_credits,
    preview: item.preview,
    status: item.status,
    animation_key: item.animation_key,
    challenge_id: item.challenge_id,
    challenge_title: item.challenge_title,
    owned: state.owned.includes(item.id),
    equipped: state.equipped.icon === item.id || state.equipped.animation === item.id,
  };
}

function inventoryFrom(state: DemoState): Inventory {
  const items = itemsOf(state)
    .filter((item) => state.owned.includes(item.id))
    .map((item) => ({ ...toPublic(item, state), price_paid: item.price_credits }));
  return {
    items,
    equipped: {
      icon: items.find((item) => item.id === state.equipped.icon) ?? null,
      animation: items.find((item) => item.id === state.equipped.animation) ?? null,
    },
  };
}

function toAdmin(item: CatalogItem, state: DemoState): AdminMarketplaceItem {
  return { ...toPublic(item, state), has_purchases: (state.purchaseCounts[item.id] ?? 0) > 0 };
}

async function gate(): Promise<DemoState> {
  if (load().networkErrors && Math.random() < 0.25) {
    await wait();
    throw new MarketplaceError('network', 'Erreur réseau. Réessayez.');
  }
  await wait();
  return load();
}

function requireItem(state: DemoState, id: string): CatalogItem {
  const item = findCatalog(state, id);
  if (!item || item.status === 'draft') throw new MarketplaceError('unavailable', 'Article introuvable.');
  if (item.status !== 'published' && !state.owned.includes(item.id)) {
    throw new MarketplaceError('unavailable', 'Article introuvable.');
  }
  return item;
}

export const marketplaceMock = {
  async bindUser(userId: string): Promise<void> {
    if (typeof window === 'undefined' || !userId) return;
    if (activeUserId === userId) return;
    activeUserId = userId;
    memory = readStorage(`${STORAGE_PREFIX}${userId}`) ?? seed();
  },

  async getBalance(): Promise<number> {
    const state = await gate();
    return state.balance;
  },

  async listItems(): Promise<MarketplaceItem[]> {
    const state = await gate();
    return itemsOf(state)
      .filter((item) => item.status === 'published' || (item.status !== 'draft' && state.owned.includes(item.id)))
      .map((item) => toPublic(item, state));
  },

  async getItem(id: string): Promise<MarketplaceItem> {
    const state = await gate();
    return toPublic(requireItem(state, id), state);
  },

  async purchase(id: string): Promise<PurchaseResult> {
    const state = await gate();
    const item = requireItem(state, id);
    if (state.owned.includes(item.id)) return resultOf(state, item, true);
    if (item.status !== 'published') {
      throw new MarketplaceError('unavailable', 'Article retiré de la boutique.');
    }
    if (state.balance < item.price_credits) {
      throw new MarketplaceError('insufficient_credits', 'Solde insuffisant.', item.price_credits - state.balance);
    }
    const next: DemoState = {
      ...state,
      balance: state.balance - item.price_credits,
      owned: [...state.owned, item.id],
      purchaseCounts: { ...state.purchaseCounts, [item.id]: (state.purchaseCounts[item.id] ?? 0) + 1 },
    };
    persist(next);
    return resultOf(next, item, false);
  },

  async getInventory(): Promise<Inventory> {
    const state = await gate();
    return inventoryFrom(state);
  },

  async equip(id: string): Promise<Inventory> {
    const state = await gate();
    const item = requireItem(state, id);
    if (!state.owned.includes(item.id)) throw new MarketplaceError('forbidden', 'Article non possédé.');
    if (item.kind !== 'icon' && item.kind !== 'animation') {
      throw new MarketplaceError('forbidden', 'Seules une icône et une animation s’équipent.');
    }
    const next: DemoState = {
      ...state,
      equipped: { ...state.equipped, [item.kind]: item.id },
    };
    persist(next);
    return inventoryFrom(next);
  },

  async unequip(kind: Extract<MarketplaceKind, 'icon' | 'animation'>): Promise<Inventory> {
    const state = await gate();
    const next: DemoState = { ...state, equipped: { ...state.equipped, [kind]: null } };
    persist(next);
    return inventoryFrom(next);
  },

  async getHintContent(id: string): Promise<string> {
    const state = await gate();
    const item = requireItem(state, id);
    if (item.kind !== 'hint' || !state.owned.includes(item.id)) {
      throw new MarketplaceError('forbidden', 'Indice disponible après achat.');
    }
    return item.hint_body ?? '';
  },

  async listAdminItems(): Promise<AdminMarketplaceItem[]> {
    const state = await gate();
    return itemsOf(state).map((item) => toAdmin(item, state));
  },

  async saveItem(input: SaveMarketplaceItem): Promise<AdminMarketplaceItem> {
    const state = await gate();
    if (!input.title.trim() || !Number.isInteger(input.price_credits) || input.price_credits < 1) {
      throw new MarketplaceError('validation', 'Titre ou prix invalide.');
    }
    if (input.kind !== 'animation' && input.animation_key !== undefined) {
      throw new MarketplaceError('validation', 'Une clé d’animation n’est admise que pour une animation.');
    }
    if (input.kind !== 'hint' && input.challenge_id !== undefined) {
      throw new MarketplaceError('validation', 'Un défi n’est admis que pour un indice.');
    }
    if (input.kind === 'animation' && !input.animation_key?.trim()) {
      throw new MarketplaceError('validation', 'Une animation exige une clé.');
    }
    if (input.kind === 'hint' && !input.hint_body?.trim()) {
      throw new MarketplaceError('validation', 'Un indice exige un texte.');
    }
    if (input.kind === 'hint' && input.status === 'published' && !input.challenge_id?.trim()) {
      throw new MarketplaceError('validation', 'Un indice publié exige un défi.');
    }
    if (input.id && input.status === 'draft' && (state.purchaseCounts[input.id] ?? 0) > 0) {
      throw new MarketplaceError('purchased_item_not_draft', 'Un article déjà acheté ne redevient pas brouillon.');
    }
    if (input.id) {
      const current = findCatalog(state, input.id);
      if (!current) throw new MarketplaceError('unavailable', 'Article introuvable.');
      if (current.kind !== input.kind) throw new MarketplaceError('kind_immutable', 'Le type est figé après création.');
      const patch: Partial<CatalogItem> = {
        title: input.title.trim(),
        description: input.description.trim(),
        price_credits: input.price_credits,
        preview: input.preview,
        status: input.status,
        animation_key: input.kind === 'animation' ? input.animation_key?.trim() : undefined,
        challenge_id: input.kind === 'hint' ? input.challenge_id?.trim() : undefined,
        hint_body: input.kind === 'hint' ? input.hint_body?.trim() : undefined,
      };
      const next: DemoState = state.custom.some((item) => item.id === input.id)
        ? { ...state, custom: state.custom.map((item) => item.id === input.id ? { ...item, ...patch, id: item.id, kind: item.kind } : item) }
        : { ...state, overrides: { ...state.overrides, [input.id]: { ...state.overrides[input.id], ...patch } } };
      persist(next);
      const saved = findCatalog(next, input.id);
      if (!saved) throw new MarketplaceError('unavailable', 'Article introuvable.');
      return toAdmin(saved, next);
    }
    const created: CatalogItem = {
      id: `item-${crypto.randomUUID()}`,
      kind: input.kind,
      title: input.title.trim(),
      description: input.description.trim(),
      price_credits: input.price_credits,
      preview: input.preview,
      status: input.status,
      animation_key: input.kind === 'animation' ? input.animation_key?.trim() : undefined,
      challenge_id: input.kind === 'hint' ? input.challenge_id?.trim() : undefined,
      hint_body: input.kind === 'hint' ? input.hint_body?.trim() : undefined,
    };
    const next: DemoState = { ...state, custom: [...state.custom, created] };
    persist(next);
    return toAdmin(created, next);
  },

  async archiveItem(id: string): Promise<AdminMarketplaceItem> {
    const state = await gate();
    const item = findCatalog(state, id);
    if (!item) throw new MarketplaceError('unavailable', 'Article introuvable.');
    if ((state.purchaseCounts[id] ?? 0) < 1) {
      throw new MarketplaceError('forbidden', 'Archivage réservé aux articles déjà achetés.');
    }
    return this.saveItem({
      id,
      kind: item.kind,
      title: item.title,
      description: item.description,
      price_credits: item.price_credits,
      preview: item.preview,
      status: 'archived',
      animation_key: item.animation_key,
      challenge_id: item.challenge_id,
      hint_body: item.hint_body,
    });
  },

  async listChallenges(): Promise<ChallengeOption[]> {
    const state = await gate();
    const titles = new Map<string, string>();
    for (const item of itemsOf(state)) {
      if (item.challenge_id && item.challenge_title) titles.set(item.challenge_id, item.challenge_title);
    }
    return [...titles].map(([id, title]) => ({ id, title }));
  },

  async grantCredits(input: GrantCreditsInput): Promise<number> {
    const state = await gate();
    if (!input.user_id || !Number.isInteger(input.amount) || input.amount < 1 || input.amount > 10000 || !input.reason.trim()) {
      throw new MarketplaceError('validation', 'Montant ou motif invalide.');
    }
    if (input.user_id !== activeUserId) return input.amount;
    const balance = state.balance + input.amount;
    if (balance > 1_000_000) throw new MarketplaceError('forbidden', 'Plafond de crédits atteint.');
    persist({ ...state, balance });
    return balance;
  },

  async resetDemo(): Promise<void> {
    memory = seed();
    const key = storageKey();
    if (typeof window === 'undefined' || !key) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // The in-memory reset still stands when storage is blocked.
    }
  },

  async setNetworkErrors(enabled: boolean): Promise<void> {
    const state = load();
    persist({ ...state, networkErrors: enabled });
  },
};
