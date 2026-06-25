import { NextResponse } from "next/server";

const TOKEN = process.env.HUBSPOT_TOKEN;
const BASE = "https://api.hubapi.com";

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

async function getContactsForDeals(dealIds: string[]) {
  // Fetch all associations in parallel
  const assocResults = await Promise.all(
    dealIds.map((id) =>
      fetch(`${BASE}/crm/v3/objects/deals/${id}/associations/contacts`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.results?.[0]?.id ?? null)
        .catch(() => null)
    )
  );

  // Collect unique contact IDs
  const uniqueContactIds = [...new Set(assocResults.filter(Boolean))] as string[];

  if (uniqueContactIds.length === 0) return new Map<string, any>();

  // Fetch all contacts in parallel
  const contactData = await Promise.all(
    uniqueContactIds.map((cid) =>
      fetch(
        `${BASE}/crm/v3/objects/contacts/${cid}?properties=firstname,lastname,email,phone`,
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    )
  );

  // Build map: contactId -> contact info
  const contactMap = new Map<string, any>();
  for (const c of contactData) {
    if (!c) continue;
    const p = c.properties;
    contactMap.set(c.id, {
      name: [p.firstname, p.lastname].filter(Boolean).join(" ") || "Sin nombre",
      email: p.email ?? "",
      phone: p.phone ?? "",
    });
  }

  // Build map: dealId -> contact info
  const dealContactMap = new Map<string, any>();
  dealIds.forEach((id, i) => {
    const contactId = assocResults[i];
    if (contactId && contactMap.has(contactId)) {
      dealContactMap.set(id, contactMap.get(contactId));
    }
  });

  return dealContactMap;
}

export async function GET() {
  try {
    const deals = await getAllDeals();
    const contactMap = await getContactsForDeals(deals.map((d) => d.id));

    for (const deal of deals) {
      deal.contact = contactMap.get(deal.id) ?? null;
    }

    return NextResponse.json({ deals });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error fetching deals" }, { status: 500 });
  }
}
