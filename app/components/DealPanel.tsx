"use client";

import type { Deal } from "../lib/getDeals";

const STAGE_COLORS: Record<string, string> = {
  Señado: "bg-amber-100 text-amber-800",
  Pagado: "bg-emerald-100 text-emerald-800",
  Entregado: "bg-blue-100 text-blue-800",
};

interface Props {
  deals: Deal[];
  provincia: string;
  onClose: () => void;
}

export default function DealPanel({ deals, provincia, onClose }: Props) {
  return (
    <div className="absolute top-4 right-4 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden" style={{ zIndex: 1000 }}>
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">{provincia}</h2>
          <p className="text-xs text-gray-500">
            {deals.length} laboratorio{deals.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="overflow-y-auto max-h-[70vh] divide-y divide-gray-200">
        {deals.map((deal) => (
          <div key={deal.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-medium text-gray-800 text-sm leading-tight">
                {deal.name}
              </p>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                  STAGE_COLORS[deal.stageLabel] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {deal.stageLabel}
              </span>
            </div>

            {deal.contact ? (
              <div className="space-y-1 mt-2">
                <p className="text-xs text-gray-600 font-medium">
                  {deal.contact.name}
                </p>
                {deal.contact.email && (
                  <a
                    href={`mailto:${deal.contact.email}`}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                  >
                    <span>✉</span>
                    {deal.contact.email}
                  </a>
                )}
                {deal.contact.phone && (
                  <a
                    href={`tel:${deal.contact.phone}`}
                    className="flex items-center gap-1.5 text-xs text-green-600 hover:underline"
                  >
                    <span>📞</span>
                    {deal.contact.phone}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">Sin contacto asociado</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
