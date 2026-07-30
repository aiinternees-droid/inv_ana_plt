export interface ExtractedLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface ExtractedInvoice {
  vendorName: string;
  invoiceNumber: string | null;
  issueDate: string | null;
  dueDate: string | null;
  currency: string;
  category: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  lineItems: ExtractedLineItem[];
  notes: string | null;
  confidence: number;
  engine: "openai" | "heuristic";
}
