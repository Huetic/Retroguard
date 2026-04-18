"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  MapPin,
  Boxes,
  BellRing,
  Smartphone,
  ScrollText,
  ChevronsDown,
  Radio,
  Landmark,
  Film,
} from "lucide-react";
import { api, type ApiMeasurement } from "../lib/api";

/* ----------------------------------------------------------
   Navigation structure (grouped into sections like Momentum)
   ---------------------------------------------------------- */
function buildGroups(assetCount: number | null, alertCount: number | null) {
  return [
    {
      label: "Command",
      items: [
        { href: "/",       label: "Overview",       icon: LayoutGrid },
        { href: "/map",    label: "Corridor map",   icon: MapPin     },
      ],
    },
    {
      label: "Data",
      items: [
        { href: "/assets", label: "Asset registry", icon: Boxes,
          badge: assetCount !== null ? String(assetCount) : "—" },
        { href: "/alerts", label: "Live alerts",    icon: BellRing,
          badge: alertCount !== null ? String(alertCount) : "—",
          badgeColor: "alarm" as const },
      ],
    },
    {
      label: "Operations",
      items: [
        { href: "/measure", label: "Field capture",  icon: Smartphone, badge: "Beta" },
        { href: "/ingest",  label: "Video ingest",   icon: Film                     },
        { href: "/reports", label: "Compliance",     icon: ScrollText              },
      ],
    },
  ];
}

type ActivityTone = "go" | "caution" | "alarm" | "info";

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}d`;
}

function toneForSource(src: string): ActivityTone {
  if (src === "smartphone") return "go";
  if (src === "cctv") return "info";
  if (src === "dashcam") return "caution";
  return "go";
}
const toneColor: Record<ActivityTone, string> = {
  go:      "#5EC486",
  caution: "#F3AD3C",
  alarm:   "#FF7A6A",
  info:    "#FFB58C",
};

/* ----------------------------------------------------------
   Sidebar (rounded dark rail · floats on peach gradient)
   ---------------------------------------------------------- */
export default function Sidebar() {
  const pathname = usePathname();
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [alertCount, setAlertCount] = useState<number | null>(null);
  const [activity, setActivity] = useState<
    { tone: ActivityTone; title: string; meta: string; when: string }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [stats, recent] = await Promise.all([
          api.dashboardStats(),
          api.recentMeasurements(),
        ]);
        if (cancelled) return;
        setAssetCount(stats.total_assets);
        setAlertCount(stats.alerts_active);
        setActivity(
          recent.slice(0, 5).map((m: ApiMeasurement) => ({
            tone: toneForSource(m.source_layer),
            title: `Measurement logged`,
            meta: `Asset #${m.asset_id} · R_L ${Math.round(m.rl_value)}`,
            when: timeAgo(m.measured_at),
          }))
        );
      } catch {
        /* keep placeholders */
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const groups = buildGroups(assetCount, alertCount);

  return (
    <aside
      className="sticky top-3 self-start w-[248px] h-[calc(100vh-24px)] flex flex-col z-[1200] text-cream rounded-[22px] overflow-hidden"
      style={{ background: "var(--color-ink)" }}
    >
      {/* Brand */}
      <div className="relative px-5 pt-5 pb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="relative w-8 h-8 rounded-[9px] flex items-center justify-center shadow-[0_6px_18px_-6px_rgba(255,107,53,0.55)]"
            style={{ background: "linear-gradient(140deg, #FF8B5A, #FF6B35)" }}
          >
            <Radio className="w-4 h-4 text-white" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <div className="text-[14.5px] font-semibold text-paper-2">RetroGuard</div>
            <div className="text-[10.5px] text-paper-2/40 -mt-0.5">NHAI · Command</div>
          </div>
        </div>
      </div>

      {/* Nav list */}
      <nav className="relative flex-1 px-3 overflow-y-auto dark-scroll">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-2.5 mb-1.5 text-[9.5px] uppercase tracking-[0.22em] text-paper-2/35 font-medium">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-[12.5px] transition-all ${
                      active
                        ? "bg-paper-2/[0.08] text-paper-2"
                        : "text-paper-2/55 hover:text-paper-2 hover:bg-paper-2/[0.04]"
                    }`}
                  >
                    <Icon className="w-[16px] h-[16px] flex-shrink-0" strokeWidth={active ? 2.1 : 1.6} />
                    <span className={active ? "font-medium" : ""}>{item.label}</span>
                    {"badge" in item && item.badge && (
                      <span
                        className={`ml-auto text-[10px] font-mono tabular px-1.5 py-0.5 rounded-[5px] ${
                          "badgeColor" in item && item.badgeColor === "alarm"
                            ? "bg-orange/15 text-orange-soft"
                            : "bg-paper-2/[0.06] text-paper-2/55"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Recent activity feed */}
        <div className="mb-3">
          <div className="px-2.5 mb-2 flex items-center justify-between">
            <span className="text-[9.5px] uppercase tracking-[0.22em] text-paper-2/35 font-medium">
              Recent activity
            </span>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: "var(--color-go-2, #5EC486)" }}
            />
          </div>
          <div className="space-y-0.5">
            {activity.map((a, i) => (
              <div
                key={i}
                className="group flex items-start gap-2.5 px-2.5 py-2 rounded-[10px] hover:bg-paper-2/[0.04] cursor-pointer transition"
              >
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: toneColor[a.tone] }}
                />
                <div className="leading-tight min-w-0 flex-1">
                  <div className="text-[11.5px] text-paper-2/85 font-medium truncate group-hover:text-paper-2">
                    {a.title}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9.5px] text-paper-2/40 font-mono tabular mt-0.5">
                    <span className="truncate">{a.meta}</span>
                  </div>
                </div>
                <span className="text-[9px] text-paper-2/30 font-mono tabular shrink-0 mt-1">
                  {a.when}
                </span>
              </div>
            ))}
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] text-[10.5px] text-paper-2/45 hover:text-paper-2 hover:bg-paper-2/[0.04] transition font-mono tabular uppercase tracking-[0.12em]">
              <ChevronsDown className="w-3 h-3" />
              View all
            </button>
          </div>
        </div>
      </nav>

      {/* Government branding — Ministry of Road Transport & Highways */}
      <div className="relative px-3 pb-3">
        <div
          className="relative rounded-[14px] p-3 border border-white/[0.06] overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          {/* Tri-colour accent stripe */}
          <div
            aria-hidden
            className="absolute top-0 left-0 right-0 h-[2px] flex"
          >
            <div className="flex-1" style={{ background: "#FF9933" }} />
            <div className="flex-1" style={{ background: "rgba(255,255,255,0.75)" }} />
            <div className="flex-1" style={{ background: "#138808" }} />
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <div
              className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <Landmark
                className="w-[15px] h-[15px] text-paper-2/75"
                strokeWidth={1.8}
              />
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-[9.5px] uppercase tracking-[0.16em] text-paper-2/45 font-medium">
                Government of India
              </div>
              <div className="text-[11.5px] text-paper-2/90 font-semibold leading-tight mt-0.5">
                NHAI · MoRTH
              </div>
              <div className="text-[9px] text-paper-2/35 mt-0.5 leading-snug">
                Ministry of Road Transport &amp; Highways
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
