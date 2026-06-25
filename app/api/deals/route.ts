import { NextResponse } from "next/server";

const TOKEN = process.env.HUBSPOT_TOKEN;
const BASE = "https://api.hubapi.com";

// Stage IDs from Graphy Starter Kit pipeline
const TARGET_STAGES = ["decisionmakerboughtin", "1347872371", "contractsent"];
const STAGE_LABELS: Record<string, string> = {
  decisionmakerboughtin: "Señado",
  "1347872371": "Pagado",
  contractsent: "Entregado",
};

export interface Deal {
  id: string;
  name: string;
  stage: string;
  stageLabel: string;
  provincia: string;
  contact: {
    name: string;
    email: string;
    phone: string;
  } | null;
}

async function getAllDeals(): Promise<Deal[]> {
  const deals: Deal[] = [];
  let after: string | undefined;

  do {
    const params = new URLSearchParams({
      limit: "100",
      properties: "dealname,dealstage,provincia",
      ...(after ? { after } : {}),
    });

    const res = await fetch(`${BASE}/crm/v3/objects/deals?${params}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      next: { revalidate: 0 },
    });

    if (!res.ok) break;
    const data = await res.json();

    for (const deal of data.results ?? []) {
      const stage = deal.properties.dealstage;
      if (!TARGET_STAGES.includes(stage)) continue;
      const provincia = deal.properties.provincia;
      if (!provincia) continue;

      deals.push({
        id: deal.id,
        name: deal.properties.dealname ?? "Sin nombre",
        stage,
        stageLabel: STAGE_LABELS[stage],
        provincia,
        contact: null,
      });
    }

    after = data.paging?.next?.after;
  } while (after);

  return deals;
}

async function getContactForDeal(dealId: string) {
  const res = await fetch(
    `${BASE}/crm/v3/objects/deals/${dealId}/associations/contacts`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const contactId = data.results?.[0]?.id;
  if (!contactId) return null;

  const cRes = await fetch(
    `${BASE}/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,phone`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  if (!cRes.ok) return null;
  const c = await cRes.json();
  const p = c.properties;
  return {
    name: [p.firstname, p.lastname].filter(Boolean).join(" ") || "Sin nombre",
    email: p.email ?? "",
    phone: p.phone ?? "",
  };
}

export async function GET() {
  try {
    const deals = await getAllDeals();

    // Fetch contacts in parallel (batches of 10)
    const batchSize = 10;
    for (let i = 0; i < deals.length; i += batchSize) {
      const batch = deals.slice(i, i + batchSize);
      const contacts = await Promise.all(
        batch.map((d) => getContactForDeal(d.id))
      );
      contacts.forEach((c, j) => {
        deals[i + j].contact = c;
      });
    }

    return NextResponse.json({ deals });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error fetching deals" }, { status: 500 });
  }
}
