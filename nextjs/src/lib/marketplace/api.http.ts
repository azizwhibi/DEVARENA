import { ApiError, apiRequest } from '@/lib/api';
import {
  MarketplaceError,
  type AdminMarketplaceItem,
  type ChallengeOption,
  type GrantCreditsInput,
  type Inventory,
  type MarketplaceErrorCode,
  type MarketplaceItem,
  type PurchaseResult,
  type SaveMarketplaceItem,
} from './types';

const KNOWN: readonly MarketplaceErrorCode[] = [
  'insufficient_credits',
  'unavailable',
  'forbidden',
  'network',
  'kind_immutable',
  'purchased_item_not_draft',
  'purchased_item_not_deletable',
  'validation',
  'rate_limited',
];

function isKnownCode(code: string): code is MarketplaceErrorCode {
  return KNOWN.some((entry) => entry === code);
}

export function marketplaceErrorFrom(error: unknown): MarketplaceError {
  if (error instanceof MarketplaceError) return error;
  if (!(error instanceof ApiError)) {
    return new MarketplaceError('network', 'Network error. Please retry.');
  }
  const detail =
    typeof error.problem.detail === 'string'
      ? error.problem.detail
      : error.message;
  if (error.status === 400) return new MarketplaceError('validation', detail);
  if (error.status === 429) return new MarketplaceError('rate_limited', detail);
  if (error.status === 404) return new MarketplaceError('unavailable', detail);
  const received = error.problem.code;
  if (typeof received === 'string' && isKnownCode(received)) {
    const messages: Partial<Record<MarketplaceErrorCode, string>> = {
      insufficient_credits: 'You do not have enough credits for this item.',
      forbidden: 'You do not have permission to perform this action.',
      kind_immutable: 'An item type cannot be changed after creation.',
      purchased_item_not_draft: 'Purchased items cannot be changed to drafts.',
      purchased_item_not_deletable:
        'Purchased items must be archived instead of deleted.',
    };
    return new MarketplaceError(received, messages[received] ?? detail);
  }
  return new MarketplaceError('network', detail);
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    if (
      init?.method &&
      init.method !== 'GET' &&
      typeof navigator !== 'undefined' &&
      !navigator.onLine
    )
      throw new MarketplaceError(
        'network',
        'You are offline. Reconnect to retry.',
      );
    return await apiRequest<T>(path, init);
  } catch (error) {
    throw marketplaceErrorFrom(error);
  }
}

function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export const marketplaceHttp = {
  getBalance: async () =>
    (await call<{ credits_balance: number }>('/marketplace/balance'))
      .credits_balance,
  listItems: () => call<MarketplaceItem[]>('/marketplace/items'),
  getItem: (id: string) => call<MarketplaceItem>(`/marketplace/items/${id}`),
  purchase: (id: string) =>
    call<PurchaseResult>(`/marketplace/items/${id}/purchase`, {
      method: 'POST',
    }),
  getInventory: () => call<Inventory>('/marketplace/inventory'),
  equip: (id: string) =>
    call<Inventory>('/marketplace/equip', json('POST', { item_id: id })),
  unequip: (slot: 'icon' | 'animation') =>
    call<Inventory>('/marketplace/unequip', json('POST', { slot })),
  getHintContent: async (id: string) =>
    (await call<{ hint_content: string }>(`/marketplace/items/${id}/hint`))
      .hint_content,
  listAdminItems: () =>
    call<AdminMarketplaceItem[]>('/admin/marketplace/items'),
  listChallenges: () =>
    call<ChallengeOption[]>('/admin/marketplace/challenges'),
  saveItem: (input: SaveMarketplaceItem) => {
    const { id, ...body } = input;
    return id
      ? call<AdminMarketplaceItem>(
          `/admin/marketplace/items/${id}`,
          json('PATCH', body),
        )
      : call<AdminMarketplaceItem>(
          '/admin/marketplace/items',
          json('POST', body),
        );
  },
  archiveItem: (id: string) =>
    call<AdminMarketplaceItem>(`/admin/marketplace/items/${id}/archive`, {
      method: 'POST',
    }),
  grantCredits: async (input: GrantCreditsInput) =>
    (
      await call<{ credits_balance: number }>(
        '/admin/marketplace/credits',
        json('POST', input),
      )
    ).credits_balance,
};
