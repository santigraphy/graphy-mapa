"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Deal } from "../lib/getDeals";
import DealPanel from "./DealPanel";

const ArgentinaMap = dynamic(() => import("./ArgentinaMap"), { ssr: false });

const STAGE_COLORS: Record<string, string> = {
  Señado: "bg-amber-400",
  Pagado: "bg-emerald-500",
  Entregado: "bg-blue-500",
};

function normProv(p: string) {
  const map: Record<string, string> = {
    "capital federal": "Ciudad Autónoma de Buenos Aires",
    caba: "Ciudad Autónoma de Buenos Aires",
    "ciudad autónoma de buenos aires": "Ciudad Autónoma de Buenos Aires",
    córdoba: "Córdoba",
    cordoba: "Córdoba",
    tucumán: "Tucumán",
    tucuman: "Tucumán",
    "entre ríos": "Entre Ríos",
    "entre rios": "Entre Ríos",
    neuquén: "Neuquén",
    neuquen: "Neuquén",
    "río negro": "Río Negro",
    "rio negro": "Río Negro",
  };
  return map[p.toLowerCase().trim()] ?? p;
}

export default function MapClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deals");
      const data = await res.json();
      setDeals(data.deals ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  const byProvincia: Record<string, Deal[]> = {};
  for (const d of deals) {
    const norm = normProv(d.provincia);
    if (!byProvincia[norm]) byProvincia[norm] = [];
    byProvincia[norm].push(d);
  }

  const selectedDeals = selected ? byProvincia[selected] ?? [] : [];

  const total = deals.length;
  const byStage: Record<string, number> = {};
  for (const d of deals) {
    byStage[d.stageLabel] = (byStage[d.stageLabel] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">G</span>
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 text-base leading-tight">
              Graphy — Mapa de Laboratorios
            </h1>
            <p className="text-xs text-gray-500">
              {loading
                ? "Cargando..."
                : `${total} laboratorio${total !== 1 ? "s" : ""} en ${Object.keys(byProvincia).length} provincia${Object.keys(byProvincia).length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3">
            {Object.entries(STAGE_COLORS).map(([stage, color]) => (
              <div key={stage} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <span className="text-xs text-gray-600">
                  {stage} ({byStage[stage] ?? 0})
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={fetchDeals}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Cargando..." : "↻ Actualizar"}
          </button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        <ArgentinaMap
          deals={deals}
          onSelectProvincia={setSelected}
          selectedProvincia={selected}
        />

        {selected && selectedDeals.length > 0 && (
          <DealPanel
            deals={selectedDeals}
            provincia={selected}
            onClose={() => setSelected(null)}
          />
        )}

        {!selected && !loading && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-sm text-xs text-gray-500 px-3 py-1.5 rounded-full shadow border border-gray-100 z-[1000]">
            Hacé click en un pin para ver los laboratorios
          </div>
        )}
      </div>
    </div>
  );
}
