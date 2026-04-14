"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  MapPin,
  Boxes,
  BellRing,
  Smartphone,
  ScrollText,
  ChevronsDown,
  Radio,
  Sparkles,
} from "lucide-react";

/* ----------------------------------------------------------
   Navigation structure (grouped into sections like Momentum)
   ---------------------------------------------------------- */
const groups = [
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
      { href: "/assets", label: "Asset registry", icon: Boxes,    badge: "205" },
      { href: "/alerts", label: "Live alerts",    icon: BellRing, badge: "18",  badgeColor: "alarm" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/measure", label: "Field capture",  icon: Smartphone, badge: "Beta" },
      { href: "/reports", label: "Compliance",     icon: ScrollText              },
    ],
  },
];

const crew = [
  { name: "Priya Iyer",   role: "Analyst",  tone: "#F4B982" },
  { name: "Rohan Mehta",  role: "Engineer", tone: "#E89459" },
  { name: "Aisha Khan",   role: "Ops Lead", tone: "#FF8B5A" },
];

/* ----------------------------------------------------------
   Sidebar (rounded dark rail · floats on peach gradient)
   ---------------------------------------------------------- */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="sticky top-3 self-start w-[248px] h-[calc(100vh-24px)] flex flex-col z-50 text-cream rounded-[22px] overflow-hidden"
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

        {/* Crew / interactions */}
        <div className="mb-3">
          <div className="px-2.5 mb-2 text-[9.5px] uppercase tracking-[0.22em] text-paper-2/35 font-medium">
            Crew online
          </div>
          <div className="space-y-1">
            {crew.map((c) => (
              <div key={c.name} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-[10px] hover:bg-paper-2/[0.04] cursor-pointer transition">
                <div
                  className="relative w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-semibold text-ink"
                  style={{ background: c.tone }}
                >
                  {c.name.split(" ").map((n) => n[0]).join("")}
                  <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full border-2 border-ink bg-go" />
                </div>
                <div className="leading-tight min-w-0 flex-1">
                  <div className="text-[12px] text-paper-2/90 font-medium truncate">{c.name}</div>
                  <div className="text-[10px] text-paper-2/40 truncate">{c.role}</div>
                </div>
              </div>
            ))}
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] text-[11.5px] text-paper-2/45 hover:text-paper-2 hover:bg-paper-2/[0.04] transition">
              <ChevronsDown className="w-3.5 h-3.5" />
              Show more <span className="text-paper-2/30">(6)</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Upgrade CTA — orange pill like Momentum */}
      <div className="relative px-3 pb-3">
        <button
          className="relative w-full h-11 rounded-[14px] flex items-center gap-2 px-4 text-white font-medium text-[12.5px] overflow-hidden shadow-[0_8px_22px_-10px_rgba(255,107,53,0.75)] hover:brightness-110 transition"
          style={{ background: "linear-gradient(135deg, #FF8B5A, #E85A26)" }}
        >
          <Sparkles className="w-4 h-4 shrink-0" strokeWidth={2} />
          Upgrade to PRO
          <span className="ml-auto text-[10.5px] font-mono tabular text-white/75">₹4.9k/mo</span>
        </button>
      </div>
    </aside>
  );
}
