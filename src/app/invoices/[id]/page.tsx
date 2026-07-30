import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { invoiceLineItems, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import InvoiceActions from "@/components/invoice/InvoiceActions";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  if (Number.isNaN(invoiceId)) notFound();

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) notFound();

  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/invoices" className="text-sm text-slate-500 hover:text-indigo-600">
          ← Back to invoices
        </Link>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{invoice.vendorName}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {invoice.invoiceNumber ? `Invoice #${invoice.invoiceNumber} · ` : ""}
            {invoice.category}
          </p>
        </div>
        <InvoiceActions id={invoice.id} status={invoice.status} />
      </div>

      {(invoice.isAnomaly || invoice.isDuplicateSuspect) && (
        <div className="space-y-2">
          {invoice.isAnomaly && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              🔎 <b>AI anomaly flag:</b> {invoice.anomalyReason ?? "Unusual amount detected for this vendor."}
            </div>
          )}
          {invoice.isDuplicateSuspect && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              📋 <b>Possible duplicate:</b> {invoice.anomalyReason ?? "A similar invoice already exists."}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-4">
        <Detail label="Issue date" value={formatDate(invoice.issueDate)} />
        <Detail label="Due date" value={formatDate(invoice.dueDate)} />
        <Detail label="Currency" value={invoice.currency} />
        <Detail
          label="Source"
          value={
            invoice.source === "ai"
              ? `AI (${invoice.confidenceScore ? Math.round(Number(invoice.confidenceScore) * 100) + "% conf." : "n/a"})`
              : "Manual entry"
          }
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Line items</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2 font-medium">Description</th>
              <th className="px-5 py-2 text-right font-medium">Qty</th>
              <th className="px-5 py-2 text-right font-medium">Unit price</th>
              <th className="px-5 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lineItems.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-sm text-slate-400">
                  No line items recorded.
                </td>
              </tr>
            )}
            {lineItems.map((li) => (
              <tr key={li.id}>
                <td className="px-5 py-2.5">{li.description}</td>
                <td className="px-5 py-2.5 text-right text-slate-600">{Number(li.quantity)}</td>
                <td className="px-5 py-2.5 text-right text-slate-600">{formatCurrency(li.unitPrice, invoice.currency)}</td>
                <td className="px-5 py-2.5 text-right font-medium text-slate-800">
                  {formatCurrency(li.amount, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-1 border-t border-slate-100 px-5 py-4 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Tax</span>
            <span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{invoice.notes}</p>
        </div>
      )}

      {invoice.rawText && (
        <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">Original source text</summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-600">
            {invoice.rawText}
          </pre>
        </details>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}
