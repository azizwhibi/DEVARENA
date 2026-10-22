export type MarketplaceKind = 'icon' | 'animation' | 'hint';
export type MarketplaceStatus = 'draft' | 'published' | 'archived';

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

export type InventoryItem = MarketplaceItem & { price_paid: number };

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

export type AdminMarketplaceItem = MarketplaceItem & { has_purchases: boolean };

export type ChallengeOption = { id: string; title: string };
