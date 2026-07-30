import { heuristicExtractInvoice } from "./heuristicExtract";
import { INVOICE_CATEGORIES } from "@/lib/categories";
import type { ExtractedInvoice } from "./types";

async function extractWithOpenAI(rawText: string): Promise<ExtractedInvoice | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert invoice data extraction engine. Extract structured fields from raw invoice text and respond ONLY with strict JSON matching the schema given. Use null for unknown fields. Dates must be formatted YYYY-MM-DD. Numbers must be plain numbers (no currency symbols).",
        },
        {
          role: "user",
          content: `Extract data from this invoice text. Category must be one of: ${INVOICE_CATEGORIES.join(", ")}.

Schema:
{
  "vendorName": string,
  "invoiceNumber": string | null,
  "issueDate": string | null,
  "dueDate": string | null,
  "currency": string,
  "category": string,
  "subtotal": number,
  "taxAmount": number,
  "totalAmount": number,
  "lineItems": [{ "description": string, "quantity": number, "unitPrice": number, "amount": number }],
  "notes": string | null
}

Invoice text:
"""
${rawText.slice(0, 6000)}
"""`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);

    return {
      vendorName: parsed.vendorName || "Unknown Vendor",
      invoiceNumber: parsed.invoiceNumber ?? null,
      issueDate: parsed.issueDate ?? null,
      dueDate: parsed.dueDate ?? null,
      currency: parsed.currency || "USD",
      category: INVOICE_CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
      subtotal: Number(parsed.subtotal) || 0,
      taxAmount: Number(parsed.taxAmount) || 0,
      totalAmount: Number(parsed.totalAmount) || 0,
      lineItems: Array.isArray(parsed.lineItems)
        ? parsed.lineItems.map((li: Record<string, unknown>) => ({
            description: String(li.description ?? "Item"),
            quantity: Number(li.quantity) || 1,
            unitPrice: Number(li.unitPrice) || 0,
            amount: Number(li.amount) || 0,
          }))
        : [],
      notes: parsed.notes ?? null,
      confidence: 0.97,
      engine: "openai",
    };
  } catch (error) {
    console.error("OpenAI extraction failed, falling back to heuristic parser:", error);
    return null;
  }
}

export async function extractInvoiceFromText(rawText: string): Promise<ExtractedInvoice> {
  const aiResult = await extractWithOpenAI(rawText);
  if (aiResult) return aiResult;
  return heuristicExtractInvoice(rawText);
}
