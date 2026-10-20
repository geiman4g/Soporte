import React, { useEffect, useMemo, useState } from "react";
import { X, Search, FileSpreadsheet, ArrowUpDown, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import { TicketRecord } from "../types";
import { Selection, applySelection } from "../utils/selection";
import {
  ageDays, formatMinutes, hasSlaBreach, isClosed, isUnanswered, statusColor,
} from "../utils/ticketHelpers";
import { TicketLink } from "./TicketLink";
import { zohoTicketUrl } from "../utils/zoho";

interface Props {
  selection: Selection | null;
  filteredTickets: TicketRecord[];
  selectedOwnersCount: number;
  totalOwnersCount: number;
  onClose: () => void;
}

type SortKey = "age" | "id" | "account" | "status" | "priority" | "owner" | "firstResp";

const priorityWeight = (p: string) => {
  const l = (p || "").toLowerCase();
  if (l.startsWith("crít") || l.startsWith("crit")) return 4;
  if (l === "alta") return 3;
  if (l === "media") return 2;
  if (l === "baja") return 1;
  return 0;
};

export function TicketDetailDrawer({ selection, filteredTickets, selectedOwnersCount, totalOwnersCount, onClose }: Props) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("age");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setQ("");
  }, [selection]);

  useEffect(() => {
    if (!selection) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, onClose]);

  // Siempre se recalcula sobre los tickets ya filtrados por propietario
  const tickets = useMemo(() => applySelection(filteredTickets, selection), [filteredTickets, selection]);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = tickets
      .filter(t => !ql || [t["ID de Ticket"], t["Nombre de Cuenta"], t["Asunto"], t["Propietario de Ticket"],
        t["Ingeniero de soporte asignado"], t["Estado (Ticket)"]].some(v => String(v || "").toLowerCase().includes(ql)))
      .map(t => ({ t, age: ageDays(t) ?? 0, first: Number(t["Tiempo de primera respuesta en horario laboral"]) || 0 }));
    const val = (r: typeof list[number]): any => {
      switch (sortKey) {
        case "age": return r.age;
        case "id": return Number(r.t["ID de Ticket"]) || r.t["ID de Ticket"];
        case "account": return (r.t["Nombre de Cuenta"] || "").toLowerCase();
        case "status": return (r.t["Estado (Ticket)"] || "").toLowerCase();
        case "priority": return priorityWeight(r.t["Prioridad (Ticket)"]);
        case "owner": return (r.t["Propietario de Ticket"] || "").toLowerCase();
        case "firstResp": return r.first;
      }
    };
    return list.sort((a, b) => {
      const A = val(a), B = val(b);
      return (A < B ? -1 : A > B ? 1 : 0) * (dir === "asc" ? 1 : -1);
    });
  }, [tickets, q, sortKey, dir]);

  const stats = useMemo(() => {
    const open = tickets.filter(t => !isClosed(t));
    const ages = open.map(t => ageDays(t) ?? 0);
    return {
      total: tickets.length,
      unanswered: open.filter(isUnanswered).length,
      sla: tickets.filter(hasSlaBreach).length,
      avgAge: ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0,
    };
  }, [tickets]);

  if (!selection) return null;

  const sortBy = (k: SortKey) => {
    if (k === sortKey) setDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setDir("desc"); }
  };

  const exportExcel = () => {
    const data = rows.map(({ t, age }) => ({
      "ID de Ticket": t["ID de Ticket"],
      "Enlace Zoho": zohoTicketUrl(t),
      "Nombre de Cuenta": t["Nombre de Cuenta"],
      "Asunto": t["Asunto"],
      "Estado": t["Estado (Ticket)"],
      "Prioridad": t["Prioridad (Ticket)"],
      "Propietario": t["Propietario de Ticket"],
      "Ingeniero Asignado": t["Ingeniero de soporte asignado"],
      "Clasificación": t["Clasificaciones"],
      "Creado": t["Hora de creación (Ticket)"],
      "Antigüedad (días)": Math.round(age),
      "1ª Respuesta laboral (min)": Number(t["Tiempo de primera respuesta en horario laboral"]) || "",
      "Número de respuestas": t["Número de respuestas"],
      "SLA": t["Tipo de vulneración del SLA"],
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detalle");
    const safe = selection.title.replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 40);
    XLSX.writeFile(wb, `Detalle_${safe}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const Th = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th onClick={() => sortBy(k)} className={`px-3 py-2 font-semibold cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap ${className}`}>
      <span className="inline-flex items-center gap-1">{children}<ArrowUpDown className={`w-3 h-3 ${sortKey === k ? "text-[#005bbf]" : "text-gray-300"}`} /></span>
    </th>
  );

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label={selection.title}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-5xl bg-white shadow-2xl flex flex-col animate-fade-in">
        {/* Encabezado */}
        <div className="p-5 border-b border-gray-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Detalle de casos</div>
            <h3 className="text-base font-extrabold text-gray-900 truncate">{selection.title}</h3>
            {selection.subtitle && <p className="text-xs text-gray-500 mt-0.5">{selection.subtitle}</p>}
            <p className="text-[11px] text-gray-400 mt-1 inline-flex items-center gap-1">
              <Filter className="w-3 h-3" />
              {selectedOwnersCount === totalOwnersCount
                ? "Todos los propietarios"
                : `Filtrado por ${selectedOwnersCount} de ${totalOwnersCount} propietarios`}
              {" · "}Clic en el número del ticket para abrirlo en Zoho Desk
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer" title="Cerrar (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 pt-4">
          {[
            { l: "Casos", v: stats.total, c: "text-[#005bbf]" },
            { l: "Sin 1ª respuesta", v: stats.unanswered, c: stats.unanswered ? "text-rose-600" : "text-gray-900" },
            { l: "Con SLA vencido", v: stats.sla, c: stats.sla ? "text-amber-600" : "text-gray-900" },
            { l: "Antigüedad prom. (abiertos)", v: `${stats.avgAge} d`, c: "text-gray-900" },
          ].map(s => (
            <div key={s.l} className="rounded-lg border border-gray-200 p-3">
              <div className="text-[10px] font-bold uppercase text-gray-400">{s.l}</div>
              <div className={`text-xl font-black font-mono ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Controles */}
        <div className="px-5 py-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar ticket, cliente, asunto..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-[#005bbf] focus:border-[#005bbf]"
            />
          </div>
          <button
            onClick={exportExcel}
            disabled={!rows.length}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto px-5 pb-5">
          {rows.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-400">
              No hay casos para esta selección con el filtro de propietario actual.
            </div>
          ) : (
            <table className="min-w-full text-xs text-left border border-gray-200 rounded-lg">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-600 sticky top-0">
                <tr>
                  <Th k="id">Ticket</Th>
                  <Th k="account">Cliente</Th>
                  <th className="px-3 py-2 font-semibold">Asunto</th>
                  <Th k="status">Estado</Th>
                  <Th k="priority">Prioridad</Th>
                  <Th k="owner">Propietario</Th>
                  <Th k="age" className="text-right">Antigüedad</Th>
                  <Th k="firstResp" className="text-right">1ª Rpta (lab.)</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(({ t, age, first }, i) => {
                  const unanswered = !isClosed(t) && isUnanswered(t);
                  return (
                    <tr key={`${t["ID de Ticket"]}-${i}`} className="hover:bg-slate-50">
                      <td className="px-3 py-2 whitespace-nowrap"><TicketLink ticket={t} className="text-[#005bbf] text-xs" /></td>
                      <td className="px-3 py-2 font-semibold text-gray-900 max-w-[140px] truncate" title={t["Nombre de Cuenta"]}>{t["Nombre de Cuenta"]}</td>
                      <td className="px-3 py-2 min-w-[240px] max-w-[380px]">
                        <a href={zohoTicketUrl(t)} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-[#005bbf] hover:underline line-clamp-2" title={t["Asunto"]}>
                          {t["Asunto"]}
                        </a>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {t["Ingeniero de soporte asignado"]} · Creado {t["Hora de creación (Ticket)"] || "N/D"}
                          {hasSlaBreach(t) && <span className="ml-1 text-amber-600 font-semibold">· SLA: {t["Tipo de vulneración del SLA"]}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-700">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(t["Estado (Ticket)"] || "") }} />
                          {t["Estado (Ticket)"]}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700">{t["Prioridad (Ticket)"]}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">{t["Propietario de Ticket"]}</td>
                      <td className={`px-3 py-2 text-right font-mono whitespace-nowrap ${age > 30 ? "text-rose-700 font-bold" : age > 7 ? "text-amber-700 font-semibold" : "text-gray-700"}`}>
                        {Math.floor(age)} d
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {unanswered ? (
                          <span className="text-rose-600 font-bold">Sin respuesta</span>
                        ) : (
                          <span className="font-mono text-gray-700">{formatMinutes(first)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
