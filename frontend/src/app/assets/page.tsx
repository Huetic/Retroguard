"use client";

import { useState, useMemo } from "react";
import { Database, Search, Filter } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import { tableAssets } from "../../data/sampleData";

const highways = ["All", "NH-48", "NH-44", "NH-27", "NH-66", "DME"];
const statuses = ["All", "compliant", "warning", "critical"];
const types = [
  "All",
  "Regulatory Sign",
  "Road Marking",
  "Guide Sign",
  "Warning Sign",
  "Chevron Marker",
  "Delineator Post",
];

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const [hwFilter, setHwFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const filtered = useMemo(() => {
    return tableAssets.filter((a) => {
      const matchesSearch =
        search === "" ||
        a.id.toLowerCase().includes(search.toLowerCase()) ||
        a.type.toLowerCase().includes(search.toLowerCase()) ||
        a.highway.toLowerCase().includes(search.toLowerCase()) ||
        a.chainage.toLowerCase().includes(search.toLowerCase());
      const matchesHw = hwFilter === "All" || a.highway === hwFilter;
      const matchesStatus = statusFilter === "All" || a.status === statusFilter;
      const matchesType = typeFilter === "All" || a.type === typeFilter;
      return matchesSearch && matchesHw && matchesStatus && matchesType;
    });
  }, [search, hwFilter, statusFilter, typeFilter]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" />
          Assets
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete inventory of monitored highway retroreflective assets
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, type, highway, chainage..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Filters:</span>
          </div>

          {/* Highway */}
          <select
            value={hwFilter}
            onChange={(e) => setHwFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {highways.map((h) => (
              <option key={h} value={h}>
                {h === "All" ? "All Highways" : h}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t === "All" ? "All Types" : t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of{" "}
          <span className="font-semibold text-slate-700">{tableAssets.length}</span> assets
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Highway
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
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Last Measured
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset, idx) => (
                <tr
                  key={asset.id}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    idx % 2 === 1 ? "bg-slate-50/50" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-blue-600">
                    {asset.id}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{asset.type}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                      {asset.highway}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                    {asset.chainage}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    <span
                      className={
                        asset.currentRL < asset.ircMin
                          ? "text-red-600 font-bold"
                          : asset.currentRL < asset.ircMin * 1.1
                          ? "text-amber-600 font-bold"
                          : "text-slate-700"
                      }
                    >
                      {asset.currentRL}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">
                    {asset.ircMin}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={asset.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{asset.lastMeasured}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Database className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-400">No assets match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
