import type { Deal } from "../api/deals/route";

const TOKEN = process.env.HUBSPOT_TOKEN;
const BASE = "https://api.hubapi.com";

const TARGET_STAGES = ["decisionmakerboughtin", "1347872371", "contractsent"];
const STAGE_LABELS: Record<string, string> = {
  decisionmakerboughtin: "Señado",
  "1347872371": "Pagado",
  contractsent: "Entregado",
};

async function fetchAllDeals(): Promise<Deal[]> {
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
      cache: "no-store",
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

async function enrichWithContacts(deals: Deal[]): Promise<Deal[]> {
  const assocResults = await Promise.all(
    deals.map((d) =>
      fetch(`${BASE}/crm/v3/objects/deals/${d.id}/associations/contacts`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => data?.results?.[0]?.id ?? null)
        .catch(() => null)
    )
  );

  const uniqueIds = [...new Set(assocResults.filter(Boolean))] as string[];

  const contactData = await Promise.all(
    uniqueIds.map((cid) =>
      fetch(
        `${BASE}/crm/v3/objects/contacts/${cid}?properties=firstname,lastname,email,phone`,
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    )
  );

  const contactMap = new Map<string, { name: string; email: string; phone: string }>();
  for (const c of contactData) {
    if (!c) continue;
    const p = c.properties;
    contactMap.set(c.id, {
      name: [p.firstname, p.lastname].filter(Boolean).join(" ") || "Sin nombre",
      email: p.email ?? "",
      phone: p.phone ?? "",
    });
  }

  return deals.map((deal, i) => ({
    ...deal,
    contact: assocResults[i] ? contactMap.get(assocResults[i]!) ?? null : null,
  }));
}

export async function getDeals(): Promise<Deal[]> {
  try {
    const deals = await fetchAllDeals();
    return await enrichWithContacts(deals);
  } catch {
    return [];
  }
}
