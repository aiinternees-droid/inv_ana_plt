import Link from "next/link";
import { getDashboardAnalytics } from "@/lib/analytics";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import TrendChart from "@/components/dashboard/TrendChart";
import CategoryChart from "@/components/dashboard/CategoryChart";
import VendorChart from "@/components/dashboard/VendorChart";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className={`mt-1 text-xs font-medium ${accent ?? "text-slate-500"}`}>{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardAnalytics();
  const { stats, monthlyTrend, categoryBreakdown, vendorBreakdown, anomalies, duplicates, recent, insights } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-indigo-600">AI-powered analytics</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Spend Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time overview of invoices, spending trends, and AI-detected risks.
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          ✨ Import invoice with AI
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total spend" value={formatCurrency(stats.totalSpend, stats.currency)} sub={`${stats.totalInvoices} invoices`} />
        <StatCard
          label="Month over month"
          value={stats.momChangePercent === null ? "—" : formatPercent(stats.momChangePercent)}
          sub={stats.momChangePercent === null ? "Not enough data yet" : "vs. previous month"}
          accent={stats.momChangePercent !== null ? (stats.momChangePercent >= 0 ? "text-rose-600" : "text-emerald-600") : undefined}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(stats.outstandingAmount, stats.currency)}
          sub={`${formatCurrency(stats.overdueAmount, stats.currency)} overdue`}
          accent={stats.overdueAmount > 0 ? "text-rose-600" : "text-emerald-600"}
        />
        <StatCard
          label="AI risk flags"
          value={`${stats.anomalyCount + stats.duplicateCount}`}
          sub={`${stats.anomalyCount} anomalies · ${stats.duplicateCount} duplicates`}
          accent={stats.anomalyCount + stats.duplicateCount > 0 ? "text-amber-600" : "text-emerald-600"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white p-6 shadow-sm lg:col-span-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <h2 className="text-base font-semibold text-slate-900">AI Insights</h2>
            <span className="ml-auto rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-indigo-600 ring-1 ring-inset ring-indigo-200">
              {insights.engine === "openai" ? "GPT-enhanced" : "Heuristic engine"}
            </span>
          </div>
          {insights.narrative && (
            <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm italic text-slate-700 ring-1 ring-inset ring-indigo-100">
              “{insights.narrative}”
            </p>
          )}
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {insights.bullets.map((b, i) => (
              <li
                key={i}
                className="rounded-xl bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm ring-1 ring-inset ring-slate-100"
              >
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Spend trend</h2>
          <TrendChart data={monthlyTrend} currency={stats.currency} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Spend by category</h2>
          <CategoryChart data={categoryBreakdown} currency={stats.currency} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Recent invoices</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Vendor</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 pr-0 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-slate-400">
                      No invoices yet.
                    </td>
                  </tr>
                )}
                {recent.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-2">
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-slate-800 hover:text-indigo-600">
                        {inv.vendorName}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-2 text-slate-500">{formatDate(inv.issueDate)}</td>
                    <td className="py-2.5 pr-2">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-2.5 pl-2 text-right font-medium text-slate-800">
                      {formatCurrency(inv.totalAmount, inv.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-right">
            <Link href="/invoices" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              View all invoices →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Top vendors</h2>
          <VendorChart data={vendorBreakdown} currency={stats.currency} />
        </div>
      </div>

      {(anomalies.length > 0 || duplicates.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              🔎 Anomaly detection <span className="text-xs font-normal text-amber-600">({anomalies.length})</span>
            </h2>
            <ul className="mt-3 space-y-2">
              {anomalies.length === 0 && <li className="text-sm text-amber-700/70">No anomalies detected.</li>}
              {anomalies.map((inv) => (
                <li key={inv.id} className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-inset ring-amber-100">
                  <div className="flex items-center justify-between">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-slate-800 hover:text-indigo-600">
                      {inv.vendorName} — {formatCurrency(inv.totalAmount, inv.currency)}
                    </Link>
                    <span className="text-xs text-slate-400">{formatDate(inv.issueDate)}</span>
                  </div>
                  {inv.anomalyReason && <p className="mt-1 text-xs text-amber-700">{inv.anomalyReason}</p>}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-rose-800">
              📋 Duplicate suspects <span className="text-xs font-normal text-rose-600">({duplicates.length})</span>
            </h2>
            <ul className="mt-3 space-y-2">
              {duplicates.length === 0 && <li className="text-sm text-rose-700/70">No duplicates detected.</li>}
              {duplicates.map((inv) => (
                <li key={inv.id} className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-inset ring-rose-100">
                  <div className="flex items-center justify-between">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-slate-800 hover:text-indigo-600">
                      {inv.vendorName} — {formatCurrency(inv.totalAmount, inv.currency)}
                    </Link>
                    <span className="text-xs text-slate-400">{formatDate(inv.issueDate)}</span>
                  </div>
                  {inv.anomalyReason && <p className="mt-1 text-xs text-rose-700">{inv.anomalyReason}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
