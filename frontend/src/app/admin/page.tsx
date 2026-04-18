"use client";

import { useState } from "react";
import TopBar from "../../components/TopBar";
import AuthGuard from "../../components/AuthGuard";
import { useApi, api, type ApiError } from "../../lib/api";
import type { AuthUser } from "../../lib/auth";
import { UserPlus, Trash2, RefreshCw, ShieldCheck } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-orange/15 text-orange-deep",
  supervisor: "bg-blue-50 text-blue-700",
  inspector: "bg-green-50 text-green-700",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-[5px] ${ROLE_COLORS[role] ?? "bg-ink/5 text-ink/60"}`}>
      {role}
    </span>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard requiredRole="admin">
      <AdminPageInner />
    </AuthGuard>
  );
}

function AdminPageInner() {
  const { data: users, loading, error, refetch } = useApi<AuthUser[]>(() => api.listUsers(), []);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", password: "", role: "inspector", email: "" });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await api.createUser({
        username: form.username,
        password: form.password,
        role: form.role,
        email: form.email || undefined,
      });
      setForm({ username: "", password: "", role: "inspector", email: "" });
      setShowCreate(false);
      refetch();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number, username: string) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await api.deleteUser(id);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  async function handleToggleActive(user: AuthUser) {
    try {
      await api.updateUser(user.id, { active: !user.active });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  return (
    <div className="space-y-6 rise">
      <TopBar crumbs={[{ label: "RetroGuard" }, { label: "Admin · Staff users" }]} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-orange" strokeWidth={1.8} />
          <h1 className="text-[17px] font-semibold text-ink">Staff user management</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="pill bg-paper/60 hover:bg-paper text-ink/65 border border-ink/5 w-9 !px-0"
            title="Refresh"
          >
            <RefreshCw className="w-[14px] h-[14px]" strokeWidth={1.8} />
          </button>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="pill flex items-center gap-2 text-[12.5px] font-medium text-white"
            style={{ background: "linear-gradient(140deg,#FF8B5A,#FF6B35)" }}
          >
            <UserPlus className="w-[14px] h-[14px]" strokeWidth={2} />
            Add user
          </button>
        </div>
      </div>

      {/* Create user form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-[16px] bg-paper border border-ink/[0.07] p-5 space-y-4 shadow-sm"
        >
          <h2 className="text-[13.5px] font-semibold text-ink">New staff user</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-ink/55 uppercase tracking-[0.12em]">Username</label>
              <input
                required
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="w-full h-9 rounded-[8px] border border-ink/10 bg-paper-2/60 px-3 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-orange/40"
                placeholder="jsmith"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-ink/55 uppercase tracking-[0.12em]">Password</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full h-9 rounded-[8px] border border-ink/10 bg-paper-2/60 px-3 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-orange/40"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-ink/55 uppercase tracking-[0.12em]">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full h-9 rounded-[8px] border border-ink/10 bg-paper-2/60 px-3 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-orange/40"
              >
                <option value="inspector">Inspector</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-ink/55 uppercase tracking-[0.12em]">Email (optional)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full h-9 rounded-[8px] border border-ink/10 bg-paper-2/60 px-3 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-orange/40"
                placeholder="j.smith@nhai.gov.in"
              />
            </div>
          </div>
          {createError && (
            <p className="text-[12px] text-red-600 bg-red-50 rounded-[8px] px-3 py-2">{createError}</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={creating}
              className="pill text-[12.5px] font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(140deg,#FF8B5A,#FF6B35)" }}
            >
              {creating ? "Creating…" : "Create user"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="pill bg-paper text-ink/65 border border-ink/5 text-[12.5px]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Users table */}
      {loading && (
        <p className="text-[13px] text-ink/50 py-6 text-center">Loading users…</p>
      )}
      {error && (
        <p className="text-[13px] text-red-600 bg-red-50 rounded-[12px] px-4 py-3">{error.message}</p>
      )}
      {users && (
        <div className="rounded-[16px] bg-paper border border-ink/[0.07] overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-ink/[0.06]">
                <th className="text-left px-5 py-3 text-[10.5px] font-medium text-ink/45 uppercase tracking-[0.14em]">User</th>
                <th className="text-left px-4 py-3 text-[10.5px] font-medium text-ink/45 uppercase tracking-[0.14em]">Role</th>
                <th className="text-left px-4 py-3 text-[10.5px] font-medium text-ink/45 uppercase tracking-[0.14em]">Status</th>
                <th className="text-left px-4 py-3 text-[10.5px] font-medium text-ink/45 uppercase tracking-[0.14em]">Created</th>
                <th className="text-left px-4 py-3 text-[10.5px] font-medium text-ink/45 uppercase tracking-[0.14em]">Last login</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.04]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-ink/[0.015] transition">
                  <td className="px-5 py-3">
                    <div className="font-medium text-ink">{u.username}</div>
                    {u.email && <div className="text-[11px] text-ink/40">{u.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`text-[10.5px] font-medium px-2 py-0.5 rounded-[5px] transition ${
                        u.active
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-ink/5 text-ink/40 hover:bg-ink/10"
                      }`}
                    >
                      {u.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-ink/50 font-mono tabular">
                    {u.created_at.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-ink/50 font-mono tabular">
                    {u.last_login_at ? u.last_login_at.slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      className="p-1.5 rounded-[7px] text-ink/30 hover:text-red-500 hover:bg-red-50 transition"
                      title={`Delete ${u.username}`}
                    >
                      <Trash2 className="w-[13px] h-[13px]" strokeWidth={1.8} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
