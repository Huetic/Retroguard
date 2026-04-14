"use client";

import {
  Search,
  Bell,
  Moon,
  Calendar,
  ChevronRight,
} from "lucide-react";

type Crumb = { label: string; href?: string };

export default function TopBar({
  crumbs = [
    { label: "RetroGuard" },
    { label: "Western corridor monitoring · Q1 2026 baseline read" },
  ],
}: {
  crumbs?: Crumb[];
}) {
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
        <button className="pill bg-paper/60 hover:bg-paper text-ink/85 border border-ink/5 gap-2">
          <Calendar className="w-[14px] h-[14px]" strokeWidth={1.8} />
          Monthly
          <ChevronRight className="w-3 h-3 rotate-90 opacity-60" />
        </button>
        <button className="pill bg-paper/60 hover:bg-paper text-ink/65 border border-ink/5 w-10 !px-0">
          <Moon className="w-[15px] h-[15px]" strokeWidth={1.8} />
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
