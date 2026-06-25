"use client";

import { useEffect, useRef } from "react";
import type { Deal } from "../lib/getDeals";

const STAGE_COLORS: Record<string, string> = {
  Señado: "#f59e0b",
  Pagado: "#10b981",
  Entregado: "#3b82f6",
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

const PROVINCE_COORDS: Record<string, [number, number]> = {
  "Ciudad Autónoma de Buenos Aires": [-34.6, -58.4],
  "Buenos Aires": [-36.5, -60.5],
  "Córdoba": [-31.4, -64.2],
  "Santa Fe": [-30.7, -60.7],
  "Mendoza": [-32.9, -68.8],
  "Tucumán": [-26.8, -65.2],
  "Entre Ríos": [-31.7, -58.5],
  "Salta": [-24.8, -65.4],
  "Misiones": [-27.4, -54.6],
  "Chaco": [-26.4, -60.7],
  "Corrientes": [-29.4, -57.8],
  "Santiago del Estero": [-27.8, -63.3],
  "San Juan": [-30.9, -68.5],
  "Jujuy": [-23.2, -65.3],
  "Río Negro": [-40.8, -67.0],
  "Neuquén": [-38.9, -70.1],
  "Formosa": [-24.9, -61.7],
  "Chubut": [-43.3, -68.5],
  "San Luis": [-33.3, -66.3],
  "Catamarca": [-28.5, -66.9],
  "La Rioja": [-29.4, -67.0],
  "La Pampa": [-36.6, -65.5],
  "Santa Cruz": [-50.0, -69.5],
  "Tierra del Fuego": [-54.0, -66.5],
};

interface Props {
  deals: Deal[];
  onSelectProvincia: (provincia: string | null) => void;
  selectedProvincia: string | null;
}

export default function ArgentinaMap({ deals, onSelectProvincia, selectedProvincia }: Props) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const onSelectRef = useRef(onSelectProvincia);
  const selectedRef = useRef(selectedProvincia);

  // Keep refs current so markers always have fresh callbacks
  useEffect(() => { onSelectRef.current = onSelectProvincia; }, [onSelectProvincia]);
  useEffect(() => { selectedRef.current = selectedProvincia; }, [selectedProvincia]);

  // Group deals by province
  const byProvincia: Record<string, Deal[]> = {};
  for (const d of deals) {
    const norm = normProv(d.provincia);
    if (!byProvincia[norm]) byProvincia[norm] = [];
    byProvincia[norm].push(d);
  }
  const byProvinciaRef = useRef(byProvincia);
  byProvinciaRef.current = byProvincia;

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    if (mapRef.current) return;

    import("leaflet").then((L) => {
      const map = L.map(mapContainerRef.current!, {
        center: [-38, -63],
        zoom: 4,
        minZoom: 4,
        maxZoom: 10,
        maxBounds: [[-58, -80], [-20, -50]],
        maxBoundsViscosity: 1.0,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      mapRef.current = map;
      renderMarkers(L, map);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => renderMarkers(L, mapRef.current));
  }, [deals, selectedProvincia]);

  function renderMarkers(L: any, map: any) {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const [prov, provDeals] of Object.entries(byProvinciaRef.current)) {
      const coords = PROVINCE_COORDS[prov];
      if (!coords) continue;

      const isSelected = selectedRef.current === prov;
      const count = provDeals.length;
      const color = count === 1 ? (STAGE_COLORS[(provDeals[0] as Deal).stageLabel] ?? "#6366f1") : "#6366f1";
      const size = isSelected ? 44 : count > 1 ? 38 : 32;

      const icon = L.divIcon({
        html: `<div style="
          width:${size}px;height:${size}px;
          background:${color};
          border:3px solid white;
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:13px;font-weight:bold;color:white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          cursor:pointer;
        ">${count}</div>`,
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker(coords, { icon })
        .addTo(map)
        .on("click", () => {
          const currentSelected = selectedRef.current;
          onSelectRef.current(currentSelected === prov ? null : prov);
        });

      markersRef.current.push(marker);
    }
  }

  return <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />;
}
