"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function TrendChart({
  data,
  currency,
}: {
  data: { month: string; total: number }[];
  currency: string;
}) {
  if (data.length === 0) {
    return (
      <div className="grid h-64 place-items-center text-sm text-slate-400">
        No spend data yet — import invoices to see trends.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={60}
          tickFormatter={(v) =>
            new Intl.NumberFormat("en-US", { notation: "compact", style: "currency", currency }).format(v)
          }
        />
        <Tooltip
          formatter={(value) => [
            new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value) || 0),
            "Spend",
          ]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
        />
        <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#spendGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
