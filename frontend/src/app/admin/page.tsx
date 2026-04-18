"use client";

import { useState } from "react";
import TopBar from "../../components/TopBar";
import AuthGuard from "../../components/AuthGuard";
import { useApi, api } from "../../lib/api";
import type { AuthUser } from "../../lib/auth";
import {
  UserPlus,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Download,
  ChevronDown,
} from "lucide-react";

/* Warm role badges — uses theme palette instead of cold Tailwind defaults */
const ROLE_CFG: Record<string, { bg: string; fg: string }> = {
  admin: {
    bg: "rgba(255,107,53,0.12)",
    fg: "var(--color-orange-deep)",
  },
  supervisor: {
    bg: "rgba(217,139,20,0.14)",
    fg: "#97580E",
  },
  inspector: {
    bg: "rgba(63,163,100,0.12)",
    fg: "#2E7E4A",
  },
};

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_CFG[role] ?? { bg: "rgba(139,131,120,0.12)", fg: "#5B564D" };
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] px-2 py-[3px] rounded-[6px]"
      style={{ background: c.bg, color: c.fg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: c.fg }}
      />
      {role}
    </span>
  );
}

function ActiveBadge({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] px-2 py-[3px] rounded-[6px] transition"
      style={{
        background: active
          ? "rgba(63,163,100,0.12)"
          : "rgba(139,131,120,0.12)",
        color: active ? "#2E7E4A" : "#5B564D",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: active ? "var(--color-go)" : "var(--color-mute)",
        }}
      />
      {active ? "Active" : "Inactive"}
    </button>
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
  const {
    data: users,
    loading,
    error,
    refetch,
  } = useApi<AuthUser[]>(() => api.listUsers(), []);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "inspector",
    email: "",
  });

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
      setCreateError(
        err instanceof Error ? err.message : "Failed to create user"
      );
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

  function handleExport() {
    if (!users) return;
    const payload = {
      generated_at: new Date().toISOString(),
      total: users.length,
      active: users.filter((u) => u.active).length,
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        active: u.active,
        created_at: u.created_at,
        last_login_at: u.last_login_at,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `retroguard-staff-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-6 pt-4 pb-10 max-w-[1480px]">
      <TopBar
        crumbs={[
          { label: "RetroGuard" },
          { label: "Admin · staff user management · role-gated" },
        ]}
      />

      {/* =====================================================
          Hero greeting
          ===================================================== */}
      <div className="mb-6 rise" style={{ animationDelay: "40ms" }}>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-3">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                style={{ background: "var(--color-orange)" }}
              />
              Admin panel
            </div>
            <h1 className="text-[44px] font-semibold tracking-[-0.018em] leading-[1.02] text-ink">
              Staff users.
              <span className="block text-ink/55 font-normal text-[26px] mt-1">
                {users?.length ?? "—"} registered ·{" "}
                {users?.filter((u) => u.active).length ?? "—"} active.
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => refetch()}
              className="pill bg-paper/60 hover:bg-paper text-ink/65 border border-ink/5 w-10 !px-0"
              title="Refresh"
            >
              <RefreshCw
                className="w-[14px] h-[14px]"
                strokeWidth={1.8}
              />
            </button>
            <button
              onClick={handleExport}
              disabled={!users || users.length === 0}
              className="pill bg-paper/60 hover:bg-paper text-ink/75 border border-ink/5 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download staff roster as JSON"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
              Export
            </button>
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="pill text-white font-medium gap-2 shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #FF8B5A, #E85A26)",
              }}
            >
              <UserPlus className="w-3.5 h-3.5" strokeWidth={2.25} />
              Add user
              <ChevronDown
                className={`w-3 h-3 opacity-60 transition ${
                  showCreate ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          Create user form (expandable)
          ===================================================== */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="card p-6 mb-5 rise"
          style={{ animationDelay: "60ms" }}
        >
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-3 font-medium">
            New staff user
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <FormField
              label="Username"
              required
              value={form.username}
              onChange={(v) => setForm((f) => ({ ...f, username: v }))}
              placeholder="jsmith"
            />
            <FormField
              label="Password"
              type="password"
              required
              value={form.password}
              onChange={(v) => setForm((f) => ({ ...f, password: v }))}
              placeholder="••••••••"
            />
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-ink/55 uppercase tracking-[0.14em]">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
                className="w-full h-10 rounded-[10px] border border-ink/[0.08] bg-cream/70 px-3 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-orange/40 transition"
              >
                <option value="inspector">Inspector</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <FormField
              label="Email (optional)"
              type="email"
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              placeholder="j.smith@nhai.gov.in"
            />
          </div>
          {createError && (
            <div
              className="text-[12px] font-medium px-4 py-2.5 rounded-[10px] mb-4"
              style={{
                background: "rgba(213,66,48,0.08)",
                color: "#9E2E1C",
              }}
            >
              {createError}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={creating}
              className="pill text-white font-medium gap-2 disabled:opacity-50 shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)]"
              style={{
                background: "linear-gradient(135deg, #FF8B5A, #E85A26)",
              }}
            >
              {creating ? "Creating…" : "Create user"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="pill bg-paper border border-ink/8 hover:bg-cream text-ink/75"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* =====================================================
          Users table
          ===================================================== */}
      {loading && (
        <div className="card p-4 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-2 py-3 animate-pulse"
            >
              <div className="h-3 w-24 bg-ink/[0.06] rounded-full" />
              <div className="h-3 w-20 bg-ink/[0.06] rounded-full" />
              <div className="h-3 w-16 bg-ink/[0.06] rounded-full" />
              <div className="h-3 w-24 bg-ink/[0.06] rounded-full ml-auto" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          className="card p-4 border-l-4"
          style={{ borderLeftColor: "var(--color-alarm)" }}
        >
          <div className="text-[13px] font-semibold" style={{ color: "var(--color-alarm)" }}>
            Couldn&rsquo;t load users
          </div>
          <div className="text-[11.5px] text-ink/55 mt-0.5 font-mono">
            {error.message}
          </div>
        </div>
      )}

      {users && (
        <div
          className="card overflow-hidden rise"
          style={{ animationDelay: "120ms" }}
        >
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th
                  className="text-left px-6 py-3 text-[10px] font-semibold text-ink/50 uppercase tracking-[0.14em] border-b"
                  style={{
                    background: "rgba(234,227,211,0.35)",
                    borderBottomColor: "rgba(28,27,25,0.06)",
                  }}
                >
                  User
                </th>
                <th
                  className="text-left px-4 py-3 text-[10px] font-semibold text-ink/50 uppercase tracking-[0.14em] border-b"
                  style={{
                    background: "rgba(234,227,211,0.35)",
                    borderBottomColor: "rgba(28,27,25,0.06)",
                  }}
                >
                  Role
                </th>
                <th
                  className="text-left px-4 py-3 text-[10px] font-semibold text-ink/50 uppercase tracking-[0.14em] border-b"
                  style={{
                    background: "rgba(234,227,211,0.35)",
                    borderBottomColor: "rgba(28,27,25,0.06)",
                  }}
                >
                  Status
                </th>
                <th
                  className="text-left px-4 py-3 text-[10px] font-semibold text-ink/50 uppercase tracking-[0.14em] border-b"
                  style={{
                    background: "rgba(234,227,211,0.35)",
                    borderBottomColor: "rgba(28,27,25,0.06)",
                  }}
                >
                  Created
                </th>
                <th
                  className="text-left px-4 py-3 text-[10px] font-semibold text-ink/50 uppercase tracking-[0.14em] border-b"
                  style={{
                    background: "rgba(234,227,211,0.35)",
                    borderBottomColor: "rgba(28,27,25,0.06)",
                  }}
                >
                  Last login
                </th>
                <th
                  className="px-4 py-3 border-b"
                  style={{
                    background: "rgba(234,227,211,0.35)",
                    borderBottomColor: "rgba(28,27,25,0.06)",
                  }}
                />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="group hover:bg-cream/40 transition"
                >
                  <td className="px-6 py-4 border-b border-ink/[0.035]">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg, #FFB58C, #FF6B35)",
                        }}
                      >
                        {u.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-ink">
                          {u.username}
                        </div>
                        {u.email && (
                          <div className="text-[10.5px] text-ink/45 font-mono">
                            {u.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 border-b border-ink/[0.035]">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-4 border-b border-ink/[0.035]">
                    <ActiveBadge
                      active={u.active}
                      onClick={() => handleToggleActive(u)}
                    />
                  </td>
                  <td className="px-4 py-4 border-b border-ink/[0.035] text-ink/55 font-mono tabular text-[11.5px]">
                    {u.created_at.slice(0, 10)}
                  </td>
                  <td className="px-4 py-4 border-b border-ink/[0.035] text-ink/55 font-mono tabular text-[11.5px]">
                    {u.last_login_at
                      ? u.last_login_at.slice(0, 10)
                      : "—"}
                  </td>
                  <td className="px-4 py-4 border-b border-ink/[0.035] text-right">
                    <button
                      onClick={() => handleDelete(u.id, u.username)}
                      className="w-8 h-8 rounded-[8px] flex items-center justify-center text-ink/30 hover:text-[#9E2E1C] hover:bg-[rgba(213,66,48,0.08)] transition"
                      title={`Delete ${u.username}`}
                    >
                      <Trash2
                        className="w-[14px] h-[14px]"
                        strokeWidth={1.8}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer ribbon */}
          <div
            className="flex items-center justify-between px-6 py-3 border-t border-ink/[0.06]"
            style={{ background: "rgba(246,241,229,0.35)" }}
          >
            <div className="text-[10.5px] font-mono tabular uppercase tracking-[0.14em] text-ink/50">
              {users.length} users registered
            </div>
            <div className="flex items-center gap-3 text-[10.5px] font-mono tabular text-ink/50">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--color-go)" }}
                />
                {users.filter((u) => u.active).length} active
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--color-mute)" }}
                />
                {users.filter((u) => !u.active).length} inactive
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between text-[10.5px] text-ink/40 font-mono uppercase tracking-[0.18em]">
        <span>retroguard · admin · staff management</span>
        <span>jwt auth · bcrypt · role-gated</span>
      </div>
    </div>
  );
}

/* =========================================================
   Shared form field
   ========================================================= */
function FormField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-ink/55 uppercase tracking-[0.14em]">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-[10px] border border-ink/[0.08] bg-cream/70 px-3 text-[13px] text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-orange/40 focus:bg-paper transition"
        style={{ paddingLeft: "12px", paddingRight: "12px" }}
        placeholder={placeholder}
      />
    </div>
  );
}
