import { guessCategory } from "@/lib/categories";
import type { ExtractedInvoice, ExtractedLineItem } from "./types";

function cleanNumber(raw: string): number {
  const cleaned = raw.replace(/[,$]/g, "").trim();
  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

const MONTHS: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

function normalizeDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const text = raw.trim();

  // YYYY-MM-DD
  let m = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  // MM/DD/YYYY or M/D/YY
  m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    let year = m[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }

  // Month D, YYYY  e.g. "March 3, 2024" or "Mar 3 2024"
  m = text.match(/([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const monthKey = m[1].toLowerCase();
    const month = MONTHS[monthKey];
    if (month) return `${m[3]}-${month}-${m[2].padStart(2, "0")}`;
  }

  // D Month YYYY e.g. "3 March 2024"
  m = text.match(/(\d{1,2})\s+([A-Za-z]{3,9}),?\s+(\d{4})/);
  if (m) {
    const monthKey = m[2].toLowerCase();
    const month = MONTHS[monthKey];
    if (month) return `${m[3]}-${month}-${m[1].padStart(2, "0")}`;
  }

  return null;
}

function findLabeledValue(lines: string[], labels: RegExp): string | null {
  for (const line of lines) {
    const m = line.match(labels);
    if (m) return m[1]?.trim() ?? null;
  }
  return null;
}

function findLabeledAmount(lines: string[], labels: RegExp): number | null {
  for (const line of lines) {
    const m = line.match(labels);
    if (m && m[1]) return cleanNumber(m[1]);
  }
  return null;
}

function detectCurrency(text: string): string {
  if (/€/.test(text) || /\bEUR\b/i.test(text)) return "EUR";
  if (/£/.test(text) || /\bGBP\b/i.test(text)) return "GBP";
  if (/¥/.test(text) || /\bJPY\b/i.test(text)) return "JPY";
  if (/\bCAD\b/i.test(text)) return "CAD";
  if (/\bAUD\b/i.test(text)) return "AUD";
  return "USD";
}

function extractLineItems(lines: string[]): ExtractedLineItem[] {
  const items: ExtractedLineItem[] = [];
  const moneyToken = /\$?\-?\d[\d,]*\.?\d{0,2}/;
  const rowRegex = new RegExp(
    `^(.{3,60}?)\\s{1,}(\\d+(?:\\.\\d+)?)\\s{1,}(${moneyToken.source})\\s{1,}(${moneyToken.source})\\s*$`
  );

  const skipWords = /^(subtotal|total|tax|amount due|balance|grand total|item|description|qty|quantity|date|invoice|bill to|from|due)/i;

  for (const line of lines) {
    if (skipWords.test(line.trim())) continue;
    const match = line.match(rowRegex);
    if (match) {
      const [, description, qty, unitPriceRaw, amountRaw] = match;
      items.push({
        description: description.trim(),
        quantity: cleanNumber(qty),
        unitPrice: cleanNumber(unitPriceRaw),
        amount: cleanNumber(amountRaw),
      });
      continue;
    }
    // fallback: "Description ......... $123.45"
    const simple = line.match(/^(.{3,60}?)\s{2,}\$?(\d[\d,]*\.\d{2})\s*$/);
    if (simple && !skipWords.test(simple[1])) {
      const amount = cleanNumber(simple[2]);
      items.push({
        description: simple[1].trim(),
        quantity: 1,
        unitPrice: amount,
        amount,
      });
    }
  }
  return items;
}

export function heuristicExtractInvoice(rawText: string): ExtractedInvoice {
  const text = rawText.replace(/\r\n/g, "\n");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let confidenceHits = 0;
  let confidenceTotal = 6;

  // Vendor name
  let vendorName =
    findLabeledValue(lines, /^(?:from|vendor|company|bill\s*from|seller)\s*[:\-]\s*(.+)$/i) ?? null;
  if (vendorName) confidenceHits++;
  if (!vendorName) {
    const candidate = lines.find(
      (l) => !/invoice/i.test(l) && l.length > 2 && l.length < 60 && !/^\d/.test(l)
    );
    vendorName = candidate ?? "Unknown Vendor";
  }

  // Invoice number
  const invoiceNumber =
    findLabeledValue(
      lines,
      /invoice\s*(?:#|no\.?|number)?\s*[:\-]\s*([A-Za-z0-9\-\/]+)/i
    ) ?? null;
  if (invoiceNumber) confidenceHits++;

  // Dates
  const issueDateRaw =
    findLabeledValue(lines, /^(?:invoice\s*date|date issued|date)\s*[:\-]\s*(.+)$/i) ?? null;
  const dueDateRaw =
    findLabeledValue(lines, /^(?:due date|payment due|due)\s*[:\-]\s*(.+)$/i) ?? null;
  const issueDate = normalizeDate(issueDateRaw) ?? normalizeDate(text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)?.[0]);
  const dueDate = normalizeDate(dueDateRaw);
  if (issueDate) confidenceHits++;
  if (dueDate) confidenceHits++;

  // Amounts
  const moneyPattern = "\\$?\\s?([\\d,]+\\.\\d{2})";
  const subtotal =
    findLabeledAmount(lines, new RegExp(`^sub\\s*-?total\\s*[:\\-]?\\s*${moneyPattern}`, "i")) ?? 0;
  const taxAmount =
    findLabeledAmount(lines, new RegExp(`^(?:tax|vat|gst)\\s*(?:\\([\\d.%]+\\))?\\s*[:\\-]?\\s*${moneyPattern}`, "i")) ?? 0;
  const totalAmount =
    findLabeledAmount(
      lines,
      new RegExp(`^(?:total|grand total|amount due|balance due)\\s*[:\\-]?\\s*${moneyPattern}`, "i")
    ) ?? 0;
  if (totalAmount) confidenceHits++;

  const lineItems = extractLineItems(lines);
  if (lineItems.length > 0) confidenceHits++;

  const computedSubtotal = subtotal || lineItems.reduce((s, i) => s + i.amount, 0);
  const computedTotal = totalAmount || computedSubtotal + taxAmount;

  const currency = detectCurrency(text);
  const category = guessCategory(text);

  const confidence = Math.min(0.95, Math.max(0.3, confidenceHits / confidenceTotal));

  return {
    vendorName: vendorName ?? "Unknown Vendor",
    invoiceNumber,
    issueDate,
    dueDate,
    currency,
    category,
    subtotal: Number(computedSubtotal.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    totalAmount: Number(computedTotal.toFixed(2)),
    lineItems,
    notes: null,
    confidence: Number(confidence.toFixed(2)),
    engine: "heuristic",
  };
}
