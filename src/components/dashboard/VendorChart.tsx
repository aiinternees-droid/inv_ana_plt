"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function VendorChart({
  data,
  currency,
}: {
  data: { vendor: string; total: number }[];
  currency: string;
}) {
  if (data.length === 0) {
    return <div className="grid h-64 place-items-center text-sm text-slate-400">No vendor data yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) =>
            new Intl.NumberFormat("en-US", { notation: "compact", style: "currency", currency }).format(v)
          }
        />
        <YAxis
          type="category"
          dataKey="vendor"
          width={120}
          tick={{ fontSize: 12, fill: "#334155" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value) || 0)}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
        />
        <Bar dataKey="total" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
