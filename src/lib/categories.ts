export const INVOICE_CATEGORIES = [
  "Software & SaaS",
  "Office Supplies",
  "Travel",
  "Utilities",
  "Marketing",
  "Professional Services",
  "Rent & Facilities",
  "Equipment & Hardware",
  "Logistics & Shipping",
  "Insurance",
  "Other",
] as const;

export type InvoiceCategory = (typeof INVOICE_CATEGORIES)[number];

const KEYWORD_MAP: Array<{ keywords: string[]; category: InvoiceCategory }> = [
  { keywords: ["saas", "software", "subscription", "license", "cloud", "hosting", "api", "aws", "azure", "github", "slack", "zoom"], category: "Software & SaaS" },
  { keywords: ["paper", "stationery", "office supply", "toner", "ink", "printer"], category: "Office Supplies" },
  { keywords: ["flight", "hotel", "airfare", "travel", "uber", "lyft", "taxi", "rental car"], category: "Travel" },
  { keywords: ["electric", "water", "gas bill", "utility", "utilities", "internet service", "broadband"], category: "Utilities" },
  { keywords: ["ads", "advertising", "marketing", "campaign", "seo", "social media"], category: "Marketing" },
  { keywords: ["consulting", "legal", "accounting", "audit", "attorney", "professional services", "contractor"], category: "Professional Services" },
  { keywords: ["rent", "lease", "office space", "facility", "facilities"], category: "Rent & Facilities" },
  { keywords: ["laptop", "hardware", "equipment", "monitor", "server rack", "computer"], category: "Equipment & Hardware" },
  { keywords: ["shipping", "freight", "logistics", "courier", "delivery"], category: "Logistics & Shipping" },
  { keywords: ["insurance", "policy premium", "liability coverage"], category: "Insurance" },
];

export function guessCategory(text: string): InvoiceCategory {
  const lower = text.toLowerCase();
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.category;
    }
  }
  return "Other";
}
