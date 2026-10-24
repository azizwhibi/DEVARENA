'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, ApiError } from '@/lib/api';
import { useSkillsAccount } from '@/components/skills/SkillsWorkspace';
import {
  marketplaceApi,
  marketplaceMessage,
  type AdminMarketplaceItem,
  type ChallengeOption,
  type MarketplaceKind,
  type MarketplaceStatus,
  type SaveMarketplaceItem,
} from '@/lib/marketplace/api';

type Account = { id: string; username: string; email: string };

type UserPage = { items: Account[]; total: number };

const kinds: MarketplaceKind[] = ['icon', 'animation', 'hint'];
const statuses: MarketplaceStatus[] = ['draft', 'published', 'archived'];
const kindLabel = {
  icon: 'Icon',
  animation: 'Animation',
  hint: 'Hint',
} as const;
const statusLabel = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
} as const;

function emptyItem(): SaveMarketplaceItem {
  return {
    kind: 'icon',
    title: '',
    description: '',
    price_credits: 40,
    preview: '',
    status: 'draft',
  };
}

async function loadAccounts(): Promise<Account[]> {
  const collected: Account[] = [];
  let page = 1;
  let total = 0;
  do {
    const data = await apiRequest<UserPage>(
      `/admin/users?page=${page}&pageSize=100`,
    );
    collected.push(...data.items);
    total = data.total;
    page += 1;
  } while (collected.length < total && page <= 20);
  return collected;
}

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.problem.detail ?? error.message;
  return marketplaceMessage(error);
}

function itemPayload(draft: SaveMarketplaceItem): SaveMarketplaceItem {
  return {
    id: draft.id,
    kind: draft.kind,
    title: draft.title.trim(),
    description: draft.description,
    price_credits: draft.price_credits,
    preview: draft.preview,
    status: draft.status,
    ...(draft.kind === 'animation'
      ? { animation_key: draft.animation_key?.trim() }
      : {}),
    ...(draft.kind === 'hint'
      ? {
          ...(draft.challenge_id?.trim()
            ? { challenge_id: draft.challenge_id.trim() }
            : {}),
          hint_body: draft.hint_body?.trim(),
        }
      : {}),
  };
}

export function AdminMarketplace() {
  const user = useSkillsAccount();
  const userId = user.id;
  const loading = false;
  const [items, setItems] = useState<AdminMarketplaceItem[]>([]);
  const [draft, setDraft] = useState<SaveMarketplaceItem>(emptyItem);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<ChallengeOption[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantAmount, setGrantAmount] = useState(100);
  const [grantReason, setGrantReason] = useState('');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [next, options] = await Promise.all([
          marketplaceApi.listAdminItems(),
          marketplaceApi.listChallenges(),
        ]);
        let people: Account[] = [];
        try {
          people = await loadAccounts();
        } catch (caught) {
          if (!cancelled) setError(messageOf(caught));
        }
        if (!cancelled) {
          setItems(next);
          setChallenges(options);
          setAccounts(people);
          setGrantUserId((current) => current || people[0]?.id || '');
        }
      } catch (caught) {
        if (!cancelled) setError(messageOf(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function edit(item: AdminMarketplaceItem) {
    setDraft({
      id: item.id,
      kind: item.kind,
      title: item.title,
      description: item.description,
      price_credits: item.price_credits,
      preview: item.preview,
      status: item.status,
      animation_key: item.animation_key,
      challenge_id: item.challenge_id,
    });
    setNotice(null);
    setError(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = draft.price_credits;
    if (!draft.title.trim() || !Number.isInteger(price) || price < 1) {
      setError('A title is required. Price must be a non-negative integer.');
      return;
    }
    if (draft.kind === 'animation' && !draft.animation_key?.trim()) {
      setError('An animation requires a key.');
      return;
    }
    if (draft.kind === 'hint' && !draft.hint_body?.trim()) {
      setError('Hint content is required.');
      return;
    }
    if (
      draft.kind === 'hint' &&
      draft.status === 'published' &&
      !draft.challenge_id?.trim()
    ) {
      setError('A published hint requires a challenge.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await marketplaceApi.saveItem(itemPayload(draft));
      setItems(await marketplaceApi.listAdminItems());
      setDraft(emptyItem());
      setNotice(`${saved.title} saved.`);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function archive(item: AdminMarketplaceItem) {
    setBusy(true);
    setError(null);
    try {
      await marketplaceApi.archiveItem(item.id);
      setItems(await marketplaceApi.listAdminItems());
      setNotice(`${item.title} archived.`);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function grant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !grantUserId ||
      !grantReason.trim() ||
      !Number.isInteger(grantAmount) ||
      grantAmount < 1 ||
      grantAmount > 10000
    ) {
      setError('Choose a user, an amount from 1 to 10,000, and a reason.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const balance = await marketplaceApi.grantCredits({
        user_id: grantUserId,
        amount: grantAmount,
        reason: grantReason.trim(),
      });
      setGrantReason('');
      setNotice(`Credits granted. New balance: ${balance}.`);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p role="status" aria-busy="true" className="text-sm text-zinc-400">
        Loading session…
      </p>
    );
  }

  return (
    <div data-marketplace className="page-container flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-widest text-[#C4B5FD]">
            ADMIN
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Shop items</h1>
        </div>
        <Link
          href="/marketplace"
          className="inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-[#151925] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          View shop
        </Link>
      </header>
      {notice ? <p role="status">{notice}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(event) => void save(event)}
        className="grid grid-cols-1 gap-4 rounded-2xl border border-[#252C3A] bg-card p-5 sm:grid-cols-2"
      >
        <h2 className="sm:col-span-2 text-lg font-semibold">
          {draft.id ? 'Edit item' : 'New item'}
        </h2>
        <label className="flex flex-col gap-2 text-sm">
          Type
          <select
            value={draft.kind}
            disabled={Boolean(draft.id)}
            onChange={(event) => {
              const kind = event.target.value as MarketplaceKind;
              setDraft({
                ...draft,
                kind,
                animation_key:
                  kind === 'animation' ? draft.animation_key : undefined,
                challenge_id: kind === 'hint' ? draft.challenge_id : undefined,
                hint_body: kind === 'hint' ? draft.hint_body : undefined,
              });
            }}
            className="min-h-11 rounded-lg border border-zinc-700 bg-[#090C11] px-3"
          >
            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {kindLabel[kind]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Status
          <select
            value={draft.status}
            onChange={(event) =>
              setDraft({
                ...draft,
                status: event.target.value as MarketplaceStatus,
              })
            }
            className="min-h-11 rounded-lg border border-zinc-700 bg-[#090C11] px-3"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          Title
          <input
            value={draft.title}
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
            required
            className="min-h-11 rounded-lg border border-zinc-700 bg-[#090C11] px-3"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          Description
          <textarea
            value={draft.description}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
            rows={3}
            className="rounded-lg border border-zinc-700 bg-[#090C11] px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Price in credits
          <input
            type="number"
            min={1}
            step={1}
            value={draft.price_credits}
            onChange={(event) =>
              setDraft({ ...draft, price_credits: Number(event.target.value) })
            }
            required
            className="min-h-11 rounded-lg border border-zinc-700 bg-[#090C11] px-3"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Preview
          <input
            value={draft.preview}
            onChange={(event) =>
              setDraft({ ...draft, preview: event.target.value })
            }
            className="min-h-11 rounded-lg border border-zinc-700 bg-[#090C11] px-3 font-mono"
          />
        </label>
        {draft.kind === 'animation' ? (
          <label className="flex flex-col gap-2 text-sm sm:col-span-2">
            Animation key
            <input
              value={draft.animation_key ?? ''}
              onChange={(event) =>
                setDraft({ ...draft, animation_key: event.target.value })
              }
              required
              className="min-h-11 rounded-lg border border-zinc-700 bg-[#090C11] px-3"
            />
          </label>
        ) : null}
        {draft.kind === 'hint' ? (
          <>
            <label className="flex flex-col gap-2 text-sm">
              Challenge
              <select
                value={draft.challenge_id ?? ''}
                onChange={(event) =>
                  setDraft({ ...draft, challenge_id: event.target.value })
                }
                required={draft.status === 'published'}
                className="min-h-11 rounded-lg border border-zinc-700 bg-[#090C11] px-3"
              >
                <option value="">None</option>
                {challenges.map((challenge) => (
                  <option key={challenge.id} value={challenge.id}>
                    {challenge.title}
                  </option>
                ))}
                {draft.challenge_id &&
                !challenges.some(
                  (challenge) => challenge.id === draft.challenge_id,
                ) ? (
                  <option value={draft.challenge_id}>
                    {draft.challenge_id}
                  </option>
                ) : null}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm sm:col-span-2">
              Hint content
              <textarea
                value={draft.hint_body ?? ''}
                onChange={(event) =>
                  setDraft({ ...draft, hint_body: event.target.value })
                }
                required
                rows={3}
                className="rounded-lg border border-zinc-700 bg-[#090C11] px-3 py-2"
              />
              <span className="text-xs text-[#A1AABD]">
                Enter this each time you save. The list does not expose hint
                content.
              </span>
            </label>
          </>
        ) : null}
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="arena-btn inline-flex min-h-11 items-center rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          {draft.id ? (
            <button
              type="button"
              onClick={() => setDraft(emptyItem())}
              className="inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-[#151925] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              New item
            </button>
          ) : null}
        </div>
      </form>

      <form
        onSubmit={(event) => void grant(event)}
        className="grid grid-cols-1 gap-4 rounded-2xl border border-[#252C3A] bg-card p-5 sm:grid-cols-2"
      >
        <h2 className="sm:col-span-2 text-lg font-semibold">Grant credits</h2>
        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          User
          <select
            value={grantUserId}
            onChange={(event) => setGrantUserId(event.target.value)}
            required
            className="min-h-11 rounded-lg border border-zinc-700 bg-[#090C11] px-3"
          >
            {accounts.length === 0 ? <option value="">No users</option> : null}
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.username} · {account.email}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Amount
          <input
            type="number"
            min={1}
            max={10000}
            step={1}
            value={grantAmount}
            onChange={(event) => setGrantAmount(Number(event.target.value))}
            required
            className="min-h-11 rounded-lg border border-zinc-700 bg-[#090C11] px-3"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Reason
          <input
            value={grantReason}
            onChange={(event) => setGrantReason(event.target.value)}
            required
            maxLength={500}
            className="min-h-11 rounded-lg border border-zinc-700 bg-[#090C11] px-3"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy || accounts.length === 0}
            className="arena-btn inline-flex min-h-11 items-center rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60"
          >
            {busy ? 'Sending…' : 'Grant credits'}
          </button>
        </div>
      </form>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-3 rounded-2xl border border-[#252C3A] bg-[#090C11] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-zinc-400">
                {kindLabel[item.kind]} · {statusLabel[item.status]} ·{' '}
                {item.price_credits} credits ·{' '}
                {item.has_purchases ? 'purchased' : 'no purchases'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => edit(item)}
                className="inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-[#151925] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void archive(item)}
                disabled={
                  busy || item.status === 'archived' || !item.has_purchases
                }
                className="inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-[#151925] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60"
              >
                {item.status === 'archived' ? 'Archived' : 'Archive'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
