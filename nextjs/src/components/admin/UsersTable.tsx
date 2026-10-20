'use client';

import { useEffect, useState } from 'react';
import { apiRequest, ApiError } from '@/lib/api';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'developer' | 'recruiter';
  status: 'active' | 'suspended';
  createdAt: string;
  avatarUrl?: string | null;
  xp?: number;
}

interface ListUsersResponse {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  limit?: number;
}

interface UsersTableProps {
  currentUserId?: string;
}

export function mapAdminProblemCode(status: number, code?: string, detail?: string): string {
  if (status === 403) return 'Not authorized';
  if (status === 409) {
    if (code === 'last_admin' || /last admin/i.test(detail || '')) return 'Cannot demote or delete the last admin';
    if (code === 'self_demotion_forbidden' || /own role/i.test(detail || '')) return 'Cannot change own role';
    if (code === 'self_suspension_forbidden' || /own status/i.test(detail || '')) return 'Cannot suspend own account';
    if (code === 'self_delete_forbidden' || /self/i.test(detail || '')) return 'Cannot delete own account via admin route';
  }
  return detail || 'Operation failed';
}

export function UsersTable({ currentUserId }: UsersTableProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals state
  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null);
  const [targetRole, setTargetRole] = useState<'admin' | 'developer' | 'recruiter'>('developer');

  const [statusModalUser, setStatusModalUser] = useState<AdminUser | null>(null);
  const [statusReason, setStatusReason] = useState('');

  const [deleteModalUser, setDeleteModalUser] = useState<AdminUser | null>(null);
  const [confirmUsername, setConfirmUsername] = useState('');

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        if (roleFilter !== 'all') params.set('role', roleFilter);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());

        const data = await apiRequest<ListUsersResponse>(
          `/admin/users?${params.toString()}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setUsers(data.items);
        setTotal(data.total);
        setErrorMessage(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) {
          setErrorMessage(
            mapAdminProblemCode(err.status, err.problem.code, err.problem.detail || err.problem.title)
          );
        } else {
          setErrorMessage('Failed to load users. Please check your connection.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [page, pageSize, roleFilter, statusFilter, debouncedQuery, refreshKey]);

  // Handlers for mutations
  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleModalUser) return;
    setModalSubmitting(true);
    setModalError(null);
    try {
      await apiRequest(`/admin/users/${roleModalUser.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: targetRole, new_role: targetRole }),
      });
      setSuccessMessage(`Rôle de ${roleModalUser.username} mis à jour avec succès (${targetRole}).`);
      setRoleModalUser(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(
          mapAdminProblemCode(err.status, err.problem.code, err.problem.detail || err.problem.title)
        );
      } else {
        setModalError('Erreur inattendue lors du changement de rôle.');
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalUser) return;
    const nextStatus = statusModalUser.status === 'active' ? 'suspended' : 'active';
    const trimmedReason = statusReason.trim();
    if (!trimmedReason) {
      setModalError('Le motif (reason) est obligatoire.');
      return;
    }
    if (trimmedReason.length > 500) {
      setModalError('Le motif ne doit pas dépasser 500 caractères.');
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      await apiRequest(`/admin/users/${statusModalUser.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          new_status: nextStatus,
          reason: trimmedReason,
        }),
      });
      setSuccessMessage(
        `Compte ${nextStatus === 'suspended' ? 'suspendu' : 'réactivé'} pour ${statusModalUser.username}.`
      );
      setStatusModalUser(null);
      setStatusReason('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(
          mapAdminProblemCode(err.status, err.problem.code, err.problem.detail || err.problem.title)
        );
      } else {
        setModalError('Erreur inattendue lors de la mise à jour du statut.');
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModalUser) return;
    if (confirmUsername !== deleteModalUser.username) {
      setModalError('Le nom d’utilisateur saisi ne correspond pas.');
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      await apiRequest(`/admin/users/${deleteModalUser.id}`, {
        method: 'DELETE',
      });
      setSuccessMessage(`Le compte ${deleteModalUser.username} a été définitivement supprimé.`);
      setDeleteModalUser(null);
      setConfirmUsername('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(
          mapAdminProblemCode(err.status, err.problem.code, err.problem.detail || err.problem.title)
        );
      } else {
        setModalError('Erreur inattendue lors de la suppression.');
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 shadow-2xl">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/40 px-3 py-1 text-xs font-mono font-medium text-purple-300">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
              <span>DEVARENA ADMIN PROTOCOL</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-100 sm:text-3xl">
              Console d’Administration Utilisateurs
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Gestion centralisée des identités, rôles de sécurité et traçabilité des comptes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2 font-mono text-xs text-zinc-400 shadow-inner">
              Total Utilisateurs : <span className="font-bold text-zinc-100">{total}</span>
            </div>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
              title="Rafraîchir les données"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/80 text-zinc-300 transition-all hover:border-zinc-500 hover:bg-zinc-700 hover:text-white disabled:opacity-50"
            >
              <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-4 text-sm text-emerald-200 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="rounded p-1 text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-100"
              aria-label="Fermer la notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/60 p-4 text-sm text-red-200 backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="rounded p-1 text-red-400 hover:bg-red-900/50 hover:text-red-100"
              aria-label="Fermer la notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:grid-cols-3 backdrop-blur-sm">
        {/* Search Input */}
        <div>
          <label htmlFor="search-users" className="block text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
            Recherche
          </label>
          <div className="relative mt-1">
            <input
              id="search-users"
              type="search"
              placeholder="Username ou email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={64}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Role Selector */}
        <div>
          <label htmlFor="role-filter" className="block text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
            Filtre Rôle
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
          >
            <option value="all">Tous les rôles (all)</option>
            <option value="admin">Admin</option>
            <option value="developer">Developer</option>
            <option value="recruiter">Recruiter</option>
          </select>
        </div>

        {/* Status Selector */}
        <div>
          <label htmlFor="status-filter" className="block text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider">
            Filtre Statut
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
          >
            <option value="all">Tous les statuts (all)</option>
            <option value="active">Actif (active)</option>
            <option value="suspended">Suspendu (suspended)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-950/80 text-xs font-mono uppercase tracking-wider text-zinc-400">
              <tr>
                <th scope="col" className="px-4 py-3">Utilisateur</th>
                <th scope="col" className="px-4 py-3">Rôle</th>
                <th scope="col" className="px-4 py-3">Statut</th>
                <th scope="col" className="px-4 py-3">XP / DevScore</th>
                <th scope="col" className="px-4 py-3">Date de Création</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {loading ? (
                // Skeleton loading state
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-zinc-800" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-28 rounded bg-zinc-800" />
                          <div className="h-2.5 w-36 rounded bg-zinc-800/70" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-5 w-16 rounded-md bg-zinc-800" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-5 w-16 rounded-md bg-zinc-800" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-12 rounded bg-zinc-800" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-3.5 w-20 rounded bg-zinc-800" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex gap-2">
                        <div className="h-7 w-14 rounded bg-zinc-800" />
                        <div className="h-7 w-20 rounded bg-zinc-800" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800/80 text-zinc-500">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-zinc-200">Aucun utilisateur trouvé</h3>
                      <p className="mt-1 text-xs text-zinc-400">
                        Aucun profil ne correspond aux filtres ou à la recherche actuels.
                      </p>
                      {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setRoleFilter('all');
                            setStatusFilter('all');
                            setPage(1);
                          }}
                          className="mt-4 rounded-lg border border-purple-500/40 bg-purple-950/40 px-3 py-1.5 font-mono text-xs font-medium text-purple-300 hover:bg-purple-900/50"
                        >
                          Réinitialiser les filtres
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const initial = (u.username?.[0] || u.email?.[0] || 'U').toUpperCase();

                  return (
                    <tr key={u.id} className="transition-colors hover:bg-zinc-800/30">
                      {/* Avatar / User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.avatarUrl}
                              alt={u.username}
                              className="h-9 w-9 rounded-full border border-zinc-700 object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-purple-500/30 bg-purple-950/50 font-mono text-xs font-bold text-purple-300 shadow-inner">
                              {initial}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 font-medium text-zinc-100">
                              <span>{u.username}</span>
                              {isSelf && (
                                <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-purple-300 border border-purple-500/40">
                                  VOUS
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-xs text-zinc-400 break-all">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-xs font-medium ${
                            u.role === 'admin'
                              ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                              : u.role === 'recruiter'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                              : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              u.role === 'admin'
                                ? 'bg-purple-400'
                                : u.role === 'recruiter'
                                ? 'bg-amber-400'
                                : 'bg-cyan-400'
                            }`}
                          />
                          {u.role}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-xs font-medium ${
                            u.status === 'active'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                              : 'bg-red-950/80 text-red-300 border border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              u.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                            }`}
                          />
                          {u.status === 'active' ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>

                      {/* XP / DevScore */}
                      <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                        <span className="inline-flex items-center gap-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-emerald-400 font-semibold">
                          ⚡ {u.xp ?? 100} XP
                        </span>
                      </td>

                      {/* Creation Date */}
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                        {new Date(u.createdAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Role action button */}
                          <button
                            type="button"
                            onClick={() => {
                              setRoleModalUser(u);
                              setTargetRole(u.role);
                              setModalError(null);
                            }}
                            disabled={isSelf}
                            title={isSelf ? 'Impossible de modifier votre propre rôle' : 'Modifier le rôle'}
                            className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-mono font-medium text-zinc-200 transition-all hover:border-purple-500/50 hover:bg-purple-950/40 hover:text-purple-200 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Rôle
                          </button>

                          {/* Status action button */}
                          <button
                            type="button"
                            onClick={() => {
                              setStatusModalUser(u);
                              setStatusReason('');
                              setModalError(null);
                            }}
                            disabled={isSelf}
                            title={
                              isSelf
                                ? 'Impossible de suspendre votre propre compte'
                                : u.status === 'active'
                                ? 'Suspendre ce compte'
                                : 'Réactiver ce compte'
                            }
                            className={`rounded-lg border px-2.5 py-1 text-xs font-mono font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                              u.status === 'active'
                                ? 'border-amber-800/80 bg-amber-950/40 text-amber-300 hover:border-amber-600 hover:bg-amber-900/50'
                                : 'border-emerald-800/80 bg-emerald-950/40 text-emerald-300 hover:border-emerald-600 hover:bg-emerald-900/50'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspendre' : 'Réactiver'}
                          </button>

                          {/* Delete action button */}
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteModalUser(u);
                              setConfirmUsername('');
                              setModalError(null);
                            }}
                            disabled={isSelf}
                            title={isSelf ? 'Impossible de supprimer votre propre compte' : 'Supprimer le compte'}
                            className="rounded-lg border border-red-900/60 bg-red-950/30 px-2 py-1 text-xs font-mono font-medium text-red-300 transition-all hover:border-red-600 hover:bg-red-900/50 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Suppr.
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 sm:flex-row sm:items-center sm:justify-between text-xs font-mono text-zinc-400">
        <div>
          Affichage page <span className="font-bold text-zinc-200">{page}</span> sur{' '}
          <span className="font-bold text-zinc-200">{totalPages}</span> ({total} profils)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-medium text-zinc-200 transition-all hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Précédent
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-medium text-zinc-200 transition-all hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Suivant →
          </button>
        </div>
      </div>

      {/* Change Role Modal */}
      {roleModalUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-purple-500/40 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-purple-400">
              <span className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
              <span className="text-xs font-mono uppercase tracking-wider">Attribution de Rôle</span>
            </div>
            <h2 id="role-modal-title" className="mt-1 text-lg font-bold text-zinc-100">
              Modifier le rôle de {roleModalUser.username}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Rôle actuel : <span className="font-mono font-semibold text-zinc-200">{roleModalUser.role}</span>
            </p>

            {modalError && (
              <div role="alert" className="mt-4 rounded-xl border border-red-500/40 bg-red-950/60 p-3 text-xs text-red-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleRoleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="new-role-select" className="block text-xs font-mono font-medium text-zinc-300">
                  Nouveau Rôle
                </label>
                <select
                  id="new-role-select"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as 'admin' | 'developer' | 'recruiter')}
                  className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                >
                  <option value="developer">developer — Accès compétitions et profil dev</option>
                  <option value="recruiter">recruiter — Consultation des talents et scores</option>
                  <option value="admin">admin — Privilèges complets d’administration</option>
                </select>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-[11px] text-zinc-400">
                ℹ️ Cette opération est protégée par <code className="text-purple-300">admin_set_role</code> et enregistrée dans le journal d’audit.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  disabled={modalSubmitting}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-mono font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || targetRole === roleModalUser.role}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-mono font-medium text-white shadow-lg transition-all hover:bg-purple-500 disabled:opacity-50"
                >
                  {modalSubmitting ? 'Application…' : 'Confirmer le rôle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend / Reactivate Modal */}
      {statusModalUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              <span className="text-xs font-mono uppercase tracking-wider">Statut du Compte</span>
            </div>
            <h2 id="status-modal-title" className="mt-1 text-lg font-bold text-zinc-100">
              {statusModalUser.status === 'active' ? 'Suspendre le compte' : 'Réactiver le compte'}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Cible : <span className="font-semibold text-zinc-200">{statusModalUser.username}</span> ({statusModalUser.email})
            </p>

            {modalError && (
              <div role="alert" className="mt-4 rounded-xl border border-red-500/40 bg-red-950/60 p-3 text-xs text-red-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleStatusSubmit} className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="status-reason-input" className="block text-xs font-mono font-medium text-zinc-300">
                    Motif obligatoire <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {statusReason.length} / 500
                  </span>
                </div>
                <textarea
                  id="status-reason-input"
                  required
                  rows={3}
                  maxLength={500}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Indiquez le motif précis pour la traçabilité dans l'audit_log…"
                  className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-[11px] text-zinc-400">
                🛡️ La suspension synchronise immédiatement un bannissement de session via Supabase Auth.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalUser(null)}
                  disabled={modalSubmitting}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-mono font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || !statusReason.trim()}
                  className={`rounded-lg px-4 py-2 text-xs font-mono font-medium text-white shadow-lg transition-all disabled:opacity-50 ${
                    statusModalUser.status === 'active'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {modalSubmitting ? 'Traitement…' : statusModalUser.status === 'active' ? 'Confirmer la suspension' : 'Confirmer la réactivation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteModalUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-zinc-950 p-6 shadow-2xl">
            <h2 id="delete-modal-title" className="text-lg font-bold text-red-400">
              Suppression Définitive de Compte
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Cette action supprimera toutes les données de profil et fichiers d’avatars pour{' '}
              <span className="font-semibold text-zinc-200">{deleteModalUser.username}</span>.
            </p>

            {modalError && (
              <div role="alert" className="mt-4 rounded-xl border border-red-500/40 bg-red-950/60 p-3 text-xs text-red-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleDeleteSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="confirm-delete-username" className="block text-xs font-mono font-medium text-zinc-300">
                  Tapez <span className="font-bold text-red-300">{deleteModalUser.username}</span> pour confirmer :
                </label>
                <input
                  id="confirm-delete-username"
                  type="text"
                  required
                  value={confirmUsername}
                  onChange={(e) => setConfirmUsername(e.target.value)}
                  placeholder={deleteModalUser.username}
                  className="mt-1.5 w-full rounded-xl border border-red-800/80 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalUser(null)}
                  disabled={modalSubmitting}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-mono font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || confirmUsername !== deleteModalUser.username}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-mono font-medium text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {modalSubmitting ? 'Suppression…' : 'Supprimer Définitivement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Alias de compatibilité
export { UsersTable as UserTable };
