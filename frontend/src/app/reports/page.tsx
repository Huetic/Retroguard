"use client";

import { useState } from "react";
import { FileText, Download, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import { highwayReports } from "../../data/sampleData";

const highwayOptions = Object.keys(highwayReports);

export default function ReportsPage() {
  const [selectedHighway, setSelectedHighway] = useState(highwayOptions[0]);
  const [showToast, setShowToast] = useState(false);

  const report = highwayReports[selectedHighway];

  const handleExport = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="p-6 max-w-[1200px]">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in-up">
          <div className="flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Report generated successfully</p>
              <p className="text-xs text-green-200">
                {selectedHighway}_compliance_report_Apr2026.pdf
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Highway compliance reports and analysis
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Highway Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700">Select Highway:</label>
          <div className="flex gap-2">
            {highwayOptions.map((hw) => (
              <button
                key={hw}
                onClick={() => setSelectedHighway(hw)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedHighway === hw
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {hw}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Overall Compliance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Assets</p>
          <p className="text-3xl font-bold text-slate-900">{report.totalAssets}</p>
          <p className="text-xs text-slate-400 mt-1">On {selectedHighway} corridor</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Compliance Rate</p>
          <p className="text-3xl font-bold text-green-600">{report.compliantPct}%</p>
          <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${report.compliantPct}%` }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-3">Status Breakdown</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-slate-600">Compliant</span>
              </div>
              <span className="text-sm font-semibold text-slate-700">{report.compliantPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm text-slate-600">Warning</span>
              </div>
              <span className="text-sm font-semibold text-slate-700">{report.warningPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-slate-600">Critical</span>
              </div>
              <span className="text-sm font-semibold text-slate-700">{report.criticalPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown by Type */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Compliance by Asset Type</h3>
          <p className="text-xs text-slate-400 mt-0.5">Detailed breakdown for {selectedHighway}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Asset Type
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span className="text-green-600">Compliant</span>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span className="text-amber-600">Warning</span>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span className="text-red-600">Critical</span>
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Compliance %
                </th>
              </tr>
            </thead>
            <tbody>
              {report.breakdown.map((row, idx) => {
                const pct = Math.round((row.compliant / row.total) * 100);
                return (
                  <tr
                    key={row.type}
                    className={`border-b border-slate-100 ${idx % 2 === 1 ? "bg-slate-50/50" : ""}`}
                  >
                    <td className="px-5 py-3 font-medium text-slate-700">{row.type}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{row.total}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-semibold">{row.compliant}</td>
                    <td className="px-4 py-3 text-center text-amber-600 font-semibold">{row.warning}</td>
                    <td className="px-4 py-3 text-center text-red-600 font-semibold">{row.critical}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Critical Assets Needing Attention */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-slate-800">
            Critical Assets — Immediate Attention Required
          </h3>
          <span className="ml-auto text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
            {report.criticalAssets.length} assets
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-red-50/50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Asset ID
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Chainage
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Current RL
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  IRC Min
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Deficit
                </th>
              </tr>
            </thead>
            <tbody>
              {report.criticalAssets.map((asset, idx) => (
                <tr
                  key={asset.id}
                  className={`border-b border-slate-100 ${idx % 2 === 1 ? "bg-red-50/30" : ""}`}
                >
                  <td className="px-5 py-3 font-mono text-xs font-medium text-red-600">{asset.id}</td>
                  <td className="px-4 py-3 text-slate-700">{asset.type}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{asset.chainage}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-bold text-red-600">
                    {asset.currentRL}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{asset.ircMin}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs font-bold text-red-600">
                      -{asset.ircMin - asset.currentRL} ({Math.round(((asset.ircMin - asset.currentRL) / asset.ircMin) * 100)}%)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
