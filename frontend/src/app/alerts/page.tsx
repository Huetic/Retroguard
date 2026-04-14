"use client";

import { useState } from "react";
import { Bell, XCircle, AlertTriangle, Info } from "lucide-react";
import AlertCard from "../../components/AlertCard";
import { sampleAlerts } from "../../data/sampleData";
import { AlertData } from "../../components/AlertCard";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertData[]>(sampleAlerts);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const handleResolve = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const infoCount = alerts.filter((a) => a.severity === "info").length;

  const filteredAlerts =
    filterSeverity === "all"
      ? alerts
      : alerts.filter((a) => a.severity === filterSeverity);

  return (
    <div className="p-6 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-600" />
          Alerts
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Active compliance alerts and notifications
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setFilterSeverity(filterSeverity === "critical" ? "all" : "critical")}
          className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
            filterSeverity === "critical"
              ? "bg-red-50 border-red-300 ring-2 ring-red-200"
              : "bg-white border-slate-200 hover:border-red-200 shadow-sm"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            <p className="text-xs font-medium text-slate-500">Critical</p>
          </div>
        </button>

        <button
          onClick={() => setFilterSeverity(filterSeverity === "warning" ? "all" : "warning")}
          className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
            filterSeverity === "warning"
              ? "bg-amber-50 border-amber-300 ring-2 ring-amber-200"
              : "bg-white border-slate-200 hover:border-amber-200 shadow-sm"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
            <p className="text-xs font-medium text-slate-500">Warning</p>
          </div>
        </button>

        <button
          onClick={() => setFilterSeverity(filterSeverity === "info" ? "all" : "info")}
          className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
            filterSeverity === "info"
              ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200"
              : "bg-white border-slate-200 hover:border-blue-200 shadow-sm"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-blue-600">{infoCount}</p>
            <p className="text-xs font-medium text-slate-500">Info</p>
          </div>
        </button>
      </div>

      {/* Filter indicator */}
      {filterSeverity !== "all" && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">
            Filtering by: <span className="font-semibold capitalize">{filterSeverity}</span>
          </span>
          <button
            onClick={() => setFilterSeverity("all")}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} onResolve={handleResolve} />
        ))}
        {filteredAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
            <Bell className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-400">
              {alerts.length === 0
                ? "All alerts have been resolved"
                : "No alerts match this filter"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
