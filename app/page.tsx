import MapClient from "./components/MapClient";
import { getDeals } from "./lib/getDeals";

export const dynamic = "force-dynamic";

export default async function Home() {
  const deals = await getDeals();
  return <MapClient initialDeals={deals} />;
}
