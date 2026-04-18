"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Radio,
  Landmark,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../../lib/auth";

export default function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
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
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(130% 110% at 100% 0%, #D76D2F 0%, #E99663 22%, #F3C29F 46%, #F8DCC2 72%, #FBEAD6 100%)",
      }}
    >
      {/* Decorative background elements */}
      <div
        aria-hidden
        className="absolute top-[20%] left-[10%] w-[340px] h-[340px] rounded-full blur-[100px] opacity-30 pointer-events-none"
        style={{ background: "#FF6B35" }}
      />
      <div
        aria-hidden
        className="absolute bottom-[10%] right-[15%] w-[260px] h-[260px] rounded-full blur-[80px] opacity-20 pointer-events-none"
        style={{ background: "#FFB58C" }}
      />

      <div className="w-full max-w-[420px] rise">
        {/* Brand mark */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div
            className="relative w-12 h-12 rounded-[14px] flex items-center justify-center shadow-[0_12px_30px_-10px_rgba(255,107,53,0.6)]"
            style={{
              background: "linear-gradient(140deg, #FF8B5A, #FF6B35)",
            }}
          >
            <Radio className="w-6 h-6 text-white" strokeWidth={2.2} />
            <span className="absolute -right-0.5 -top-0.5 w-2.5 h-2.5 rounded-full bg-white animate-pulse-dot" />
          </div>
          <div className="leading-tight">
            <div className="text-[22px] font-semibold text-ink">
              RetroGuard
            </div>
            <div className="text-[11px] text-ink/50">
              NHAI · Command Centre
            </div>
          </div>
        </div>

        {/* Glass login card */}
        <div
          className="glass rounded-[24px] p-8 shadow-[0_24px_60px_-16px_rgba(28,27,25,0.18)] rise"
          style={{ animationDelay: "100ms" }}
        >
          {/* Header */}
          <div className="text-center mb-7">
            <h1 className="text-[26px] font-semibold text-ink tracking-[-0.01em] leading-tight">
              Welcome back.
            </h1>
            <p className="text-[13px] text-ink/55 mt-1.5 leading-relaxed">
              Sign in to access the highway digital twin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-ink/55 uppercase tracking-[0.16em] mb-2">
                <ShieldCheck className="w-3 h-3" strokeWidth={2} />
                Staff username
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full h-12 rounded-[12px] border border-ink/[0.08] bg-paper px-4 text-[14px] text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-orange/40 focus:border-orange/40 transition"
                placeholder="admin"
              />
            </div>

            {/* Password */}
            <div>
              <label className="flex items-center justify-between text-[10px] font-medium text-ink/55 uppercase tracking-[0.16em] mb-2">
                <span>Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-12 rounded-[12px] border border-ink/[0.08] bg-paper px-4 pr-11 text-[14px] text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-orange/40 focus:border-orange/40 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/35 hover:text-ink/70 transition"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <EyeOff className="w-[16px] h-[16px]" strokeWidth={1.8} />
                  ) : (
                    <Eye className="w-[16px] h-[16px]" strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-[12px] font-medium px-4 py-2.5 rounded-[10px] rise"
                style={{
                  background: "rgba(213,66,48,0.08)",
                  color: "#9E2E1C",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-[12px] text-[14px] font-semibold text-white flex items-center justify-center gap-2 shadow-[0_12px_30px_-10px_rgba(255,107,53,0.7)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
              style={{
                background: "linear-gradient(140deg, #FF8B5A, #E85A26)",
              }}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  />
                  Signing in…
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Government branding footer */}
        <div
          className="mt-6 flex items-center justify-center gap-3 rise"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-center gap-2 text-ink/45">
            <Landmark className="w-3.5 h-3.5" strokeWidth={1.8} />
            <span className="text-[10.5px] font-medium uppercase tracking-[0.14em]">
              Government of India · NHAI · MoRTH
            </span>
          </div>
        </div>

        {/* Tri-colour line */}
        <div
          className="mt-4 mx-auto w-16 h-[2px] flex rounded-full overflow-hidden rise"
          style={{ animationDelay: "300ms" }}
        >
          <div className="flex-1" style={{ background: "#FF9933" }} />
          <div className="flex-1" style={{ background: "rgba(28,27,25,0.2)" }} />
          <div className="flex-1" style={{ background: "#138808" }} />
        </div>
      </div>
    </div>
  );
}
