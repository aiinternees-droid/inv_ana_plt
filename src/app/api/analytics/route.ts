import { NextResponse } from "next/server";
import { getDashboardAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getDashboardAnalytics();
  return NextResponse.json(data);
}
