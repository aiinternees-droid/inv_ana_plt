import {
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
  integer,
  boolean,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "unpaid",
  "pending",
  "paid",
  "overdue",
]);

export const invoiceSourceEnum = pgEnum("invoice_source", ["ai", "manual"]);

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  vendorName: text("vendor_name").notNull(),
  invoiceNumber: text("invoice_number"),
  category: text("category").notNull().default("Other"),
  status: invoiceStatusEnum("status").notNull().default("unpaid"),
  source: invoiceSourceEnum("source").notNull().default("manual"),
  currency: text("currency").notNull().default("USD"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  rawText: text("raw_text"),
  confidenceScore: numeric("confidence_score", { precision: 4, scale: 3 }),
  isDuplicateSuspect: boolean("is_duplicate_suspect").notNull().default(false),
  isAnomaly: boolean("is_anomaly").notNull().default(false),
  anomalyReason: text("anomaly_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceLineItems = pgTable("invoice_line_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type NewInvoiceLineItem = typeof invoiceLineItems.$inferInsert;
