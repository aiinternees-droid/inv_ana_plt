import { db } from "@/db";
import { invoices, type Invoice } from "@/db/schema";
import { toNumber } from "@/lib/format";
import { generateInsights, type InsightStats } from "@/lib/ai/insights";

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export interface DashboardAnalytics {
  stats: InsightStats;
  monthlyTrend: { month: string; total: number }[];
  categoryBreakdown: { category: string; total: number }[];
  vendorBreakdown: { vendor: string; total: number }[];
  statusBreakdown: { status: string; count: number }[];
  anomalies: Invoice[];
  duplicates: Invoice[];
  recent: Invoice[];
  insights: { bullets: string[]; narrative: string | null; engine: "openai" | "heuristic" };
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  const rows = await db.select().from(invoices);

  const totalInvoices = rows.length;
  const totalSpend = rows.reduce((sum, r) => sum + toNumber(r.totalAmount), 0);
  const avgInvoice = totalInvoices > 0 ? totalSpend / totalInvoices : 0;

  const today = new Date();
  const outstanding = rows.filter((r) => r.status !== "paid");
  const outstandingAmount = outstanding.reduce((sum, r) => sum + toNumber(r.totalAmount), 0);

  const overdueRows = rows.filter((r) => {
    if (r.status === "paid") return false;
    if (r.status === "overdue") return true;
    if (r.dueDate && new Date(r.dueDate) < today) return true;
    return false;
  });
  const overdueAmount = overdueRows.reduce((sum, r) => sum + toNumber(r.totalAmount), 0);

  const monthMap = new Map<string, number>();
  for (const r of rows) {
    const key = monthKey(r.issueDate);
    monthMap.set(key, (monthMap.get(key) ?? 0) + toNumber(r.totalAmount));
  }
  const sortedMonthKeys = Array.from(monthMap.keys()).sort();
  const last12 = sortedMonthKeys.slice(-12);
  const monthlyTrend = last12.map((key) => ({
    month: monthLabel(key),
    total: Number((monthMap.get(key) ?? 0).toFixed(2)),
  }));

  let momChangePercent: number | null = null;
  if (sortedMonthKeys.length >= 2) {
    const lastKey = sortedMonthKeys[sortedMonthKeys.length - 1];
    const prevKey = sortedMonthKeys[sortedMonthKeys.length - 2];
    const lastVal = monthMap.get(lastKey) ?? 0;
    const prevVal = monthMap.get(prevKey) ?? 0;
    momChangePercent = prevVal > 0 ? ((lastVal - prevVal) / prevVal) * 100 : null;
  }

  const categoryMap = new Map<string, number>();
  for (const r of rows) {
    categoryMap.set(r.category, (categoryMap.get(r.category) ?? 0) + toNumber(r.totalAmount));
  }
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total);

  const vendorMap = new Map<string, number>();
  for (const r of rows) {
    vendorMap.set(r.vendorName, (vendorMap.get(r.vendorName) ?? 0) + toNumber(r.totalAmount));
  }
  const vendorBreakdown = Array.from(vendorMap.entries())
    .map(([vendor, total]) => ({ vendor, total: Number(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const statusMap = new Map<string, number>();
  for (const r of rows) {
    statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);
  }
  const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  const anomalies = rows
    .filter((r) => r.isAnomaly)
    .sort((a, b) => b.id - a.id)
    .slice(0, 10);
  const duplicates = rows
    .filter((r) => r.isDuplicateSuspect)
    .sort((a, b) => b.id - a.id)
    .slice(0, 10);

  const recent = [...rows]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const topVendorEntry = vendorBreakdown[0];
  const topCategoryEntry = categoryBreakdown[0];
  const currency = rows[0]?.currency || "USD";

  const stats: InsightStats = {
    totalSpend: Number(totalSpend.toFixed(2)),
    totalInvoices,
    avgInvoice: Number(avgInvoice.toFixed(2)),
    outstandingAmount: Number(outstandingAmount.toFixed(2)),
    overdueAmount: Number(overdueAmount.toFixed(2)),
    overdueCount: overdueRows.length,
    momChangePercent: momChangePercent !== null ? Number(momChangePercent.toFixed(2)) : null,
    topVendor:
      topVendorEntry && totalSpend > 0
        ? { name: topVendorEntry.vendor, total: topVendorEntry.total, share: (topVendorEntry.total / totalSpend) * 100 }
        : null,
    topCategory:
      topCategoryEntry && totalSpend > 0
        ? {
            name: topCategoryEntry.category,
            total: topCategoryEntry.total,
            share: (topCategoryEntry.total / totalSpend) * 100,
          }
        : null,
    anomalyCount: anomalies.length,
    duplicateCount: duplicates.length,
    currency,
  };

  const insights = await generateInsights(stats);

  return {
    stats,
    monthlyTrend,
    categoryBreakdown,
    vendorBreakdown,
    statusBreakdown,
    anomalies,
    duplicates,
    recent,
    insights,
  };
}
