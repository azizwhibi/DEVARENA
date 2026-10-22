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
}

interface ListUsersResponse {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

interface UsersTableProps {
  currentUserId?: string;
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
  const [targetRole, setTargetRole] = useState<
    'admin' | 'developer' | 'recruiter'
  >('developer');

  const [statusModalUser, setStatusModalUser] = useState<AdminUser | null>(
    null,
  );
  const [statusReason, setStatusReason] = useState('');

  const [deleteModalUser, setDeleteModalUser] = useState<AdminUser | null>(
    null,
  );
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
            err.problem.detail || err.problem.title || 'Failed to load users',
          );
        } else {
          setErrorMessage(
            'Failed to load users. Please check your connection.',
          );
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
        body: JSON.stringify({ role: targetRole }),
      });
      setSuccessMessage(
        `Updated role for ${roleModalUser.username} to ${targetRole}.`,
      );
      setRoleModalUser(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(
          err.problem.detail || err.problem.title || 'Could not change role',
        );
      } else {
        setModalError('Unexpected error changing role.');
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalUser) return;
    const nextStatus =
      statusModalUser.status === 'active' ? 'suspended' : 'active';
    if (!statusReason.trim()) {
      setModalError('Reason is required.');
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      await apiRequest(`/admin/users/${statusModalUser.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          reason: statusReason.trim(),
        }),
      });
      setSuccessMessage(
        `Account ${nextStatus === 'suspended' ? 'suspended' : 'reactivated'} for ${statusModalUser.username}.`,
      );
      setStatusModalUser(null);
      setStatusReason('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(
          err.problem.detail || err.problem.title || 'Could not change status',
        );
      } else {
        setModalError('Unexpected error changing status.');
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModalUser) return;
    if (confirmUsername !== deleteModalUser.username) {
      setModalError('Username confirmation does not match.');
      return;
    }
    setModalSubmitting(true);
    setModalError(null);
    try {
      await apiRequest(`/admin/users/${deleteModalUser.id}`, {
        method: 'DELETE',
      });
      setSuccessMessage(
        `Account ${deleteModalUser.username} has been permanently deleted.`,
      );
      setDeleteModalUser(null);
      setConfirmUsername('');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(
          err.problem.detail || err.problem.title || 'Could not delete user',
        );
      } else {
        setModalError('Unexpected error deleting user.');
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-zinc-100">
            User Management
          </h1>
          <p className="text-sm text-[#A1AABD]">
            View, manage roles, suspend, and delete user accounts.
          </p>
        </div>
        <div className="text-sm text-[#A1AABD]">
          Total Users:{' '}
          <span className="font-semibold text-zinc-200">{total}</span>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-emerald-800 bg-emerald-950/60 p-4 text-sm text-emerald-200"
        >
          <div className="flex items-center justify-between">
            <span>{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-emerald-200"
              aria-label="Dismiss alert"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-800 bg-red-950/60 p-4 text-sm text-red-200"
        >
          <div className="flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-200"
              aria-label="Dismiss alert"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-white/[0.06] bg-[#0F141D] p-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="search-users"
            className="block text-xs font-medium text-[#A1AABD]"
          >
            Search
          </label>
          <input
            id="search-users"
            type="search"
            placeholder="Search username or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            maxLength={64}
            className="mt-1 w-full rounded-lg border border-white/[0.12] bg-[#090C11] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="role-filter"
            className="block text-xs font-medium text-[#A1AABD]"
          >
            Role
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-white/[0.12] bg-[#090C11] px-3 py-2 text-sm text-zinc-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="developer">Developer</option>
            <option value="recruiter">Recruiter</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="status-filter"
            className="block text-xs font-medium text-[#A1AABD]"
          >
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-white/[0.12] bg-[#090C11] px-3 py-2 text-sm text-zinc-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0F141D]">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="border-b border-white/[0.06] bg-[#0F141D]/80 text-xs uppercase tracking-wider text-[#A1AABD]">
            <tr>
              <th scope="col" className="px-4 py-3">
                User
              </th>
              <th scope="col" className="px-4 py-3">
                Role
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                Created
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#A1AABD]">
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[#A1AABD]">
                  No users found matching current filters.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="hover:bg-[#151925]/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-100">
                        {u.username}
                      </div>
                      <div className="text-xs text-[#A1AABD]">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : u.role === 'recruiter'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          u.status === 'active'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-red-950 text-red-300 border border-red-800'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#A1AABD]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRoleModalUser(u);
                            setTargetRole(u.role);
                            setModalError(null);
                          }}
                          disabled={isSelf}
                          title={
                            isSelf ? 'Cannot change own role' : 'Change Role'
                          }
                          className="rounded border border-white/[0.12] bg-[#151925]/60 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Role
                        </button>

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
                              ? 'Cannot modify own status'
                              : u.status === 'active'
                                ? 'Suspend Account'
                                : 'Reactivate Account'
                          }
                          className={`rounded border px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-40 ${
                            u.status === 'active'
                              ? 'border-amber-800/80 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 focus:ring-amber-500'
                              : 'border-emerald-800/80 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 focus:ring-violet-400'
                          }`}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeleteModalUser(u);
                            setConfirmUsername('');
                            setModalError(null);
                          }}
                          disabled={isSelf}
                          title={
                            isSelf
                              ? 'Cannot delete self from admin route'
                              : 'Delete Account'
                          }
                          className="rounded border border-red-900/80 bg-red-950/40 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-900/50 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Delete
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

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-[#A1AABD]">
        <div>
          Showing page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-white/[0.12] bg-[#0F141D] px-3 py-1.5 font-medium text-zinc-200 hover:bg-[#151925] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-white/[0.12] bg-[#0F141D] px-3 py-1.5 font-medium text-zinc-200 hover:bg-[#151925] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {/* Change Role Modal */}
      {roleModalUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-white/[0.12] bg-[#0F141D] p-6 shadow-2xl">
            <h2
              id="role-modal-title"
              className="text-lg font-semibold text-zinc-100"
            >
              Change Role for {roleModalUser.username}
            </h2>
            <p className="mt-1 text-xs text-[#A1AABD]">
              Current role:{' '}
              <span className="font-semibold text-zinc-200">
                {roleModalUser.role}
              </span>
            </p>

            {modalError && (
              <div
                role="alert"
                className="mt-4 rounded border border-red-800 bg-red-950/60 p-3 text-xs text-red-200"
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleRoleSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="new-role-select"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Select New Role
                </label>
                <select
                  id="new-role-select"
                  value={targetRole}
                  onChange={(e) =>
                    setTargetRole(
                      e.target.value as 'admin' | 'developer' | 'recruiter',
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-white/[0.12] bg-[#090C11] px-3 py-2 text-sm text-zinc-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="developer">developer</option>
                  <option value="recruiter">recruiter</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  disabled={modalSubmitting}
                  className="rounded border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-[#151925]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    modalSubmitting || targetRole === roleModalUser.role
                  }
                  className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {modalSubmitting ? 'Saving…' : 'Confirm Role'}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-white/[0.12] bg-[#0F141D] p-6 shadow-2xl">
            <h2
              id="status-modal-title"
              className="text-lg font-semibold text-zinc-100"
            >
              {statusModalUser.status === 'active'
                ? 'Suspend Account'
                : 'Reactivate Account'}
            </h2>
            <p className="mt-1 text-xs text-[#A1AABD]">
              User:{' '}
              <span className="font-semibold text-zinc-200">
                {statusModalUser.username}
              </span>{' '}
              ({statusModalUser.email})
            </p>

            {modalError && (
              <div
                role="alert"
                className="mt-4 rounded border border-red-800 bg-red-950/60 p-3 text-xs text-red-200"
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleStatusSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="status-reason-input"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="status-reason-input"
                  required
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="State the reason for this action (audited)…"
                  className="mt-1 w-full rounded-lg border border-white/[0.12] bg-[#090C11] p-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalUser(null)}
                  disabled={modalSubmitting}
                  className="rounded border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-[#151925]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || !statusReason.trim()}
                  className={`rounded px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${
                    statusModalUser.status === 'active'
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-violet-600 hover:bg-violet-500'
                  }`}
                >
                  {modalSubmitting
                    ? 'Saving…'
                    : statusModalUser.status === 'active'
                      ? 'Suspend'
                      : 'Reactivate'}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-red-800 bg-[#0F141D] p-6 shadow-2xl">
            <h2
              id="delete-modal-title"
              className="text-lg font-semibold text-red-400"
            >
              Permanently Delete Account
            </h2>
            <p className="mt-1 text-xs text-[#A1AABD]">
              This will erase all personal profile data and avatar files for{' '}
              <span className="font-semibold text-zinc-200">
                {deleteModalUser.username}
              </span>
              . Challenge attempts will be anonymized.
            </p>

            {modalError && (
              <div
                role="alert"
                className="mt-4 rounded border border-red-800 bg-red-950/60 p-3 text-xs text-red-200"
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleDeleteSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="confirm-delete-username"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Type{' '}
                  <span className="font-semibold text-red-300">
                    {deleteModalUser.username}
                  </span>{' '}
                  to confirm:
                </label>
                <input
                  id="confirm-delete-username"
                  type="text"
                  required
                  value={confirmUsername}
                  onChange={(e) => setConfirmUsername(e.target.value)}
                  placeholder={deleteModalUser.username}
                  className="mt-1 w-full rounded-lg border border-red-800/80 bg-[#090C11] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalUser(null)}
                  disabled={modalSubmitting}
                  className="rounded border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-[#151925]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    modalSubmitting ||
                    confirmUsername !== deleteModalUser.username
                  }
                  className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {modalSubmitting ? 'Deleting…' : 'Delete Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
