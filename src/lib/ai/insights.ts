export interface InsightStats {
  totalSpend: number;
  totalInvoices: number;
  avgInvoice: number;
  outstandingAmount: number;
  overdueAmount: number;
  overdueCount: number;
  momChangePercent: number | null;
  topVendor: { name: string; total: number; share: number } | null;
  topCategory: { name: string; total: number; share: number } | null;
  anomalyCount: number;
  duplicateCount: number;
  currency: string;
}

function fmt(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `$${n.toFixed(0)}`;
  }
}

export function generateHeuristicInsights(stats: InsightStats): string[] {
  const insights: string[] = [];
  const cur = stats.currency || "USD";

  if (stats.totalInvoices === 0) {
    return [
      "No invoices yet — import your first invoice using the AI Import tool to unlock spending insights, anomaly detection, and trend analysis.",
    ];
  }

  insights.push(
    `Total tracked spend is ${fmt(stats.totalSpend, cur)} across ${stats.totalInvoices} invoice${
      stats.totalInvoices === 1 ? "" : "s"
    }, averaging ${fmt(stats.avgInvoice, cur)} per invoice.`
  );

  if (stats.momChangePercent !== null) {
    const direction = stats.momChangePercent >= 0 ? "increased" : "decreased";
    insights.push(
      `Spend ${direction} ${Math.abs(stats.momChangePercent).toFixed(1)}% compared to the previous month.`
    );
  }

  if (stats.topVendor) {
    insights.push(
      `${stats.topVendor.name} is your top vendor, accounting for ${stats.topVendor.share.toFixed(
        0
      )}% of total spend (${fmt(stats.topVendor.total, cur)}).`
    );
  }

  if (stats.topCategory) {
    insights.push(
      `"${stats.topCategory.name}" is the largest spending category at ${fmt(
        stats.topCategory.total,
        cur
      )} (${stats.topCategory.share.toFixed(0)}% of total).`
    );
  }

  if (stats.overdueCount > 0) {
    insights.push(
      `⚠️ ${stats.overdueCount} invoice${stats.overdueCount === 1 ? " is" : "s are"} overdue, totalling ${fmt(
        stats.overdueAmount,
        cur
      )}. Prioritize these payments to avoid late fees.`
    );
  }

  if (stats.outstandingAmount > 0) {
    insights.push(`${fmt(stats.outstandingAmount, cur)} in invoices are still unpaid or pending.`);
  }

  if (stats.anomalyCount > 0) {
    insights.push(
      `🔎 The AI anomaly detector flagged ${stats.anomalyCount} invoice${
        stats.anomalyCount === 1 ? "" : "s"
      } with unusually high amounts compared to vendor history — review these for errors or fraud.`
    );
  }

  if (stats.duplicateCount > 0) {
    insights.push(
      `📋 ${stats.duplicateCount} potential duplicate invoice${
        stats.duplicateCount === 1 ? "" : "s"
      } detected based on matching vendor, amount, and date — verify before paying twice.`
    );
  }

  if (stats.anomalyCount === 0 && stats.duplicateCount === 0 && stats.overdueCount === 0) {
    insights.push("✅ No anomalies, duplicates, or overdue invoices detected. Your invoice pipeline looks healthy.");
  }

  return insights;
}

async function generateNarrativeWithOpenAI(stats: InsightStats, bullets: string[]): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are a financial analyst assistant. Write a concise 2-3 sentence executive summary of invoice spending based on the provided bullet insights. Be direct and specific, referencing numbers already given. No preamble.",
        },
        { role: "user", content: `Stats: ${JSON.stringify(stats)}\n\nBullets:\n${bullets.join("\n")}` },
      ],
    });
    return response.choices[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    console.error("OpenAI narrative generation failed:", error);
    return null;
  }
}

export async function generateInsights(stats: InsightStats): Promise<{
  bullets: string[];
  narrative: string | null;
  engine: "openai" | "heuristic";
}> {
  const bullets = generateHeuristicInsights(stats);
  const narrative = await generateNarrativeWithOpenAI(stats, bullets);
  return { bullets, narrative, engine: narrative ? "openai" : "heuristic" };
}
