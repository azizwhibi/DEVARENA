export type MarketplaceKind = 'icon' | 'animation' | 'hint';

export type MarketplaceStatus = 'published' | 'archived' | 'draft';

export type MarketplaceItem = {
  id: string;
  kind: MarketplaceKind;
  title: string;
  description: string;
  price_credits: number;
  preview: string;
  status: MarketplaceStatus;
  animation_key?: string;
  challenge_id?: string;
  challenge_title?: string;
  owned: boolean;
  equipped: boolean;
};

export type InventoryItem = MarketplaceItem & {
  price_paid: number;
};

export type Inventory = {
  items: InventoryItem[];
  equipped: {
    icon: MarketplaceItem | null;
    animation: MarketplaceItem | null;
  };
};

export type PurchaseResult = {
  credits_balance: number;
  item: MarketplaceItem;
  already_owned: boolean;
  hint_content?: string;
};

export type AdminMarketplaceItem = MarketplaceItem & {
  has_purchases: boolean;
};

export type ChallengeOption = {
  id: string;
  title: string;
};

export type GrantCreditsInput = {
  user_id: string;
  amount: number;
  reason: string;
};

export type SaveMarketplaceItem = {
  id?: string;
  kind: MarketplaceKind;
  title: string;
  description: string;
  price_credits: number;
  preview: string;
  status: MarketplaceStatus;
  animation_key?: string;
  challenge_id?: string;
  hint_body?: string;
};

export type ItemOffer =
  | { state: 'buy' }
  | { state: 'insufficient'; missing_credits: number }
  | { state: 'owned' }
  | { state: 'equipped' }
  | { state: 'archived' };

export type MarketplaceErrorCode =
  | 'insufficient_credits'
  | 'unavailable'
  | 'forbidden'
  | 'network'
  | 'kind_immutable'
  | 'purchased_item_not_draft'
  | 'purchased_item_not_deletable'
  | 'validation'
  | 'rate_limited';

export class MarketplaceError extends Error {
  readonly code: MarketplaceErrorCode;
  readonly missingCredits: number | null;

  constructor(
    code: MarketplaceErrorCode,
    message: string,
    missingCredits: number | null = null,
  ) {
    super(message);
    this.name = 'MarketplaceError';
    this.code = code;
    this.missingCredits = missingCredits;
  }
}
