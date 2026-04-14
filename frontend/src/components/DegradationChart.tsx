"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const data = [
  { month: "Oct 25", rl: 156, min: 120 },
  { month: "Nov 25", rl: 149, min: 120 },
  { month: "Dec 25", rl: 143, min: 120 },
  { month: "Jan 26", rl: 138, min: 120 },
  { month: "Feb 26", rl: 134, min: 120 },
  { month: "Mar 26", rl: 131, min: 120 },
];

export default function DegradationChart() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Network Retroreflectivity Trend
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Average RL (mcd/lx/m&sup2;) over last 6 months
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-blue-500 rounded" />
            <span className="text-slate-500">Avg RL</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-red-400 rounded" style={{ borderTop: "1px dashed" }} />
            <span className="text-slate-500">IRC Min</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            domain={[100, 170]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: "12px",
            }}
          />
          <ReferenceLine
            y={120}
            stroke="#f87171"
            strokeDasharray="5 5"
            label={{
              value: "IRC Min (120)",
              position: "right",
              fontSize: 10,
              fill: "#f87171",
            }}
          />
          <Line
            type="monotone"
            dataKey="rl"
            stroke="#3B82F6"
            strokeWidth={2.5}
            dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            name="Avg RL"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
