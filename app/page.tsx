import MapClient from "./components/MapClient";
import type { Deal } from "./api/deals/route";

async function getDeals(): Promise<Deal[]> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/deals`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.deals ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const deals = await getDeals();
  return <MapClient initialDeals={deals} />;
}
