"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, RefreshCw, KeyRound, X, Copy, Users,
} from "lucide-react";
import TopBar from "../../components/TopBar";
import {
  api,
  type ApiContributor,
  type ApiContributorWithKey,
} from "../../lib/api";

/* ==========================================================
   /contributors — Layer 4: public dashcam partners
   ========================================================== */
export default function ContributorsPage() {
  const [rows, setRows] = useState<ApiContributor[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [justIssued, setJustIssued] = useState<ApiContributorWithKey | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      setRows(await api.listContributors());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (c: ApiContributor) => {
    await api.updateContributor(c.id, { active: !c.active });
    load();
  };

  const rotate = async (c: ApiContributor) => {
    if (!confirm(`Rotate API key for "${c.name}"? The old key will stop working immediately.`)) return;
    try {
      const res = await api.rotateContributorKey(c.id);
      setJustIssued(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const del = async (c: ApiContributor) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    await api.deleteContributor(c.id);
    load();
  };

  return (
    <div className="px-6 pt-4 pb-10 max-w-[1480px]">
      <TopBar crumbs={[{ label: "RetroGuard" }, { label: "Contributors · dashcam partners (Layer 4)" }]} />

      <div className="mb-6 rise" style={{ animationDelay: "40ms" }}>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-3">
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--color-orange)" }} />
              Layer 4 · Crowdsourced dashcam
            </div>
            <h1 className="text-[44px] font-semibold tracking-[-0.018em] leading-[1.02] text-ink">
              Partner fleets. Public keys.
              <span className="block text-ink/55 font-normal text-[22px] mt-1">
                Issue API keys to dashcam fleets and civic contributors. Measurements are attributed and trust-weighted automatically.
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={load} className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="pill text-white font-medium gap-2 shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)]"
              style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
              New contributor
            </button>
          </div>
        </div>
      </div>

      {err && <div className="mb-4 text-[12px] text-alarm">{err}</div>}

      <div className="card overflow-hidden rise" style={{ animationDelay: "120ms" }}>
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="w-5 h-5 text-ink/40 mx-auto mb-3" />
            <div className="text-[14px] font-semibold text-ink mb-1">No contributors yet</div>
            <div className="text-[12px] text-ink/55 mb-4">
              Issue an API key to a fleet or civic group to start accepting crowdsourced dashcam uploads.
            </div>
          </div>
        ) : (
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-[0.18em] text-ink/50">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">Trust</th>
                <th className="text-left px-4 py-3 font-medium">Last used</th>
                <th className="text-center px-4 py-3 font-medium">Active</th>
                <th className="text-right px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="text-[13px] border-t border-ink/5 hover:bg-paper/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{c.name}</div>
                    {c.contact_email && <div className="text-[11px] text-ink/55">{c.contact_email}</div>}
                  </td>
                  <td className="px-4 py-3 capitalize">{c.contributor_type}</td>
                  <td className="px-4 py-3 text-right font-mono tabular">{c.trust_level.toFixed(2)}</td>
                  <td className="px-4 py-3 text-ink/70 font-mono text-[11.5px]">
                    {c.last_used_at ? new Date(c.last_used_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`text-[10.5px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        c.active ? "bg-green-500/15 text-green-700" : "bg-ink/10 text-ink/50"
                      }`}
                    >
                      {c.active ? "active" : "revoked"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => rotate(c)}
                      title="Rotate API key"
                      className="w-7 h-7 rounded-md hover:bg-ink/5 text-ink/60 inline-flex items-center justify-center"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => del(c)}
                      title="Delete"
                      className="w-7 h-7 rounded-md hover:bg-alarm/10 text-alarm/70 inline-flex items-center justify-center ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <ContributorForm
          onClose={() => setShowForm(false)}
          onCreated={(c) => {
            setShowForm(false);
            setJustIssued(c);
            load();
          }}
        />
      )}

      {justIssued && (
        <KeyIssuedModal contributor={justIssued} onClose={() => setJustIssued(null)} />
      )}

      <div className="mt-8 flex items-center justify-between text-[10.5px] text-ink/40 font-mono uppercase tracking-[0.18em]">
        <span>retroguard · layer 4 · contributor registry</span>
        <span>{rows.length} total · {rows.filter((c) => c.active).length} active</span>
      </div>
    </div>
  );
}

function ContributorForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: ApiContributorWithKey) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    contributor_type: "fleet" as "fleet" | "civic" | "individual" | "partner",
    trust_level: "0.5",
    contact_email: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setSubmitting(true);
    try {
      const c = await api.createContributor({
        name: form.name,
        contributor_type: form.contributor_type,
        trust_level: parseFloat(form.trust_level),
        contact_email: form.contact_email || null,
        notes: form.notes || null,
      });
      onCreated(c);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="New contributor" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <FieldCol span={2} label="Organization / person name">
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mumbai Taxi Collective" />
        </FieldCol>
        <Field label="Type">
          <select className={inputCls} value={form.contributor_type} onChange={(e) => setForm({ ...form, contributor_type: e.target.value as typeof form.contributor_type })}>
            <option value="fleet">Fleet</option>
            <option value="civic">Civic group</option>
            <option value="individual">Individual</option>
            <option value="partner">Partner org</option>
          </select>
        </Field>
        <Field label="Trust level (0–1)">
          <input className={inputCls} value={form.trust_level} onChange={(e) => setForm({ ...form, trust_level: e.target.value })} />
        </Field>
        <FieldCol span={2} label="Contact email">
          <input className={inputCls} value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="ops@example.in" />
        </FieldCol>
        <FieldCol span={2} label="Notes">
          <textarea className={`${inputCls} h-[72px] py-2`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </FieldCol>
      </div>
      {err && <div className="mt-3 text-[12px] text-alarm">{err}</div>}
      <div className="mt-5 flex items-center justify-end gap-2">
        <button onClick={onClose} className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75">Cancel</button>
        <button
          disabled={submitting || !form.name}
          onClick={submit}
          className="pill text-white font-medium shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
        >
          {submitting ? "Issuing key…" : "Create + issue key"}
        </button>
      </div>
    </ModalShell>
  );
}

function KeyIssuedModal({
  contributor,
  onClose,
}: {
  contributor: ApiContributorWithKey;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(contributor.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <ModalShell title="API key issued" onClose={onClose}>
      <p className="text-[12.5px] text-ink/70 mb-3">
        Copy this key now — it <span className="font-semibold">won&rsquo;t be shown again</span>.
        Share it with <span className="font-medium">{contributor.name}</span> securely.
      </p>
      <div className="bg-ink/5 rounded-lg p-3 font-mono text-[12.5px] break-all mb-3">
        {contributor.api_key}
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={copy}
          className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 gap-2"
        >
          <Copy className="w-3.5 h-3.5" />
          {copied ? "Copied" : "Copy to clipboard"}
        </button>
        <button
          onClick={onClose}
          className="pill text-white font-medium"
          style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
        >
          Done
        </button>
      </div>
      <div className="mt-4 text-[11px] text-ink/55">
        The partner should send it as <code className="font-mono text-ink/75">X-API-Key</code> on
        requests to <code className="font-mono text-ink/75">POST /api/contribute/video</code>.
      </div>
    </ModalShell>
  );
}

/* Modal helpers (copied locally) */
const inputCls =
  "w-full bg-paper/60 border border-ink/10 rounded-lg h-9 px-2 text-[13px] focus:outline-none focus:border-orange/60";

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-ink/5 flex items-center justify-between">
          <div className="text-[15px] font-semibold text-ink">{title}</div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-ink/5 flex items-center justify-center text-ink/60">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink/55 font-medium">{label}</span>
      {children}
    </label>
  );
}
function FieldCol({ label, children, span }: { label: string; children: React.ReactNode; span: number }) {
  return (
    <label className={`flex flex-col gap-1 col-span-${span}`}>
      <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink/55 font-medium">{label}</span>
      {children}
    </label>
  );
}
