import React, { useMemo } from "react";
import { FileText, Clock, AlertOctagon, Activity, ShieldAlert, MailQuestion } from "lucide-react";
import { TicketRecord } from "../types";
import { Selection } from "../utils/selection";
import { hasResponse, hasSlaBreach, isClosed, isCriticalOrHigh, isUnanswered } from "../utils/ticketHelpers";

interface KPICardsProps {
  filteredTickets: TicketRecord[];
  onSelect?: (s: Selection) => void;
}

const formatTime = (minutes: number) => {
  if (!minutes) return "N/D";
  if (minutes < 60) return `${minutes} min`;
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d) return h ? `${d}d ${h}h` : `${d}d`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export function KPICards({ filteredTickets, onSelect }: KPICardsProps) {
  const stats = useMemo(() => {
    const total = filteredTickets.length;
    const open = filteredTickets.filter(t => !isClosed(t));
    const unanswered = open.filter(isUnanswered);
    const criticalUnanswered = unanswered.filter(isCriticalOrHigh);
    const slaBreaches = filteredTickets.filter(hasSlaBreach).length;

    // Promedio de primera respuesta en horario laboral (solo casos que ya tienen respuesta)
    const times = filteredTickets
      .filter(hasResponse)
      .map(t => Number(t["Tiempo de primera respuesta en horario laboral"]))
      .filter(n => !isNaN(n) && n > 0);
    const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

    return {
      total,
      openCount: open.length,
      unanswered: unanswered.length,
      criticalUnanswered: criticalUnanswered.length,
      slaBreaches,
      slaPct: total ? Math.round((slaBreaches / total) * 100) : 0,
      avg,
      avgCount: times.length,
    };
  }, [filteredTickets]);

  const cards = [
    {
      title: "Total de Casos", value: stats.total, subtext: "Casos del informe (filtro aplicado)",
      icon: FileText, colorClass: "border-l-4 border-[#005bbf]", iconBg: "bg-blue-50 text-[#005bbf]", isCritical: false,
      sel: { title: "Todos los casos", criteria: [{ dimension: "all" as const }] },
    },
    {
      title: "Casos Abiertos", value: stats.openCount, subtext: `${stats.total - stats.openCount} cerrados`,
      icon: Activity, colorClass: "border-l-4 border-emerald-500", iconBg: "bg-emerald-50 text-emerald-600", isCritical: false,
      sel: { title: "Casos abiertos", criteria: [{ dimension: "open" as const }] },
    },
    {
      title: "Sin 1ª Respuesta", value: stats.unanswered, subtext: "Abiertos con 0 respuestas",
      icon: MailQuestion,
      colorClass: stats.unanswered > 0 ? "border-t-4 border-rose-400" : "border-l-4 border-gray-200",
      iconBg: stats.unanswered > 0 ? "bg-rose-50 text-rose-500" : "bg-gray-50 text-gray-400", isCritical: stats.unanswered > 0,
      sel: { title: "Casos abiertos sin primera respuesta", criteria: [{ dimension: "unanswered" as const }] },
    },
    {
      title: "Críticos/Altos Sin Respuesta", value: stats.criticalUnanswered, subtext: "Prioridad crítica o alta, 0 respuestas",
      icon: AlertOctagon,
      colorClass: stats.criticalUnanswered > 0 ? "border-t-4 border-rose-600" : "border-l-4 border-gray-200",
      iconBg: stats.criticalUnanswered > 0 ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-gray-50 text-gray-400",
      isCritical: stats.criticalUnanswered > 0,
      sel: { title: "Críticos/altos sin primera respuesta", criteria: [{ dimension: "criticalUnanswered" as const }] },
    },
    {
      title: "Vulneraciones de SLA", value: stats.slaBreaches, subtext: `${stats.slaPct}% de los casos`,
      icon: ShieldAlert,
      colorClass: stats.slaBreaches > 0 ? "border-t-4 border-[#f2994a]" : "border-l-4 border-gray-200",
      iconBg: stats.slaBreaches > 0 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400", isCritical: stats.slaBreaches > 0,
      sel: { title: "Casos con vulneración de SLA", criteria: [{ dimension: "slaBreach" as const }] },
    },
    {
      title: "Prom. 1ª Respuesta", value: formatTime(stats.avg), subtext: `Horario laboral · ${stats.avgCount} casos`,
      icon: Clock, colorClass: "border-l-4 border-violet-500", iconBg: "bg-violet-50 text-violet-600", isCritical: false,
      sel: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const clickable = !!(card.sel && onSelect);
        return (
          <div
            key={idx}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={() => clickable && onSelect!(card.sel as Selection)}
            onKeyDown={e => clickable && e.key === "Enter" && onSelect!(card.sel as Selection)}
            className={`bg-white rounded-xl shadow-xs p-5 border border-gray-200 transition-all duration-300 hover:shadow-md ${clickable ? "cursor-pointer hover:scale-[1.01]" : ""} ${card.colorClass}`}
            title={clickable ? "Clic para ver el detalle" : undefined}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.title}</p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-2 tracking-tight">{card.value}</h3>
              </div>
              <div className={`p-2.5 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-1">
              <span className="text-xs text-gray-400 font-medium">{card.subtext}</span>
              {card.isCritical && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                  Atención
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
