"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InvoiceActions({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [busy, setBusy] = useState(false);

  async function updateStatus(newStatus: string) {
    setBusy(true);
    setCurrent(newStatus);
    await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
    setBusy(false);
  }

  async function remove() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    setBusy(true);
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    router.push("/invoices");
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={current}
        disabled={busy}
        onChange={(e) => updateStatus(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium capitalize outline-none focus:border-indigo-400"
      >
        {["unpaid", "pending", "paid", "overdue"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button
        onClick={remove}
        disabled={busy}
        className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
      >
        Delete
      </button>
    </div>
  );
}
