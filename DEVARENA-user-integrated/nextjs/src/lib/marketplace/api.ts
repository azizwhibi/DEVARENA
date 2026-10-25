import { marketplaceHttp } from './api.http';
import {
  MarketplaceError,
  type MarketplaceItem,
  type ItemOffer,
} from './types';
export * from './types';
export const marketplaceApi = marketplaceHttp;

export function describeOffer(
  item: MarketplaceItem,
  balance: number,
): ItemOffer {
  if (item.equipped) return { state: 'equipped' };
  if (item.owned) return { state: 'owned' };
  if (item.status === 'archived') return { state: 'archived' };
  if (balance < item.price_credits) {
    return {
      state: 'insufficient',
      missing_credits: item.price_credits - balance,
    };
  }
  return { state: 'buy' };
}

export function marketplaceMessage(error: unknown): string {
  if (error instanceof MarketplaceError && error.code === 'rate_limited') {
    return 'Too many requests. Try again shortly.';
  }
  if (error instanceof MarketplaceError) return error.message;
  return 'Something went wrong. Please retry.';
}
