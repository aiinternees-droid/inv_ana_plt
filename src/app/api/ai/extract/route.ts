import { NextResponse } from "next/server";
import { extractInvoiceFromText } from "@/lib/ai/extractInvoice";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawText = typeof body?.rawText === "string" ? body.rawText.trim() : "";

    if (!rawText || rawText.length < 10) {
      return NextResponse.json(
        { error: "Please provide invoice text with at least 10 characters." },
        { status: 400 }
      );
    }

    const extracted = await extractInvoiceFromText(rawText);
    return NextResponse.json({ extracted });
  } catch (error) {
    console.error("AI extraction error:", error);
    return NextResponse.json({ error: "Failed to analyze invoice text." }, { status: 500 });
  }
}
