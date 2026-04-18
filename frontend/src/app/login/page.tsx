"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
import { useAuth } from "../../lib/auth";

export default function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(username, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--color-paper-2, #FBF7EC)" }}>
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div
            className="w-10 h-10 rounded-[11px] flex items-center justify-center shadow-[0_6px_18px_-6px_rgba(255,107,53,0.55)]"
            style={{ background: "linear-gradient(140deg, #FF8B5A, #FF6B35)" }}
          >
            <Radio className="w-5 h-5 text-white" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <div className="text-[18px] font-semibold text-ink">RetroGuard</div>
            <div className="text-[11px] text-ink/40">NHAI · Command Centre</div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[20px] bg-paper border border-ink/[0.07] shadow-[0_18px_48px_-16px_rgba(28,27,25,0.12)] p-7 space-y-4"
        >
          <h1 className="text-[15px] font-semibold text-ink mb-5">Sign in to your account</h1>

          <div className="space-y-1">
            <label className="text-[11.5px] font-medium text-ink/60 uppercase tracking-[0.12em]">
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full h-10 rounded-[10px] border border-ink/[0.10] bg-paper-2/60 px-3 text-[13.5px] text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-orange/40 focus:border-orange/50 transition"
              placeholder="admin"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11.5px] font-medium text-ink/60 uppercase tracking-[0.12em]">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-10 rounded-[10px] border border-ink/[0.10] bg-paper-2/60 px-3 text-[13.5px] text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-orange/40 focus:border-orange/50 transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 rounded-[8px] px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-[10px] text-[13.5px] font-semibold text-white transition disabled:opacity-50"
            style={{ background: "linear-gradient(140deg, #FF8B5A, #FF6B35)" }}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-[11px] text-ink/35 mt-5">
          NHAI RetroGuard · Government of India · MoRTH
        </p>
      </div>
    </div>
  );
}
