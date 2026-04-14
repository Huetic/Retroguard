import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  change,
  changeType = "neutral",
}: KPICardProps) {
  const changeColorMap = {
    positive: "text-green-600",
    negative: "text-red-500",
    neutral: "text-slate-500",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtitle && (
              <span className="text-sm text-slate-400">{subtitle}</span>
            )}
          </div>
          {change && (
            <p className={`text-xs mt-2 font-medium ${changeColorMap[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  );
}
