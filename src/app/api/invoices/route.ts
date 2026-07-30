import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoiceLineItems, invoices } from "@/db/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { createInvoiceSchema } from "@/lib/validation";
import { computeInvoiceFlags } from "@/lib/flags";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(invoices.vendorName, `%${search}%`),
        ilike(invoices.invoiceNumber, `%${search}%`)
      )
    );
  }
  if (status && status !== "all") {
    conditions.push(eq(invoices.status, status as "unpaid" | "pending" | "paid" | "overdue"));
  }
  if (category && category !== "all") {
    conditions.push(eq(invoices.category, category));
  }

  const rows = await db
    .select()
    .from(invoices)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(invoices.issueDate), desc(invoices.id));

  return NextResponse.json({ invoices: rows });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid invoice data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const flags = await computeInvoiceFlags({
      vendorName: data.vendorName,
      totalAmount: data.totalAmount,
      issueDate: data.issueDate,
    });

    const [created] = await db
      .insert(invoices)
      .values({
        vendorName: data.vendorName,
        invoiceNumber: data.invoiceNumber || null,
        category: data.category,
        status: data.status,
        source: data.source,
        currency: data.currency,
        issueDate: data.issueDate,
        dueDate: data.dueDate || null,
        subtotal: data.subtotal.toFixed(2),
        taxAmount: data.taxAmount.toFixed(2),
        totalAmount: data.totalAmount.toFixed(2),
        notes: data.notes || null,
        rawText: data.rawText || null,
        confidenceScore: data.confidenceScore != null ? data.confidenceScore.toFixed(3) : null,
        isDuplicateSuspect: flags.isDuplicateSuspect,
        isAnomaly: flags.isAnomaly,
        anomalyReason: flags.isAnomaly ? flags.anomalyReason : flags.duplicateReason,
      })
      .returning();

    if (data.lineItems.length > 0) {
      await db.insert(invoiceLineItems).values(
        data.lineItems.map((li) => ({
          invoiceId: created.id,
          description: li.description,
          quantity: li.quantity.toFixed(2),
          unitPrice: li.unitPrice.toFixed(2),
          amount: li.amount.toFixed(2),
        }))
      );
    }

    return NextResponse.json({ invoice: created, flags }, { status: 201 });
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice." }, { status: 500 });
  }
}
