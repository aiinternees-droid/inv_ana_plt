import { z } from "zod";
import { INVOICE_CATEGORIES } from "@/lib/categories";

export const lineItemSchema = z.object({
  description: z.string().min(1).max(300),
  quantity: z.number().finite().default(1),
  unitPrice: z.number().finite().default(0),
  amount: z.number().finite().default(0),
});

export const invoiceStatusSchema = z.enum(["unpaid", "pending", "paid", "overdue"]);
export const invoiceSourceSchema = z.enum(["ai", "manual"]);

export const createInvoiceSchema = z.object({
  vendorName: z.string().min(1).max(200),
  invoiceNumber: z.string().max(100).optional().nullable(),
  category: z.string().refine((v) => (INVOICE_CATEGORIES as readonly string[]).includes(v), {
    message: "Invalid category",
  }),
  status: invoiceStatusSchema.default("unpaid"),
  source: invoiceSourceSchema.default("manual"),
  currency: z.string().min(1).max(10).default("USD"),
  issueDate: z.string().min(1),
  dueDate: z.string().optional().nullable(),
  subtotal: z.number().finite().default(0),
  taxAmount: z.number().finite().default(0),
  totalAmount: z.number().finite(),
  notes: z.string().max(2000).optional().nullable(),
  rawText: z.string().max(20000).optional().nullable(),
  confidenceScore: z.number().min(0).max(1).optional().nullable(),
  lineItems: z.array(lineItemSchema).default([]),
});

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  status: invoiceStatusSchema.optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
