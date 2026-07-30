"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INVOICE_CATEGORIES } from "@/lib/categories";
import { SAMPLE_INVOICES } from "@/lib/ai/samples";
import type { ExtractedInvoice, ExtractedLineItem } from "@/lib/ai/types";

interface FormState {
  vendorName: string;
  invoiceNumber: string;
  category: string;
  status: "unpaid" | "pending" | "paid" | "overdue";
  currency: string;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  notes: string;
}

const emptyForm: FormState = {
  vendorName: "",
  invoiceNumber: "",
  category: "Other",
  status: "unpaid",
  currency: "USD",
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  subtotal: "0",
  taxAmount: "0",
  totalAmount: "0",
  notes: "",
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [rawText, setRawText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ExtractedInvoice | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [lineItems, setLineItems] = useState<ExtractedLineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const showReviewForm = mode === "manual" || extraction !== null;

  function applyExtraction(extracted: ExtractedInvoice) {
    setExtraction(extracted);
    setForm({
      vendorName: extracted.vendorName,
      invoiceNumber: extracted.invoiceNumber ?? "",
      category: INVOICE_CATEGORIES.includes(extracted.category as (typeof INVOICE_CATEGORIES)[number])
        ? extracted.category
        : "Other",
      status: "unpaid",
      currency: extracted.currency || "USD",
      issueDate: extracted.issueDate ?? new Date().toISOString().slice(0, 10),
      dueDate: extracted.dueDate ?? "",
      subtotal: String(extracted.subtotal ?? 0),
      taxAmount: String(extracted.taxAmount ?? 0),
      totalAmount: String(extracted.totalAmount ?? 0),
      notes: extracted.notes ?? "",
    });
    setLineItems(extracted.lineItems ?? []);
  }

  async function analyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to analyze invoice");
      applyExtraction(json.extracted);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Failed to analyze invoice");
    } finally {
      setAnalyzing(false);
    }
  }

  function loadSample(text: string) {
    setRawText(text);
    setExtraction(null);
  }

  function updateLineItem(index: number, patch: Partial<ExtractedLineItem>) {
    setLineItems((items) => items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeLineItem(index: number) {
    setLineItems((items) => items.filter((_, i) => i !== index));
  }

  function addLineItem() {
    setLineItems((items) => [...items, { description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
  }

  function recalcTotalFromItems() {
    const subtotal = lineItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    setForm((f) => ({
      ...f,
      subtotal: subtotal.toFixed(2),
      totalAmount: (subtotal + (Number(f.taxAmount) || 0)).toFixed(2),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        vendorName: form.vendorName,
        invoiceNumber: form.invoiceNumber || null,
        category: form.category,
        status: form.status,
        source: mode === "ai" ? "ai" : "manual",
        currency: form.currency,
        issueDate: form.issueDate,
        dueDate: form.dueDate || null,
        subtotal: Number(form.subtotal) || 0,
        taxAmount: Number(form.taxAmount) || 0,
        totalAmount: Number(form.totalAmount) || 0,
        notes: form.notes || null,
        rawText: mode === "ai" ? rawText : null,
        confidenceScore: extraction?.confidence ?? null,
        lineItems: lineItems
          .filter((li) => li.description.trim().length > 0)
          .map((li) => ({
            description: li.description,
            quantity: Number(li.quantity) || 1,
            unitPrice: Number(li.unitPrice) || 0,
            amount: Number(li.amount) || 0,
          })),
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save invoice");
      router.push(`/invoices/${json.invoice.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save invoice");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Add invoice</h1>
        <p className="mt-1 text-sm text-slate-500">
          Paste raw invoice text and let AI extract the details, or enter everything manually.
        </p>
      </div>

      <div className="inline-flex rounded-full bg-slate-100 p-1">
        <button
          onClick={() => setMode("ai")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            mode === "ai" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
          }`}
        >
          ✨ AI Import
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            mode === "manual" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"
          }`}
        >
          ✍️ Manual entry
        </button>
      </div>

      {mode === "ai" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-semibold text-slate-900">Invoice text</label>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_INVOICES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => loadSample(s.text)}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setExtraction(null);
            }}
            rows={10}
            placeholder="Paste invoice text here (copied from a PDF, email, or scan)…"
            className="mt-3 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs leading-relaxed outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          {analyzeError && <p className="mt-2 text-sm text-rose-600">{analyzeError}</p>}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={analyze}
              disabled={analyzing || rawText.trim().length < 10}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzing ? "Analyzing…" : "🤖 Analyze with AI"}
            </button>
            {extraction && (
              <span className="text-xs text-slate-500">
                Extracted via <b>{extraction.engine === "openai" ? "GPT" : "heuristic engine"}</b> · confidence{" "}
                {Math.round(extraction.confidence * 100)}%
              </span>
            )}
          </div>
        </div>
      )}

      {showReviewForm && (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            {mode === "ai" ? "Review extracted details" : "Invoice details"}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Vendor name">
              <input
                required
                value={form.vendorName}
                onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Invoice number">
              <input
                value={form.invoiceNumber}
                onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="input"
              >
                {INVOICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState["status"] }))}
                className="input"
              >
                {["unpaid", "pending", "paid", "overdue"].map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Currency">
              <input
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                className="input"
                maxLength={3}
              />
            </Field>
            <Field label="Issue date">
              <input
                required
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Due date">
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="input"
              />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900">Line items</label>
              <button type="button" onClick={addLineItem} className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
                + Add row
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {lineItems.length === 0 && <p className="text-xs text-slate-400">No line items — totals will be entered manually.</p>}
              {lineItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 items-center gap-2">
                  <input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(idx, { description: e.target.value })}
                    className="input col-span-6"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(idx, { quantity: Number(e.target.value) })}
                    className="input col-span-2"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Unit price"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(idx, { unitPrice: Number(e.target.value) })}
                    className="input col-span-2"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Amount"
                    value={item.amount}
                    onChange={(e) => updateLineItem(idx, { amount: Number(e.target.value) })}
                    className="input col-span-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeLineItem(idx)}
                    className="col-span-1 text-xs text-slate-400 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {lineItems.length > 0 && (
                <button
                  type="button"
                  onClick={recalcTotalFromItems}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Recalculate totals from line items
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Subtotal">
              <input
                type="number"
                step="any"
                value={form.subtotal}
                onChange={(e) => setForm((f) => ({ ...f, subtotal: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Tax">
              <input
                type="number"
                step="any"
                value={form.taxAmount}
                onChange={(e) => setForm((f) => ({ ...f, taxAmount: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Total amount">
              <input
                required
                type="number"
                step="any"
                value={form.totalAmount}
                onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
                className="input font-semibold"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="input"
            />
          </Field>

          {submitError && <p className="text-sm text-rose-600">{submitError}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save invoice"}
            </button>
          </div>
        </form>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.65rem;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: #818cf8;
          box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
