"use client";

import { AlertTriangle, XCircle, Info, X } from "lucide-react";

export interface AlertData {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  highway: string;
  chainage: string;
  timestamp: string;
}

interface AlertCardProps {
  alert: AlertData;
  onResolve?: (id: string) => void;
  compact?: boolean;
}

const severityConfig = {
  critical: {
    icon: XCircle,
    bg: "bg-red-50",
    border: "border-red-200",
    iconColor: "text-red-500",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconColor: "text-amber-500",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
    label: "Warning",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconColor: "text-blue-500",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    label: "Info",
  },
};

export default function AlertCard({ alert, onResolve, compact = false }: AlertCardProps) {
  const cfg = severityConfig[alert.severity];
  const Icon = cfg.icon;

  if (compact) {
    return (
      <div className={`flex items-start gap-3 p-3 rounded-lg ${cfg.bg} border ${cfg.border}`}>
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 leading-snug">{alert.message}</p>
          <p className="text-xs text-slate-500 mt-1">
            {alert.highway} &middot; {alert.chainage} &middot; {alert.timestamp}
          </p>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.badgeBg} ${cfg.badgeText}`}>
          {cfg.label}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl ${cfg.bg} border ${cfg.border}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.badgeBg} flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cfg.badgeBg} ${cfg.badgeText}`}>
            {cfg.label}
          </span>
          <span className="text-xs text-slate-400">{alert.timestamp}</span>
        </div>
        <p className="text-sm font-medium text-slate-800">{alert.message}</p>
        <p className="text-xs text-slate-500 mt-1">
          {alert.highway} &middot; Chainage {alert.chainage}
        </p>
      </div>
      {onResolve && (
        <button
          onClick={() => onResolve(alert.id)}
          className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex-shrink-0"
        >
          <X className="w-3 h-3" />
          Resolve
        </button>
      )}
    </div>
  );
}
