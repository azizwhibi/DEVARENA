import { marketplaceHttp } from './api.http';
import {
  MarketplaceError,
  type AdminMarketplaceItem,
  type ChallengeOption,
  type GrantCreditsInput,
  type Inventory,
  type ItemOffer,
  type MarketplaceItem,
  type MarketplaceKind,
  type PurchaseResult,
  type SaveMarketplaceItem,
} from './types';

export type {
  AdminMarketplaceItem,
  ChallengeOption,
  GrantCreditsInput,
  Inventory,
  InventoryItem,
  ItemOffer,
  MarketplaceItem,
  MarketplaceKind,
  MarketplaceStatus,
  PurchaseResult,
  SaveMarketplaceItem,
} from './types';
export { MarketplaceError } from './types';

type MarketplaceMock = typeof import('./mock').marketplaceMock;

export function isMarketplaceMock(): boolean {
  return process.env.NEXT_PUBLIC_MARKETPLACE_MOCK === 'true';
}

/** Bouton d’achat dérivé ici : les composants n’additionnent ni le prix ni le solde. */
export function describeOffer(item: MarketplaceItem, balance: number): ItemOffer {
  if (item.equipped) return { state: 'equipped' };
  if (item.owned) return { state: 'owned' };
  if (item.status === 'archived') return { state: 'archived' };
  if (balance < item.price_credits) {
    return { state: 'insufficient', missing_credits: item.price_credits - balance };
  }
  return { state: 'buy' };
}

export interface MarketplaceApi {
  getBalance(): Promise<number>;
  listItems(): Promise<MarketplaceItem[]>;
  getItem(id: string): Promise<MarketplaceItem>;
  purchase(id: string): Promise<PurchaseResult>;
  getInventory(): Promise<Inventory>;
  equip(id: string): Promise<Inventory>;
  unequip(slot: Extract<MarketplaceKind, 'icon' | 'animation'>): Promise<Inventory>;
  getHintContent(id: string): Promise<string>;
  listAdminItems(): Promise<AdminMarketplaceItem[]>;
  listChallenges(): Promise<ChallengeOption[]>;
  saveItem(input: SaveMarketplaceItem): Promise<AdminMarketplaceItem>;
  archiveItem(id: string): Promise<AdminMarketplaceItem>;
  grantCredits(input: GrantCreditsInput): Promise<number>;
}

export interface MarketplaceDemoApi {
  bindUser(userId: string): Promise<void>;
  resetDemo(): Promise<void>;
  setNetworkErrors(enabled: boolean): Promise<void>;
}

async function loadMock(): Promise<MarketplaceMock> {
  if (!isMarketplaceMock()) throw new MarketplaceError('unavailable', 'La démonstration est désactivée.');
  const loaded = await import('./mock');
  return loaded.marketplaceMock;
}

async function implementation(): Promise<MarketplaceApi> {
  if (!isMarketplaceMock()) return marketplaceHttp;
  return loadMock();
}

export const marketplaceApi: MarketplaceApi = {
  getBalance: async () => (await implementation()).getBalance(),
  listItems: async () => (await implementation()).listItems(),
  getItem: async (id) => (await implementation()).getItem(id),
  purchase: async (id) => (await implementation()).purchase(id),
  getInventory: async () => (await implementation()).getInventory(),
  equip: async (id) => (await implementation()).equip(id),
  unequip: async (slot) => (await implementation()).unequip(slot),
  getHintContent: async (id) => (await implementation()).getHintContent(id),
  listAdminItems: async () => (await implementation()).listAdminItems(),
  listChallenges: async () => (await implementation()).listChallenges(),
  saveItem: async (input) => (await implementation()).saveItem(input),
  archiveItem: async (id) => (await implementation()).archiveItem(id),
  grantCredits: async (input) => (await implementation()).grantCredits(input),
};

export function marketplaceMessage(error: unknown): string {
  if (error instanceof MarketplaceError && error.code === 'rate_limited') {
    return 'Trop de requêtes. Réessayez dans un instant.';
  }
  if (error instanceof MarketplaceError) return error.message;
  return 'Une erreur est survenue.';
}

export const marketplaceDemo: MarketplaceDemoApi = {
  bindUser: async (userId) => (await loadMock()).bindUser(userId),
  resetDemo: async () => (await loadMock()).resetDemo(),
  setNetworkErrors: async (enabled) => (await loadMock()).setNetworkErrors(enabled),
};
