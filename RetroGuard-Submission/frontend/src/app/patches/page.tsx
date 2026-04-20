"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit3, RefreshCw, Calculator, X, Sparkles } from "lucide-react";
import TopBar from "../../components/TopBar";
import { api, type ApiReferencePatch } from "../../lib/api";

/* ==========================================================
   /patches — Layer 3: Reference patch calibration
   ========================================================== */
export default function PatchesPage() {
  const [patches, setPatches] = useState<ApiReferencePatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ApiReferencePatch | null>(null);
  const [showCalc, setShowCalc] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      setPatches(await api.listPatches(false));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const del = async (id: number) => {
    if (!confirm("Delete this reference patch?")) return;
    try {
      await api.deletePatch(id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="px-6 pt-4 pb-10 max-w-[1480px]">
      <TopBar
        crumbs={[
          { label: "RetroGuard" },
          { label: "Reference patches · calibration catalog" },
        ]}
      />

      {/* Hero */}
      <div className="mb-6 rise" style={{ animationDelay: "40ms" }}>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-ink/50 mb-3">
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--color-orange)" }} />
              Layer 3 · Calibration
            </div>
            <h1 className="text-[44px] font-semibold tracking-[-0.018em] leading-[1.02] text-ink">
              Known patches. Absolute R_L.
              <span className="block text-ink/55 font-normal text-[22px] mt-1">
                Lab-certified retroreflective squares anchor every measurement to physics.
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowCalc(true)}
              className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 gap-2"
            >
              <Calculator className="w-3.5 h-3.5" />
              Calibrated R_L
            </button>
            <button
              onClick={load}
              className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75 gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="pill text-white font-medium gap-2 shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)]"
              style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
              Register patch
            </button>
          </div>
        </div>
      </div>

      {err && <div className="mb-4 text-[12px] text-alarm">{err}</div>}

      <div className="card overflow-hidden rise" style={{ animationDelay: "120ms" }}>
        {patches.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Sparkles className="w-5 h-5 text-ink/40 mx-auto mb-3" />
            <div className="text-[14px] font-semibold text-ink mb-1">No reference patches yet</div>
            <div className="text-[12px] text-ink/55 mb-4">Register your first patch to enable calibrated R_L estimation.</div>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="pill text-white font-medium gap-2"
              style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Register patch
            </button>
          </div>
        ) : (
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-[0.18em] text-ink/50">
                <th className="text-left px-4 py-3 font-medium">Label</th>
                <th className="text-right px-4 py-3 font-medium">Known R_L</th>
                <th className="text-left px-4 py-3 font-medium">Color</th>
                <th className="text-left px-4 py-3 font-medium">Highway · km</th>
                <th className="text-left px-4 py-3 font-medium">Certification</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {patches.map((p) => (
                <tr key={p.id} className="text-[13px] border-t border-ink/5 hover:bg-paper/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{p.label}</div>
                    {p.notes && <div className="text-[11px] text-ink/55 truncate max-w-[360px]">{p.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular">{p.known_rl}</td>
                  <td className="px-4 py-3 capitalize">{p.color}</td>
                  <td className="px-4 py-3 text-ink/70">
                    {p.highway_id ? `${p.highway_id}${p.chainage_km ? ` · ${p.chainage_km}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink/70 font-mono text-[11.5px]">{p.certification_ref ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10.5px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      p.active
                        ? "bg-[rgba(63,163,100,0.12)] text-[#2E7E4A]"
                        : "bg-ink/10 text-ink/50"
                    }`}>
                      {p.active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditing(p); setShowForm(true); }}
                      title="Edit"
                      className="w-7 h-7 rounded-md hover:bg-ink/5 text-ink/60 inline-flex items-center justify-center"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => del(p.id)}
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
        <PatchForm
          patch={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
      {showCalc && (
        <CalibratedRLModal patches={patches.filter((p) => p.active)} onClose={() => setShowCalc(false)} />
      )}

      <div className="mt-8 flex items-center justify-between text-[10.5px] text-ink/40 font-mono uppercase tracking-[0.18em]">
        <span>retroguard · layer 3 · reference patch catalog</span>
        <span>{patches.length} registered</span>
      </div>
    </div>
  );
}

/* ==========================================================
   Create / edit form
   ========================================================== */
function PatchForm({
  patch,
  onClose,
  onSaved,
}: {
  patch: ApiReferencePatch | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    label: patch?.label ?? "",
    known_rl: patch?.known_rl?.toString() ?? "500",
    color: patch?.color ?? "white",
    material_grade: patch?.material_grade ?? "",
    highway_id: patch?.highway_id ?? "",
    chainage_km: patch?.chainage_km?.toString() ?? "",
    deployed_at_lat: patch?.deployed_at_lat?.toString() ?? "",
    deployed_at_lon: patch?.deployed_at_lon?.toString() ?? "",
    certification_ref: patch?.certification_ref ?? "",
    notes: patch?.notes ?? "",
    active: patch?.active ?? true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setSubmitting(true);
    const payload = {
      label: form.label,
      known_rl: parseFloat(form.known_rl),
      color: form.color,
      material_grade: form.material_grade || null,
      highway_id: form.highway_id || null,
      chainage_km: form.chainage_km ? parseFloat(form.chainage_km) : null,
      deployed_at_lat: form.deployed_at_lat ? parseFloat(form.deployed_at_lat) : null,
      deployed_at_lon: form.deployed_at_lon ? parseFloat(form.deployed_at_lon) : null,
      certification_ref: form.certification_ref || null,
      notes: form.notes || null,
      active: form.active,
      installation_date: null,
    };
    try {
      if (patch) await api.updatePatch(patch.id, payload);
      else await api.createPatch(payload);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title={patch ? "Edit reference patch" : "Register reference patch"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <FieldCol span={2} label="Label">
          <input className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="DME toll plaza #2 · patch A" />
        </FieldCol>
        <Field label="Known R_L (lab certified)">
          <input className={inputCls} value={form.known_rl} onChange={(e) => setForm({ ...form, known_rl: e.target.value })} />
        </Field>
        <Field label="Color">
          <select className={inputCls} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
            <option value="white">white</option>
            <option value="yellow">yellow</option>
            <option value="orange">orange</option>
          </select>
        </Field>
        <Field label="Material grade">
          <input className={inputCls} value={form.material_grade} onChange={(e) => setForm({ ...form, material_grade: e.target.value })} placeholder="diamond_grade" />
        </Field>
        <Field label="Highway ID">
          <input className={inputCls} value={form.highway_id} onChange={(e) => setForm({ ...form, highway_id: e.target.value })} placeholder="NH-48" />
        </Field>
        <Field label="Chainage km">
          <input className={inputCls} value={form.chainage_km} onChange={(e) => setForm({ ...form, chainage_km: e.target.value })} />
        </Field>
        <Field label="GPS lat">
          <input className={inputCls} value={form.deployed_at_lat} onChange={(e) => setForm({ ...form, deployed_at_lat: e.target.value })} />
        </Field>
        <Field label="GPS lon">
          <input className={inputCls} value={form.deployed_at_lon} onChange={(e) => setForm({ ...form, deployed_at_lon: e.target.value })} />
        </Field>
        <FieldCol span={2} label="Certification reference">
          <input className={inputCls} value={form.certification_ref} onChange={(e) => setForm({ ...form, certification_ref: e.target.value })} placeholder="NIT-CAL-2026-091" />
        </FieldCol>
        <FieldCol span={2} label="Notes">
          <textarea className={`${inputCls} h-[72px] py-2`} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </FieldCol>
        <label className="col-span-2 flex items-center gap-2 text-[12.5px] text-ink/70">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Active (available for calibration)
        </label>
      </div>
      {err && <div className="mt-3 text-[12px] text-alarm">{err}</div>}
      <div className="mt-5 flex items-center justify-end gap-2">
        <button onClick={onClose} className="pill bg-paper/60 border border-ink/5 hover:bg-paper text-ink/75">Cancel</button>
        <button
          disabled={submitting || !form.label || !form.known_rl}
          onClick={submit}
          className="pill text-white font-medium shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
        >
          {submitting ? "Saving…" : patch ? "Save changes" : "Register"}
        </button>
      </div>
    </ModalShell>
  );
}

/* ==========================================================
   Calibrated R_L calculator
   ========================================================== */
function CalibratedRLModal({ patches, onClose }: { patches: ApiReferencePatch[]; onClose: () => void }) {
  const [patchId, setPatchId] = useState<string>(patches[0]?.id?.toString() ?? "");
  const [signBrightness, setSignBrightness] = useState("120");
  const [patchBrightness, setPatchBrightness] = useState("200");
  const [result, setResult] = useState<{
    rl_value: number;
    calibration_factor: number;
    patch_known_rl: number;
    classification: { status: string } | null;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const compute = async () => {
    setErr(null);
    setLoading(true);
    try {
      const r = await api.calibratedRL({
        sign_brightness: parseFloat(signBrightness),
        patch_brightness: parseFloat(patchBrightness),
        patch_id: parseInt(patchId, 10),
      });
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Calibrated R_L calculator" onClose={onClose}>
      <p className="text-[12.5px] text-ink/65 mb-3">
        Provide the measured brightness (0–255) of the sign and the reference patch in the same photo.
        The system computes the calibration factor and returns an absolute R_L.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <FieldCol span={2} label="Reference patch">
          <select className={inputCls} value={patchId} onChange={(e) => setPatchId(e.target.value)}>
            {patches.map((p) => (
              <option key={p.id} value={p.id}>{p.label} · known R_L {p.known_rl}</option>
            ))}
          </select>
        </FieldCol>
        <Field label="Sign brightness">
          <input className={inputCls} value={signBrightness} onChange={(e) => setSignBrightness(e.target.value)} />
        </Field>
        <Field label="Patch brightness">
          <input className={inputCls} value={patchBrightness} onChange={(e) => setPatchBrightness(e.target.value)} />
        </Field>
      </div>
      {err && <div className="mt-3 text-[12px] text-alarm">{err}</div>}
      <div className="mt-5 flex items-center justify-end">
        <button
          onClick={compute}
          disabled={loading || !patchId}
          className="pill text-white font-medium shadow-[0_10px_24px_-10px_rgba(255,107,53,0.7)] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
        >
          {loading ? "Computing…" : "Compute calibrated R_L"}
        </button>
      </div>

      {result && (
        <div className="mt-5 rounded-xl bg-paper/60 border border-ink/5 p-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink/55 mb-1">Calibrated R_L</div>
          <div className="text-[36px] font-semibold text-ink leading-none tabular">{result.rl_value}</div>
          <div className="text-[12px] text-ink/60 mt-2">
            Calibration factor: <span className="font-mono">{result.calibration_factor}</span> ·
            status:{" "}
            <span className="font-semibold uppercase tracking-wider text-[11px] ml-1">
              {result.classification?.status}
            </span>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

/* ==========================================================
   Modal / field helpers
   ========================================================== */
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
        className="bg-paper rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto"
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
