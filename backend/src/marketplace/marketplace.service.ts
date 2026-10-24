import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SaveMarketplaceItemDto } from './dto/save-marketplace-item.dto';
import { mapMarketplaceError, type RpcFailure } from './marketplace.errors';
import type {
  AdminMarketplaceItem,
  Inventory,
  MarketplaceItem,
  MarketplaceKind,
  MarketplaceStatus,
  PurchaseResult,
  ChallengeOption,
} from './marketplace.types';

const ITEM_COLUMNS =
  'id, kind, title, description, price_credits, preview, status, animation_key, challenge_id';

type ItemRow = {
  id: string;
  kind: MarketplaceKind;
  title: string;
  description: string;
  price_credits: number;
  preview: string;
  status: MarketplaceStatus;
  animation_key: string | null;
  challenge_id: string | null;
};

type PurchaseRow = { item_id: string; price_paid: number };

interface Query {
  select: (columns: string) => Query;
  eq: (column: string, value: string) => Query;
  in: (column: string, values: string[]) => Query;
  neq: (column: string, value: string) => Query;
  maybeSingle: () => Promise<{ data: unknown; error: RpcFailure | null }>;
  then: Promise<{ data: unknown; error: RpcFailure | null }>['then'];
}

interface MarketplaceDb {
  from: (table: string) => Query;
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcFailure | null }>;
}

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getBalance(userId: string): Promise<{ credits_balance: number }> {
    const { data, error } = await this.db()
      .from('credit_wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) this.fail(error, 'credit_wallets.select', userId);
    const balance =
      data && typeof data === 'object' && 'balance' in data ? data.balance : 0;
    if (typeof balance !== 'number')
      this.fail({ code: 'unknown' }, 'credit_wallets.select', userId);
    return { credits_balance: balance };
  }

  async listItems(userId: string): Promise<MarketplaceItem[]> {
    const published = await this.itemRows(
      this.db()
        .from('marketplace_items')
        .select(ITEM_COLUMNS)
        .eq('status', 'published'),
      userId,
    );
    const purchases = await this.purchaseRows(userId);
    const ownedIds = new Set(purchases.map((row) => row.item_id));
    const seen = new Set(published.map((row) => row.id));
    const missing = [...ownedIds].filter((id) => !seen.has(id));
    const extra = missing.length
      ? await this.itemRows(
          this.db()
            .from('marketplace_items')
            .select(ITEM_COLUMNS)
            .in('id', missing)
            .neq('status', 'draft'),
          userId,
        )
      : [];
    const rows = [
      ...published,
      ...extra.filter((row) => row.status !== 'draft'),
    ];
    return this.decorate(userId, rows, ownedIds);
  }

  async getItem(userId: string, itemId: string): Promise<MarketplaceItem> {
    const row = await this.oneItem(itemId, userId);
    if (!row || row.status === 'draft') {
      this.fail(
        { code: 'P0001', message: 'unavailable' },
        'marketplace_items.select',
        userId,
      );
    }
    const purchases = await this.purchaseRows(userId);
    const owned = purchases.some((entry) => entry.item_id === itemId);
    if (row.status !== 'published' && !owned) {
      this.fail(
        { code: 'P0001', message: 'unavailable' },
        'marketplace_items.select',
        userId,
      );
    }
    const [item] = await this.decorate(
      userId,
      [row],
      new Set(owned ? [itemId] : []),
    );
    return item;
  }

  async purchase(userId: string, itemId: string): Promise<PurchaseResult> {
    const { data, error } = await this.db().rpc('purchase_marketplace_item', {
      p_user_id: userId,
      p_item_id: itemId,
    });
    if (error) this.fail(error, 'purchase_marketplace_item', userId);
    const row = this.oneRecord(data, 'purchase_marketplace_item', userId);
    const credits = row.credits_balance;
    const owned = row.already_owned;
    const hint = row.hint_content;
    if (typeof credits !== 'number' || typeof owned !== 'boolean') {
      this.fail({ code: 'unknown' }, 'purchase_marketplace_item', userId);
    }
    const item = await this.getItem(userId, itemId);
    const result: PurchaseResult = {
      credits_balance: credits,
      item,
      already_owned: owned,
    };
    if (typeof hint === 'string') result.hint_content = hint;
    return result;
  }

  async inventory(userId: string): Promise<Inventory> {
    const purchases = await this.purchaseRows(userId);
    const ids = purchases.map((row) => row.item_id);
    const rows = ids.length
      ? await this.itemRows(
          this.db()
            .from('marketplace_items')
            .select(ITEM_COLUMNS)
            .in('id', ids)
            .neq('status', 'draft'),
          userId,
        )
      : [];
    const paid = new Map(purchases.map((row) => [row.item_id, row.price_paid]));
    const items = (await this.decorate(userId, rows, new Set(ids))).flatMap(
      (item) => {
        const price = paid.get(item.id);
        if (typeof price !== 'number') return [];
        return [{ ...item, price_paid: price }];
      },
    );
    return {
      items,
      equipped: {
        icon:
          items.find((item) => item.equipped && item.kind === 'icon') ?? null,
        animation:
          items.find((item) => item.equipped && item.kind === 'animation') ??
          null,
      },
    };
  }

  async equip(userId: string, itemId: string): Promise<Inventory> {
    await this.voidCall(
      'equip_marketplace_item',
      { p_user_id: userId, p_item_id: itemId },
      userId,
    );
    return this.inventory(userId);
  }

  async unequip(
    userId: string,
    slot: 'icon' | 'animation',
  ): Promise<Inventory> {
    await this.voidCall(
      'unequip_marketplace_item',
      { p_user_id: userId, p_slot: slot },
      userId,
    );
    return this.inventory(userId);
  }

  async hint(
    userId: string,
    itemId: string,
  ): Promise<{ hint_content: string }> {
    const { data, error } = await this.db().rpc('marketplace_hint_content', {
      p_user_id: userId,
      p_item_id: itemId,
    });
    if (error) this.fail(error, 'marketplace_hint_content', userId);
    if (typeof data !== 'string') {
      this.fail({ code: 'unknown' }, 'marketplace_hint_content', userId);
    }
    return { hint_content: data };
  }

  async listChallenges(adminId: string): Promise<ChallengeOption[]> {
    const { data, error } = await this.db()
      .from('challenges')
      .select('id, title');
    if (error) this.fail(error, 'challenges.select', adminId);
    return this.records(data, 'challenges.select', adminId).flatMap((row) => {
      if (typeof row.id !== 'string' || typeof row.title !== 'string')
        return [];
      return [{ id: row.id, title: row.title }];
    });
  }

  async listAdmin(adminId: string): Promise<AdminMarketplaceItem[]> {
    const rows = await this.itemRows(
      this.db().from('marketplace_items').select(ITEM_COLUMNS),
      adminId,
    );
    const ids = rows.map((row) => row.id);
    const purchased = await this.purchasedIds(adminId, ids);
    const items = await this.decorate(adminId, rows, new Set());
    return items.map((item) => ({
      ...item,
      has_purchases: purchased.has(item.id),
    }));
  }

  async saveItem(
    adminId: string,
    dto: SaveMarketplaceItemDto,
    itemId: string | null,
  ): Promise<AdminMarketplaceItem> {
    const { data, error } = await this.db().rpc('marketplace_admin_save_item', {
      p_admin_id: adminId,
      p_item_id: itemId,
      p_kind: dto.kind,
      p_title: dto.title,
      p_description: dto.description,
      p_price_credits: dto.price_credits,
      p_status: dto.status,
      p_preview: dto.preview,
      p_animation_key:
        dto.kind === 'animation' ? (dto.animation_key ?? null) : null,
      p_challenge_id: dto.kind === 'hint' ? (dto.challenge_id ?? null) : null,
      p_hint_body: dto.kind === 'hint' ? (dto.hint_body ?? null) : null,
    });
    if (error) this.fail(error, 'marketplace_admin_save_item', adminId);
    if (typeof data !== 'string') {
      this.fail({ code: 'unknown' }, 'marketplace_admin_save_item', adminId);
    }
    return this.adminItem(adminId, data);
  }

  async archiveItem(
    adminId: string,
    itemId: string,
  ): Promise<AdminMarketplaceItem> {
    await this.voidCall(
      'marketplace_admin_archive_item',
      { p_admin_id: adminId, p_item_id: itemId },
      adminId,
    );
    return this.adminItem(adminId, itemId);
  }

  async grant(
    adminId: string,
    userId: string,
    amount: number,
    reason: string,
  ): Promise<{ credits_balance: number }> {
    const { data, error } = await this.db().rpc('admin_grant_credits', {
      p_admin_id: adminId,
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
    });
    if (error) this.fail(error, 'admin_grant_credits', adminId);
    if (typeof data !== 'number')
      this.fail({ code: 'unknown' }, 'admin_grant_credits', adminId);
    return { credits_balance: data };
  }

  private async adminItem(
    adminId: string,
    itemId: string,
  ): Promise<AdminMarketplaceItem> {
    const row = await this.oneItem(itemId, adminId);
    if (!row)
      this.fail(
        { code: 'P0001', message: 'unavailable' },
        'marketplace_items.select',
        adminId,
      );
    const purchased = await this.purchasedIds(adminId, [itemId]);
    const [item] = await this.decorate(adminId, [row], purchased);
    return { ...item, has_purchases: purchased.has(itemId) };
  }

  private async purchasedIds(
    adminId: string,
    ids: string[],
  ): Promise<Set<string>> {
    const { data, error } = await this.db().rpc(
      'marketplace_admin_purchased_ids',
      {
        p_admin_id: adminId,
        p_item_ids: ids,
      },
    );
    if (error) this.fail(error, 'marketplace_admin_purchased_ids', adminId);
    return new Set(
      this.strings(data, 'marketplace_admin_purchased_ids', adminId),
    );
  }

  private async voidCall(
    rpc: string,
    args: Record<string, unknown>,
    userId: string,
  ): Promise<void> {
    const { data, error } = await this.db().rpc(rpc, args);
    if (error) this.fail(error, rpc, userId);
    if (data !== null) this.fail({ code: 'unknown' }, rpc, userId);
  }

  private async decorate(
    userId: string,
    rows: ItemRow[],
    ownedIds: Set<string>,
  ): Promise<MarketplaceItem[]> {
    const challengeIds = [
      ...new Set(
        rows
          .map((row) => row.challenge_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const titles = new Map<string, string>();
    if (challengeIds.length > 0) {
      const { data, error } = await this.db()
        .from('challenges')
        .select('id, title')
        .in('id', challengeIds);
      if (error) this.fail(error, 'challenges.select', userId);
      for (const row of this.records(data, 'challenges.select', userId)) {
        const id = row.id;
        const title = row.title;
        if (typeof id === 'string' && typeof title === 'string')
          titles.set(id, title);
      }
    }
    const equipped = rows.length
      ? await this.equippedIds(userId)
      : new Set<string>();
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      description: row.description,
      price_credits: row.price_credits,
      preview: row.preview,
      status: row.status,
      ...(row.animation_key ? { animation_key: row.animation_key } : {}),
      ...(row.challenge_id
        ? {
            challenge_id: row.challenge_id,
            challenge_title: titles.get(row.challenge_id),
          }
        : {}),
      owned: ownedIds.has(row.id),
      equipped: equipped.has(row.id),
    }));
  }

  private async equippedIds(userId: string): Promise<Set<string>> {
    const { data, error } = await this.db()
      .from('user_equipped_items')
      .select('slot, item_id')
      .eq('user_id', userId);
    if (error) this.fail(error, 'user_equipped_items.select', userId);
    return new Set(
      this.records(data, 'user_equipped_items.select', userId).flatMap(
        (row) => {
          return typeof row.item_id === 'string' ? [row.item_id] : [];
        },
      ),
    );
  }

  private async purchaseRows(userId: string): Promise<PurchaseRow[]> {
    const { data, error } = await this.db()
      .from('marketplace_purchases')
      .select('item_id, price_paid')
      .eq('user_id', userId);
    if (error) this.fail(error, 'marketplace_purchases.select', userId);
    return this.records(data, 'marketplace_purchases.select', userId).flatMap(
      (row) => {
        if (
          typeof row.item_id !== 'string' ||
          typeof row.price_paid !== 'number'
        )
          return [];
        return [{ item_id: row.item_id, price_paid: row.price_paid }];
      },
    );
  }

  private async oneItem(
    itemId: string,
    userId: string,
  ): Promise<ItemRow | null> {
    const { data, error } = await this.db()
      .from('marketplace_items')
      .select(ITEM_COLUMNS)
      .eq('id', itemId)
      .maybeSingle();
    if (error) this.fail(error, 'marketplace_items.select', userId);
    if (data === null) return null;
    return this.asItem(data, userId);
  }

  private async itemRows(query: Query, userId: string): Promise<ItemRow[]> {
    const { data, error } = await query;
    if (error) this.fail(error, 'marketplace_items.select', userId);
    return this.records(data, 'marketplace_items.select', userId).map((row) =>
      this.asItem(row, userId),
    );
  }

  private asItem(value: unknown, userId: string): ItemRow {
    if (!value || typeof value !== 'object') {
      this.fail({ code: 'unknown' }, 'marketplace_items.select', userId);
    }
    const row = value as ItemRow;
    if (typeof row.id !== 'string' || typeof row.kind !== 'string') {
      this.fail({ code: 'unknown' }, 'marketplace_items.select', userId);
    }
    return row;
  }

  private oneRecord(
    data: unknown,
    rpc: string,
    userId: string,
  ): Record<string, unknown> {
    const rows = this.records(data, rpc, userId);
    const row = rows[0];
    if (rows.length !== 1 || !row) this.fail({ code: 'unknown' }, rpc, userId);
    return row;
  }

  private records(
    data: unknown,
    rpc: string,
    userId: string,
  ): Record<string, unknown>[] {
    if (!isUnknownArray(data)) this.fail({ code: 'unknown' }, rpc, userId);
    return data.map((entry) => {
      if (!isRecord(entry)) this.fail({ code: 'unknown' }, rpc, userId);
      return entry;
    });
  }

  private strings(data: unknown, rpc: string, userId: string): string[] {
    if (!isUnknownArray(data)) this.fail({ code: 'unknown' }, rpc, userId);
    return data.map((entry) => {
      if (typeof entry !== 'string')
        this.fail({ code: 'unknown' }, rpc, userId);
      return entry;
    });
  }

  private fail(error: RpcFailure, rpc: string, userId: string): never {
    throw mapMarketplaceError(error, rpc, userId, this.logger);
  }

  private db(): MarketplaceDb {
    return this.supabase.client as unknown as MarketplaceDb;
  }
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
