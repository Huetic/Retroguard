"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Bell,
  Moon,
  Sun,
  Calendar,
  ChevronDown,
  Check,
} from "lucide-react";

type Crumb = { label: string; href?: string };

const TIMEFRAMES = [
  { key: "7d",   label: "Last 7 days" },
  { key: "30d",  label: "Last 30 days" },
  { key: "qtr",  label: "This quarter" },
  { key: "ytd",  label: "Year to date" },
  { key: "year", label: "Last 12 months" },
] as const;
type TimeframeKey = (typeof TIMEFRAMES)[number]["key"];

export default function TopBar({
  crumbs = [
    { label: "RetroGuard" },
    { label: "Western corridor monitoring · Q1 2026 baseline read" },
  ],
}: {
  crumbs?: Crumb[];
}) {
  // ---------- Theme (dark mode) ----------
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const stored = (typeof window !== "undefined" &&
      (localStorage.getItem("retroguard-theme") as
        | "light"
        | "dark"
        | null)) || "light";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("retroguard-theme", next);
    } catch {
      /* ignore */
    }
  };

  // ---------- Timeframe dropdown ----------
  const [tf, setTf] = useState<TimeframeKey>("30d");
  const [tfOpen, setTfOpen] = useState(false);
  const tfRef = useRef<HTMLDivElement>(null);
  const activeTf = TIMEFRAMES.find((t) => t.key === tf)!;

  useEffect(() => {
    if (!tfOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (tfRef.current && !tfRef.current.contains(e.target as Node)) {
        setTfOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [tfOpen]);

  return (
    <div className="flex items-center justify-between mb-6 rise">
      <div className="flex items-center gap-2 text-[12px] text-ink/60 min-w-0">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2 min-w-0">
            <span
              className={
                i === 0
                  ? "font-medium text-ink shrink-0"
                  : "truncate"
              }
            >
              {c.label}
            </span>
            {i < crumbs.length - 1 && (
              <span className="text-ink/30 shrink-0">/</span>
            )}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button className="pill bg-paper/60 hover:bg-paper text-ink/65 border border-ink/5 w-10 !px-0">
          <Search className="w-[15px] h-[15px]" strokeWidth={1.8} />
        </button>

        {/* Timeframe dropdown */}
        <div ref={tfRef} className="relative">
          <button
            onClick={() => setTfOpen((v) => !v)}
            className="pill bg-paper/60 hover:bg-paper text-ink/85 border border-ink/5 gap-2"
            aria-haspopup="menu"
            aria-expanded={tfOpen}
          >
            <Calendar className="w-[14px] h-[14px]" strokeWidth={1.8} />
            {activeTf.label}
            <ChevronDown
              className={`w-3 h-3 opacity-60 transition ${tfOpen ? "rotate-180" : ""}`}
            />
          </button>
          {tfOpen && (
            <div
              role="menu"
              className="absolute top-[calc(100%+6px)] right-0 z-[2100] min-w-[180px] rounded-[14px] bg-paper shadow-[0_18px_40px_-14px_rgba(28,27,25,0.2)] border border-ink/[0.06] p-1.5 animate-fade-in-up"
              style={{ animationDuration: "150ms" }}
            >
              {TIMEFRAMES.map((t) => {
                const active = t.key === tf;
                return (
                  <button
                    key={t.key}
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setTf(t.key);
                      setTfOpen(false);
                    }}
                    className={`flex items-center justify-between w-full h-9 px-3 rounded-[10px] text-[12.5px] text-left transition ${
                      active
                        ? "bg-orange/[0.08] text-orange-deep font-medium"
                        : "text-ink/75 hover:bg-ink/[0.04]"
                    }`}
                  >
                    <span>{t.label}</span>
                    {active && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          className="pill bg-paper/60 hover:bg-paper text-ink/65 border border-ink/5 w-10 !px-0 transition"
        >
          {theme === "dark" ? (
            <Sun className="w-[15px] h-[15px]" strokeWidth={1.8} />
          ) : (
            <Moon className="w-[15px] h-[15px]" strokeWidth={1.8} />
          )}
        </button>

        <button className="pill bg-paper/60 hover:bg-paper text-ink/65 border border-ink/5 w-10 !px-0 relative">
          <Bell className="w-[15px] h-[15px]" strokeWidth={1.8} />
          <span
            className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--color-orange)" }}
          />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold text-ink ml-1"
          style={{ background: "linear-gradient(135deg, #FFB58C, #FF6B35)" }}
        >
          MD
        </div>
      </div>
    </div>
  );
}
