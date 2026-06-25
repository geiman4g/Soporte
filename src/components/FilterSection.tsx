import React, { useMemo, useState } from "react";
import { Users, Check, Square, CheckSquare, SlidersHorizontal, Info } from "lucide-react";
import { TicketRecord } from "../types";

interface FilterSectionProps {
  tickets: TicketRecord[];
  selectedOwners: string[];
  onChangeSelectedOwners: (owners: string[]) => void;
}

export function FilterSection({ tickets, selectedOwners, onChangeSelectedOwners }: FilterSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Extract unique owners and count their occurrences in the full dataset
  const ownersWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach(t => {
      const owner = t["Propietario de Ticket"] || "Sin Propietario";
      counts[owner] = (counts[owner] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [tickets]);

  // Filter owners shown based on search query
  const filteredOwners = useMemo(() => {
    if (!searchQuery.trim()) return ownersWithCounts;
    return ownersWithCounts.filter(o =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ownersWithCounts, searchQuery]);

  const handleToggleOwner = (ownerName: string) => {
    if (selectedOwners.includes(ownerName)) {
      // Don't let them unselect everything easily without warning, but permit it.
      onChangeSelectedOwners(selectedOwners.filter(o => o !== ownerName));
    } else {
      onChangeSelectedOwners([...selectedOwners, ownerName]);
    }
  };

  const handleSelectAll = () => {
    onChangeSelectedOwners(ownersWithCounts.map(o => o.name));
  };

  const handleDeselectAll = () => {
    onChangeSelectedOwners([]);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-[#005bbf] rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              Filtro de Propietario de Ticket
              <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                Global Obligatorio
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              Selecciona uno o varios grupos de soporte para filtrar todo el panel.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="text-xs font-semibold text-[#005bbf] hover:underline"
          >
            Seleccionar Todos
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleDeselectAll}
            className="text-xs font-semibold text-rose-600 hover:underline"
          >
            Deseleccionar Todos
          </button>
        </div>
      </div>

      {/* Dynamic Search & Fast Toggle List */}
      <div className="space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder="Buscar propietario o nivel de soporte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-[#005bbf] focus:border-[#005bbf]"
          />
        </div>

        {ownersWithCounts.length === 0 ? (
          <div className="text-center py-4 text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <Info className="w-4 h-4" />
            No hay propietarios de ticket disponibles en el conjunto de datos cargado.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 bg-gray-50 rounded-lg border border-gray-100">
            {filteredOwners.map((owner) => {
              const isSelected = selectedOwners.includes(owner.name);
              return (
                <button
                  key={owner.name}
                  onClick={() => handleToggleOwner(owner.name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-[#005bbf] text-white border border-[#005bbf] shadow-sm"
                      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-gray-400" />
                  )}
                  <span>{owner.name}</span>
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {owner.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {selectedOwners.length === 0 && (
          <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
            <Info className="w-4 h-4 shrink-0" />
            <span>Al desmarcar todos los propietarios, no se visualizarán datos. Selecciona al menos uno para activar el dashboard.</span>
          </div>
        )}
      </div>
    </div>
  );
}
