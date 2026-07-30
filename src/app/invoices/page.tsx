"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { INVOICE_CATEGORIES } from "@/lib/categories";
import type { Invoice } from "@/db/schema";

const STATUS_OPTIONS = ["all", "unpaid", "pending", "paid", "overdue"] as const;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    if (category !== "all") params.set("category", category);
    const res = await fetch(`/api/invoices?${params.toString()}`);
    const json = await res.json();
    setInvoices(json.invoices ?? []);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, category]);

  const totals = useMemo(() => {
    const total = invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
    return { count: invoices.length, total };
  }, [invoices]);

  async function updateStatus(id: number, newStatus: string) {
    setBusyId(id);
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await load();
    setBusyId(null);
  }

  async function removeInvoice(id: number) {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    setBusyId(id);
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    await load();
    setBusyId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Invoices</h1>
          <p className="mt-1 text-sm text-slate-500">
            {totals.count} invoice{totals.count === 1 ? "" : "s"} · {formatCurrency(totals.total)}
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          + New invoice
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendor or invoice #..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="all">All categories</option>
          {INVOICE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr className="text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Vendor</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Issue date</th>
              <th className="px-4 py-3 font-medium">Due date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Flags</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                  Loading invoices…
                </td>
              </tr>
            )}
            {!loading && invoices.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                  No invoices found. <Link href="/invoices/new" className="text-indigo-600">Import one with AI →</Link>
                </td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className={`hover:bg-slate-50 ${busyId === inv.id ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <Link href={`/invoices/${inv.id}`} className="font-medium text-slate-800 hover:text-indigo-600">
                    {inv.vendorName}
                  </Link>
                  {inv.invoiceNumber && <p className="text-xs text-slate-400">#{inv.invoiceNumber}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600">{inv.category}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(inv.issueDate)}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(inv.dueDate)}</td>
                <td className="px-4 py-3">
                  <select
                    value={inv.status}
                    onChange={(e) => updateStatus(inv.id, e.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium capitalize outline-none focus:border-indigo-400"
                  >
                    {["unpaid", "pending", "paid", "overdue"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">
                  {formatCurrency(inv.totalAmount, inv.currency)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {inv.isAnomaly && (
                      <span title={inv.anomalyReason ?? "Anomaly"} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        🔎
                      </span>
                    )}
                    {inv.isDuplicateSuspect && (
                      <span title={inv.anomalyReason ?? "Possible duplicate"} className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                        📋
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => removeInvoice(inv.id)}
                    className="text-xs font-medium text-slate-400 hover:text-rose-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
