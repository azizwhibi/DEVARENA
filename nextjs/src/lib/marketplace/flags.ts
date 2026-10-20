export function isMarketplaceMock(): boolean {
  return process.env.NEXT_PUBLIC_MARKETPLACE_MOCK === 'true';
}

export function isMarketplaceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MARKETPLACE_ENABLED === 'true';
}

/** Ouverte seulement si l’une des deux variables publiques vaut exactement true. */
export function isMarketplaceOpen(): boolean {
  return isMarketplaceMock() || isMarketplaceEnabled();
}
