import { db } from "@/db";
import { invoices } from "@/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";
import { toNumber } from "@/lib/format";

interface FlagInput {
  vendorName: string;
  totalAmount: number;
  issueDate: string;
  excludeId?: number;
}

export interface FlagResult {
  isDuplicateSuspect: boolean;
  duplicateReason: string | null;
  isAnomaly: boolean;
  anomalyReason: string | null;
}

export async function computeInvoiceFlags(input: FlagInput): Promise<FlagResult> {
  const { vendorName, totalAmount, issueDate, excludeId } = input;

  // --- Duplicate detection: same vendor (case-insensitive), similar amount, close date ---
  const vendorInvoices = await db
    .select()
    .from(invoices)
    .where(
      excludeId
        ? and(sql`lower(${invoices.vendorName}) = lower(${vendorName})`, ne(invoices.id, excludeId))
        : sql`lower(${invoices.vendorName}) = lower(${vendorName})`
    );

  const issueDateMs = new Date(issueDate).getTime();
  let isDuplicateSuspect = false;
  let duplicateReason: string | null = null;

  for (const inv of vendorInvoices) {
    const invTotal = toNumber(inv.totalAmount);
    const amountDiff = Math.abs(invTotal - totalAmount);
    const amountTolerance = Math.max(0.01, invTotal * 0.01);
    const invDateMs = new Date(inv.issueDate).getTime();
    const daysApart = Math.abs(invDateMs - issueDateMs) / (1000 * 60 * 60 * 24);

    if (amountDiff <= amountTolerance && daysApart <= 5) {
      isDuplicateSuspect = true;
      duplicateReason = `Matches invoice #${inv.id} from ${inv.vendorName} (same amount, within ${Math.round(
        daysApart
      )} day(s))`;
      break;
    }
  }

  // --- Anomaly detection: compare to vendor historical average ---
  let isAnomaly = false;
  let anomalyReason: string | null = null;

  const amounts = vendorInvoices.map((inv) => toNumber(inv.totalAmount)).filter((n) => n > 0);
  if (amounts.length >= 2) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + Math.max(2 * stdDev, mean * 0.5);
    if (totalAmount > threshold) {
      isAnomaly = true;
      anomalyReason = `${Math.round(
        (totalAmount / mean - 1) * 100
      )}% above this vendor's average invoice of $${mean.toFixed(2)}`;
    }
  } else if (amounts.length === 1 && amounts[0] > 0) {
    const prior = amounts[0];
    if (totalAmount > prior * 2.5) {
      isAnomaly = true;
      anomalyReason = `More than 2.5x the vendor's previous invoice of $${prior.toFixed(2)}`;
    }
  }

  return { isDuplicateSuspect, duplicateReason, isAnomaly, anomalyReason };
}
