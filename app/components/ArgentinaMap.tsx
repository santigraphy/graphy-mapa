"use client";

import { useEffect, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import type { Deal } from "../api/deals/route";

const GEO_URL =
  "https://raw.githubusercontent.com/deldersveld/topojson/master/countries/argentina/argentina-provinces.json";

// Map from HubSpot provincia values to province names in the GeoJSON
const PROVINCIA_NORM: Record<string, string> = {
  "capital federal": "Ciudad Autónoma de Buenos Aires",
  "ciudad autónoma de buenos aires": "Ciudad Autónoma de Buenos Aires",
  "caba": "Ciudad Autónoma de Buenos Aires",
  "buenos aires": "Buenos Aires",
  "córdoba": "Córdoba",
  "cordoba": "Córdoba",
  "santa fe": "Santa Fe",
  "mendoza": "Mendoza",
  "tucumán": "Tucumán",
  "tucuman": "Tucumán",
  "entre ríos": "Entre Ríos",
  "entre rios": "Entre Ríos",
  "salta": "Salta",
  "misiones": "Misiones",
  "chaco": "Chaco",
  "corrientes": "Corrientes",
  "santiago del estero": "Santiago del Estero",
  "san juan": "San Juan",
  "jujuy": "Jujuy",
  "río negro": "Río Negro",
  "rio negro": "Río Negro",
  "neuquén": "Neuquén",
  "neuquen": "Neuquén",
  "formosa": "Formosa",
  "chubut": "Chubut",
  "san luis": "San Luis",
  "catamarca": "Catamarca",
  "la rioja": "La Rioja",
  "la pampa": "La Pampa",
  "santa cruz": "Santa Cruz",
  "tierra del fuego": "Tierra del Fuego",
};

function normalizeProvincia(p: string): string {
  return PROVINCIA_NORM[p.toLowerCase().trim()] ?? p;
}

// Approximate centroids for each province
const PROVINCE_COORDS: Record<string, [number, number]> = {
  "Ciudad Autónoma de Buenos Aires": [-58.4, -34.6],
  "Buenos Aires": [-60.5, -36.5],
  "Córdoba": [-64.2, -31.4],
  "Santa Fe": [-60.7, -30.7],
  "Mendoza": [-68.8, -32.9],
  "Tucumán": [-65.2, -26.8],
  "Entre Ríos": [-58.5, -31.7],
  "Salta": [-65.4, -24.8],
  "Misiones": [-54.6, -27.4],
  "Chaco": [-60.7, -26.4],
  "Corrientes": [-57.8, -29.4],
  "Santiago del Estero": [-63.3, -27.8],
  "San Juan": [-68.5, -30.9],
  "Jujuy": [-65.3, -23.2],
  "Río Negro": [-67.0, -40.8],
  "Neuquén": [-70.1, -38.9],
  "Formosa": [-61.7, -24.9],
  "Chubut": [-68.5, -43.3],
  "San Luis": [-66.3, -33.3],
  "Catamarca": [-66.9, -28.5],
  "La Rioja": [-67.0, -29.4],
  "La Pampa": [-65.5, -36.6],
  "Santa Cruz": [-69.5, -50.0],
  "Tierra del Fuego": [-66.5, -54.0],
};

const STAGE_COLORS: Record<string, string> = {
  Señado: "#f59e0b",
  Pagado: "#10b981",
  Entregado: "#3b82f6",
};

interface Props {
  deals: Deal[];
  onSelectProvincia: (provincia: string | null) => void;
  selectedProvincia: string | null;
}

export default function ArgentinaMap({ deals, onSelectProvincia, selectedProvincia }: Props) {
  const [geoReady, setGeoReady] = useState(false);

  // Group deals by normalized provincia
  const byProvincia: Record<string, Deal[]> = {};
  for (const d of deals) {
    const norm = normalizeProvincia(d.provincia);
    if (!byProvincia[norm]) byProvincia[norm] = [];
    byProvincia[norm].push(d);
  }

  const markers = Object.entries(byProvincia)
    .map(([prov, provDeals]) => ({
      prov,
      deals: provDeals,
      coords: PROVINCE_COORDS[prov] as [number, number] | undefined,
    }))
    .filter((m) => m.coords);

  return (
    <div className="w-full h-full">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [-65, -38], scale: 700 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={GEO_URL} onError={() => setGeoReady(false)}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const name = geo.properties.NAME_1 ?? geo.properties.name;
              const isSelected = selectedProvincia && normalizeProvincia(selectedProvincia) === name;
              const hasDeals = Object.keys(byProvincia).some(
                (p) => normalizeProvincia(p) === name || p === name
              );
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => {
                    if (hasDeals) {
                      onSelectProvincia(isSelected ? null : name);
                    }
                  }}
                  style={{
                    default: {
                      fill: isSelected ? "#1e40af" : hasDeals ? "#dbeafe" : "#e5e7eb",
                      stroke: "#9ca3af",
                      strokeWidth: 0.5,
                      outline: "none",
                    },
                    hover: {
                      fill: hasDeals ? "#93c5fd" : "#d1d5db",
                      stroke: "#6b7280",
                      strokeWidth: 0.5,
                      outline: "none",
                      cursor: hasDeals ? "pointer" : "default",
                    },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>

        {markers.map(({ prov, deals: provDeals, coords }) => {
          const isSelected = selectedProvincia === prov;
          const stageColor =
            provDeals.length === 1
              ? STAGE_COLORS[provDeals[0].stageLabel] ?? "#6366f1"
              : "#6366f1";

          return (
            <Marker
              key={prov}
              coordinates={coords!}
              onClick={() => onSelectProvincia(isSelected ? null : prov)}
            >
              <circle
                r={provDeals.length > 1 ? 10 : 7}
                fill={stageColor}
                stroke="#fff"
                strokeWidth={2}
                style={{ cursor: "pointer" }}
                opacity={isSelected ? 1 : 0.85}
              />
              <text
                textAnchor="middle"
                y={4}
                style={{
                  fontSize: "9px",
                  fontWeight: "bold",
                  fill: "#fff",
                  pointerEvents: "none",
                }}
              >
                {provDeals.length}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>
    </div>
  );
}
