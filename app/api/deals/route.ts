import { NextResponse } from "next/server";
import { getDeals } from "../../lib/getDeals";

export type { Deal } from "../../lib/getDeals";

export async function GET() {
  try {
    const deals = await getDeals();
    return NextResponse.json({ deals });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error fetching deals" }, { status: 500 });
  }
}
