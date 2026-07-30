import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoiceLineItems, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateInvoiceSchema } from "@/lib/validation";
import { computeInvoiceFlags } from "@/lib/flags";

async function getInvoiceWithItems(id: number) {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!invoice) return null;
  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, id));
  return { invoice, lineItems };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  if (Number.isNaN(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
  }

  const result = await getInvoiceWithItems(invoiceId);
  if (!result) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  if (Number.isNaN(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const [existing] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const vendorName = data.vendorName ?? existing.vendorName;
    const totalAmount = data.totalAmount ?? Number(existing.totalAmount);
    const issueDate = data.issueDate ?? existing.issueDate;

    let flagUpdate = {};
    if (data.vendorName || data.totalAmount !== undefined || data.issueDate) {
      const flags = await computeInvoiceFlags({
        vendorName,
        totalAmount,
        issueDate,
        excludeId: invoiceId,
      });
      flagUpdate = {
        isDuplicateSuspect: flags.isDuplicateSuspect,
        isAnomaly: flags.isAnomaly,
        anomalyReason: flags.isAnomaly ? flags.anomalyReason : flags.duplicateReason,
      };
    }

    const [updated] = await db
      .update(invoices)
      .set({
        ...(data.vendorName !== undefined ? { vendorName: data.vendorName } : {}),
        ...(data.invoiceNumber !== undefined ? { invoiceNumber: data.invoiceNumber } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.issueDate !== undefined ? { issueDate: data.issueDate } : {}),
        ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
        ...(data.subtotal !== undefined ? { subtotal: data.subtotal.toFixed(2) } : {}),
        ...(data.taxAmount !== undefined ? { taxAmount: data.taxAmount.toFixed(2) } : {}),
        ...(data.totalAmount !== undefined ? { totalAmount: data.totalAmount.toFixed(2) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...flagUpdate,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    if (data.lineItems) {
      await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
      if (data.lineItems.length > 0) {
        await db.insert(invoiceLineItems).values(
          data.lineItems.map((li) => ({
            invoiceId,
            description: li.description,
            quantity: li.quantity.toFixed(2),
            unitPrice: li.unitPrice.toFixed(2),
            amount: li.amount.toFixed(2),
          }))
        );
      }
    }

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    console.error("Failed to update invoice:", error);
    return NextResponse.json({ error: "Failed to update invoice." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  if (Number.isNaN(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
  }

  const [deleted] = await db.delete(invoices).where(eq(invoices.id, invoiceId)).returning();
  if (!deleted) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
