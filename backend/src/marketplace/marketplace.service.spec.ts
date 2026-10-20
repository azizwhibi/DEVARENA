import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import type { SupabaseService } from '../supabase/supabase.service';

const userId = '11111111-1111-4111-8111-111111111111';
const itemId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

const itemRow = {
  id: itemId,
  kind: 'icon',
  title: 'Curseur',
  description: 'Une icône',
  price_credits: 40,
  preview: '>_',
  status: 'published',
  animation_key: null,
  challenge_id: null,
};

type Failure = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
} | null;

type QueryResult = { data: unknown; error: Failure };

interface Query {
  select: (columns: string) => Query;
  eq: (column: string, value: string) => Query;
  in: (column: string, values: string[]) => Query;
  neq: (column: string, value: string) => Query;
  maybeSingle: () => Promise<QueryResult>;
  then: Promise<QueryResult>['then'];
}

function query(result: QueryResult): Query {
  const api: Query = {
    select: (columns: string) => {
      selects.push(columns);
      return api;
    },
    eq: () => api,
    in: () => api,
    neq: () => api,
    maybeSingle: () => Promise.resolve(result),
    then: (onFulfilled, onRejected) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return api;
}

const selects: string[] = [];
const tables: string[] = [];

describe('MarketplaceService', () => {
  let rpc: jest.Mock<
    Promise<{ data: unknown; error: Failure }>,
    [string, Record<string, unknown>]
  >;
  let service: MarketplaceService;

  beforeEach(() => {
    selects.length = 0;
    tables.length = 0;
    rpc = jest.fn<
      Promise<{ data: unknown; error: Failure }>,
      [string, Record<string, unknown>]
    >();
    const client = {
      from: (table: string): Query => {
        tables.push(table);
        const queued = queues[table]?.shift();
        if (!queued) throw new Error(`unexpected query ${table}`);
        return queued;
      },
      rpc,
    };
    service = new MarketplaceService({ client } as unknown as SupabaseService);
  });

  const queues: Record<string, ReturnType<typeof query>[]> = {};

  function push(table: string, data: unknown, error: Failure = null) {
    queues[table] ??= [];
    queues[table].push(query({ data, error }));
  }

  beforeEach(() => {
    for (const key of Object.keys(queues)) delete queues[key];
  });

  it('lists published items plus owned rows and never reads a secret column', async () => {
    const archivedId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
    const draftId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3';
    const challengeId = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4';
    push('marketplace_items', [{ ...itemRow, challenge_id: challengeId }]);
    push('marketplace_purchases', [
      { item_id: archivedId, price_paid: 90 },
      { item_id: draftId, price_paid: 10 },
    ]);
    push('marketplace_items', [
      {
        ...itemRow,
        id: archivedId,
        status: 'archived',
        title: 'Retiré',
        challenge_id: null,
      },
      {
        ...itemRow,
        id: draftId,
        status: 'draft',
        title: 'Brouillon',
        challenge_id: null,
      },
    ]);
    push('challenges', [{ id: challengeId, title: 'Boucle bornée' }]);
    push('user_equipped_items', []);

    const items = await service.listItems(userId);

    expect(items.map((item) => item.status)).toEqual(['published', 'archived']);
    expect(items[0]?.challenge_title).toBe('Boucle bornée');
    expect(items[1]?.owned).toBe(true);
    expect(tables).not.toContain('marketplace_secrets');
    expect(selects).toEqual([
      'id, kind, title, description, price_credits, preview, status, animation_key, challenge_id',
      'item_id, price_paid',
      'id, kind, title, description, price_credits, preview, status, animation_key, challenge_id',
      'id, title',
      'slot, item_id',
    ]);
  });

  it('lists challenges as id and title only', async () => {
    const challengeId = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4';
    push('challenges', [
      { id: challengeId, title: 'Boucle bornée', difficulty: 'beginner' },
    ]);

    await expect(service.listChallenges(userId)).resolves.toEqual([
      { id: challengeId, title: 'Boucle bornée' },
    ]);
    expect(tables).toEqual(['challenges']);
    expect(selects).toEqual(['id, title']);
  });

  it('passes the authenticated user id to purchase, never a body field', async () => {
    rpc.mockResolvedValue({
      data: [{ credits_balance: 60, already_owned: false, hint_content: null }],
      error: null,
    });
    push('marketplace_items', itemRow);
    push('marketplace_purchases', [{ item_id: itemId, price_paid: 40 }]);
    push('user_equipped_items', []);

    const result = await service.purchase(userId, itemId);

    expect(rpc).toHaveBeenCalledWith('purchase_marketplace_item', {
      p_user_id: userId,
      p_item_id: itemId,
    });
    expect(result.credits_balance).toBe(60);
    expect(result.already_owned).toBe(false);
  });

  it.each([
    ['forbidden', ForbiddenException, 403],
    ['unavailable', NotFoundException, 404],
    ['insufficient_credits', ConflictException, 409],
    ['kind_immutable', ConflictException, 409],
    ['purchased_item_not_draft', ConflictException, 409],
    ['purchased_item_not_deletable', ConflictException, 409],
  ] as const)('maps P0001 %s', async (message, type, status) => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message } });
    const error = await service
      .purchase(userId, itemId)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(type);
    expect((error as { getStatus: () => number }).getStatus()).toBe(status);
    expect(
      (error as { getResponse: () => { code?: string } }).getResponse().code,
    ).toBe(message);
  });

  it('turns an unexpected Postgres error into a generic 500 and logs only code, rpc and user', async () => {
    const spy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    rpc.mockResolvedValue({
      data: null,
      error: {
        code: '23514',
        message: 'hint body SECRET PHRASE',
        details: 'details leak',
        hint: 'hint leak',
      },
    });

    const error = await service
      .purchase(userId, itemId)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InternalServerErrorException);
    expect((error as InternalServerErrorException).message).toBe(
      'An unexpected error occurred.',
    );
    const logged = spy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logged).toContain('code=23514');
    expect(logged).toContain('rpc=purchase_marketplace_item');
    expect(logged).toContain(`user=${userId}`);
    expect(logged).not.toContain('SECRET PHRASE');
    expect(logged).not.toContain('details leak');
    expect(logged).not.toContain('hint leak');
    expect((error as InternalServerErrorException).message).toBe(
      'An unexpected error occurred.',
    );
    expect(
      JSON.stringify((error as InternalServerErrorException).getResponse()),
    ).not.toContain('SECRET PHRASE');
    spy.mockRestore();
  });

  it('does not pass through a P0001 message outside the exact list', async () => {
    const spy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    rpc.mockResolvedValue({
      data: null,
      error: {
        code: 'P0001',
        message: 'forbidden SECRET PHRASE',
        details: 'body leak',
      },
    });

    const error = await service
      .purchase(userId, itemId)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InternalServerErrorException);
    expect(
      JSON.stringify((error as InternalServerErrorException).getResponse()),
    ).not.toContain('SECRET PHRASE');
    expect(
      spy.mock.calls.map((call) => String(call[0])).join('\n'),
    ).not.toContain('SECRET PHRASE');
    spy.mockRestore();
  });

  it('sends hint_body and the admin id, never a caller id taken from the body', async () => {
    rpc.mockResolvedValueOnce({ data: itemId, error: null });
    rpc.mockResolvedValueOnce({ data: [], error: null });
    push('marketplace_items', itemRow);
    push('user_equipped_items', []);

    await service.saveItem(
      userId,
      {
        kind: 'hint',
        title: 'Indice',
        description: 'Aide',
        price_credits: 30,
        status: 'published',
        preview: '?',
        challenge_id: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',
        hint_body: 'secret phrase',
      },
      null,
    );

    expect(rpc).toHaveBeenNthCalledWith(1, 'marketplace_admin_save_item', {
      p_admin_id: userId,
      p_item_id: null,
      p_kind: 'hint',
      p_title: 'Indice',
      p_description: 'Aide',
      p_price_credits: 30,
      p_status: 'published',
      p_preview: '?',
      p_animation_key: null,
      p_challenge_id: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',
      p_hint_body: 'secret phrase',
    });
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty('p_user_id');
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty('hint_text');
  });

  it('accepts a uuid array from purchased_ids and null from a void call', async () => {
    rpc.mockResolvedValueOnce({ data: [itemId], error: null });
    push('marketplace_items', [itemRow]);
    push('user_equipped_items', []);
    const listed = await service.listAdmin(userId);
    expect(listed[0]?.has_purchases).toBe(true);
    expect(rpc).toHaveBeenCalledWith('marketplace_admin_purchased_ids', {
      p_admin_id: userId,
      p_item_ids: [itemId],
    });

    rpc.mockResolvedValueOnce({ data: null, error: null });
    push('marketplace_purchases', []);
    await expect(service.unequip(userId, 'icon')).resolves.toEqual({
      items: [],
      equipped: { icon: null, animation: null },
    });
  });
});
