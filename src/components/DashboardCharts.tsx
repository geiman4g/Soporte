import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { TicketRecord } from "../types";
import { 
  ShieldAlert, 
  BarChart3, 
  PieChartIcon, 
  Hourglass, 
  ListCollapse, 
  CheckCircle,
  X,
  Building2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface DashboardChartsProps {
  filteredTickets: TicketRecord[];
}

export function DashboardCharts({ filteredTickets }: DashboardChartsProps) {
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"unanswered" | "all">("unanswered");

  // Helper function to calculate exact calendar delay
  const calculateCalendarDelay = (createdStr: string, respondedStr: string) => {
    if (!createdStr) return { text: "N/D", minutes: 0 };
    const createdDate = new Date(createdStr.replace(/-/g, "/"));
    if (isNaN(createdDate.getTime())) return { text: "Inválido", minutes: 0 };

    let endDate = new Date();
    let isAnswered = false;
    if (respondedStr && respondedStr.trim() !== "") {
      const respDate = new Date(respondedStr.replace(/-/g, "/"));
      if (!isNaN(respDate.getTime())) {
        endDate = respDate;
        isAnswered = true;
      }
    }

    const diffMs = endDate.getTime() - createdDate.getTime();
    const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

    if (diffMinutes === 0) return { text: isAnswered ? "Al instante" : "Creado ahora", minutes: 0 };

    const days = Math.floor(diffMinutes / 1440);
    const hours = Math.floor((diffMinutes % 1440) / 60);
    const mins = diffMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);

    return {
      text: isAnswered ? `Atendido en ${parts.join(" ")}` : `Espera: ${parts.join(" ")}`,
      minutes: diffMinutes,
      isAnswered
    };
  };

  // 1. Volume by Account ("Volumen por Cliente")
  const volumeByAccountData = useMemo(() => {
    const counts: Record<string, { total: number; open: number }> = {};
    
    filteredTickets.forEach(t => {
      const account = t["Nombre de Cuenta"] || "Sin Cuenta";
      const status = (t["Estado (Ticket)"] || "").toLowerCase();
      const isOpen = status !== "cerrado";

      if (!counts[account]) {
        counts[account] = { total: 0, open: 0 };
      }
      counts[account].total += 1;
      if (isOpen) {
        counts[account].open += 1;
      }
    });

    return Object.entries(counts)
      .map(([name, stats]) => ({
        name,
        "Casos Totales": stats.total,
        "Casos Abiertos": stats.open
      }))
      .sort((a, b) => b["Casos Totales"] - a["Casos Totales"])
      .slice(0, 8); // Top 8 accounts
  }, [filteredTickets]);

  // 2. Critical/High Priority Unanswered by Account ("Criticidad por Cliente")
  // High/Critical priority cases that are unanswered (no responses, no response date, no agent time) and status !== Closed/Solved
  const criticalUnansweredByAccount = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredTickets.forEach(t => {
      const priority = (t["Prioridad (Ticket)"] || "").toLowerCase().trim();
      const status = (t["Estado (Ticket)"] || "").toLowerCase().trim();
      
      const isCriticalOrHigh = 
        priority.includes("crít") || 
        priority.includes("crit") || 
        priority.includes("alt") || 
        priority.includes("urg") || 
        priority.includes("high") || 
        priority.includes("emerg") || 
        priority.includes("1") ||
        priority.includes("p1") ||
        priority.includes("p2");

      const isClosed = 
        status.includes("cerr") || 
        status.includes("clos") || 
        status.includes("solv") || 
        status.includes("termin") || 
        status.includes("resuel") ||
        status.includes("done") ||
        status.includes("final");
      const isNotClosed = !isClosed;

      const repliesStr = String(t["Número de respuestas"] || "").trim();
      const hasRepliesVal = repliesStr !== "" && repliesStr !== "0" && repliesStr !== "N/D" && !isNaN(Number(repliesStr)) && Number(repliesStr) > 0;
      const hasResponseDate = (t["Hora de responder"] || "").trim() !== "" && (t["Hora de responder"] || "").trim() !== "N/D";
      const agentTimeStr = String(t["Tiempo de respuesta del agente"] ?? "").trim();
      const hasAgentTime = agentTimeStr !== "" && agentTimeStr !== "N/D";
      
      const isUnanswered = !hasRepliesVal && !hasResponseDate && !hasAgentTime;

      if (isCriticalOrHigh && isNotClosed && isUnanswered) {
        const account = t["Nombre de Cuenta"] || "Sin Cuenta";
        counts[account] = (counts[account] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        "Casos Críticos Sin Respuesta": count
      }))
      .sort((a, b) => b["Casos Críticos Sin Respuesta"] - a["Casos Críticos Sin Respuesta"])
      .slice(0, 8);
  }, [filteredTickets]);

  // 3. Distribution of Categories ("Distribución por Categorías")
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTickets.forEach(t => {
      const cat = t["Categoria (Ticket)"] || "Sin Categoría";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const colors = [
      "#005bbf", // primary blue
      "#f2994a", // orange accent
      "#3b82f6", // light blue
      "#10b981", // emerald green
      "#8b5cf6", // violet
      "#f59e0b", // amber
      "#ec4899", // pink
      "#6b7280"  // gray
    ];

    return Object.entries(counts)
      .map(([name, count], index) => ({
        name,
        value: count,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredTickets]);

  // 4. Overdue aging historical alert list ("Casos sin Atender Históricos")
  // Tickets that have "Número de respuestas" = 0, status is NOT Cerrado, sorted descending by creation time / or first response minutes.
  const topAgingTickets = useMemo(() => {
    return filteredTickets
      .filter(t => {
        const replies = Number(t["Número de respuestas"]) || 0;
        const status = (t["Estado (Ticket)"] || "").toLowerCase();
        return replies === 0 && status !== "cerrado";
      })
      .map(t => {
        const firstRespTime = Number(t["Tiempo de primera respuesta en horario laboral"]) || 0;
        return {
          id: t["ID de Ticket"],
          account: t["Nombre de Cuenta"],
          subject: t["Asunto"],
          priority: t["Prioridad (Ticket)"],
          created: t["Hora de creación (Ticket)"],
          delay: firstRespTime
        };
      })
      .sort((a, b) => b.delay - a.delay) // Worst delay first
      .slice(0, 5); // top 5 worst
  }, [filteredTickets]);

  // Filter all tickets for selected account
  const accountAllTickets = useMemo(() => {
    if (!selectedAccount) return [];
    return filteredTickets.filter(t => (t["Nombre de Cuenta"] || "Sin Cuenta") === selectedAccount);
  }, [filteredTickets, selectedAccount]);

  // Filter critical/high priority unanswered for selected account
  const accountCriticalUnansweredTickets = useMemo(() => {
    if (!selectedAccount) return [];
    return accountAllTickets.filter(t => {
      const priority = (t["Prioridad (Ticket)"] || "").toLowerCase().trim();
      const status = (t["Estado (Ticket)"] || "").toLowerCase().trim();
      
      const isCriticalOrHigh = 
        priority.includes("crít") || 
        priority.includes("crit") || 
        priority.includes("alt") || 
        priority.includes("urg") || 
        priority.includes("high") || 
        priority.includes("emerg") || 
        priority.includes("1") ||
        priority.includes("p1") ||
        priority.includes("p2");

      const isClosed = 
        status.includes("cerr") || 
        status.includes("clos") || 
        status.includes("solv") || 
        status.includes("termin") || 
        status.includes("resuel") ||
        status.includes("done") ||
        status.includes("final");
      const isNotClosed = !isClosed;

      const repliesStr = String(t["Número de respuestas"] || "").trim();
      const hasRepliesVal = repliesStr !== "" && repliesStr !== "0" && repliesStr !== "N/D" && !isNaN(Number(repliesStr)) && Number(repliesStr) > 0;
      const hasResponseDate = (t["Hora de responder"] || "").trim() !== "" && (t["Hora de responder"] || "").trim() !== "N/D";
      const agentTimeStr = String(t["Tiempo de respuesta del agente"] ?? "").trim();
      const hasAgentTime = agentTimeStr !== "" && agentTimeStr !== "N/D";
      
      const isUnanswered = !hasRepliesVal && !hasResponseDate && !hasAgentTime;

      return isCriticalOrHigh && isNotClosed && isUnanswered;
    });
  }, [accountAllTickets, selectedAccount]);

  if (filteredTickets.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 shadow-xs">
        <div className="flex flex-col items-center justify-center space-y-2">
          <BarChart3 className="w-12 h-12 text-gray-300 animate-pulse" />
          <p className="text-sm font-semibold text-gray-700">Sin datos de gráficos para mostrar</p>
          <p className="text-xs text-gray-400">Selecciona propietarios de ticket o carga un archivo nuevo para visualizar los gráficos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A.1: Volumen de Casos por Cliente */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs relative">
          <div className="flex items-start justify-between mb-4 pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-[#005bbf] rounded">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Volumen de Casos por Cliente (Top 8)
                </h3>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Total de casos vs Casos aún abiertos</p>
            </div>
            <div className="text-right">
              <span className="inline-flex px-1.5 py-0.5 text-[9px] font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-100 animate-pulse">
                🖱️ Clic para filtrar
              </span>
            </div>
          </div>
          
          <div className="h-72 w-full">
            {volumeByAccountData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={volumeByAccountData} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  onClick={(state: any) => {
                    if (state && state.activeLabel) {
                      setSelectedAccount(state.activeLabel);
                      setDetailTab("all");
                    } else if (state && state.activePayload && state.activePayload[0]) {
                      setSelectedAccount(state.activePayload[0].payload.name);
                      setDetailTab("all");
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#888888" tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} stroke="#888888" tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: "8px", fontSize: "11px" }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey="Casos Totales" fill="#005bbf" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="Casos Abiertos" fill="#f2994a" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart A.2: Criticidad por Cliente (Casos Críticos Sin Respuesta) */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs relative">
          <div className="flex items-start justify-between mb-4 pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Criticidad por Cliente (Casos Críticos/Altos Sin Responder)
                </h3>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Casos críticos o de alta prioridad sin ninguna respuesta inicial</p>
            </div>
            <div className="text-right">
              <span className="inline-flex px-1.5 py-0.5 text-[9px] font-semibold bg-rose-50 text-rose-700 rounded-md border border-rose-100 animate-pulse">
                🚨 Clic para auditar
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            {criticalUnansweredByAccount.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 p-4 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mb-1" />
                <span className="font-semibold text-gray-700">¡Excelente!</span>
                <span>No hay casos críticos sin respuesta inicial en este grupo.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={criticalUnansweredByAccount} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  onClick={(state: any) => {
                    if (state && state.activeLabel) {
                      setSelectedAccount(state.activeLabel);
                      setDetailTab("unanswered");
                    } else if (state && state.activePayload && state.activePayload[0]) {
                      setSelectedAccount(state.activePayload[0].payload.name);
                      setDetailTab("unanswered");
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f5" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#888888" tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} stroke="#888888" tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: "8px", fontSize: "11px" }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="Casos Críticos Sin Respuesta" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Detail Inspector Drawer */}
      {selectedAccount && (
        <div className="bg-slate-900 text-white rounded-xl border border-slate-800 shadow-lg p-5 sm:p-6 space-y-4 animate-fade-in" id="chart-drilldown-panel">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-800 text-amber-400 rounded-lg">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Inspección de Cliente Seleccionado</span>
                <h4 className="text-base font-black tracking-tight text-white">{selectedAccount}</h4>
              </div>
            </div>
            <button 
              onClick={() => setSelectedAccount(null)}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Cerrar detalle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Casos Totales</div>
              <div className="text-xl font-mono font-black text-blue-400 mt-1">{accountAllTickets.length}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 border-l-4 border-l-rose-500">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Críticos / Altos sin Responder</div>
              <div className="text-xl font-mono font-black text-rose-400 mt-1">{accountCriticalUnansweredTickets.length}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Porcentaje de Atención</div>
              <div className="text-xl font-mono font-black text-emerald-400 mt-1">
                {accountAllTickets.length > 0 
                  ? Math.round(((accountAllTickets.length - accountCriticalUnansweredTickets.length) / accountAllTickets.length) * 100) 
                  : 100}%
              </div>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setDetailTab("unanswered")}
              className={`px-4 py-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                detailTab === "unanswered" 
                  ? "border-rose-500 text-rose-400 bg-rose-500/5" 
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Críticos Sin Responder ({accountCriticalUnansweredTickets.length})
            </button>
            <button
              onClick={() => setDetailTab("all")}
              className={`px-4 py-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                detailTab === "all" 
                  ? "border-blue-500 text-blue-400 bg-blue-500/5" 
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <ListCollapse className="w-3.5 h-3.5" />
              Todos los Casos de este Cliente ({accountAllTickets.length})
            </button>
          </div>

          {/* List of Tickets */}
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            {detailTab === "unanswered" && accountCriticalUnansweredTickets.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mb-1.5" />
                <span className="font-bold text-white">¡No hay casos críticos sin respuesta!</span>
                <span>Todos los incidentes críticos de este cliente tienen una interacción registrada.</span>
              </div>
            ) : detailTab === "all" && accountAllTickets.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No hay tickets registrados para este cliente.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <th className="p-3 font-semibold">ID</th>
                    <th className="p-3 font-semibold w-2/5">Asunto</th>
                    <th className="p-3 font-semibold">Prioridad</th>
                    <th className="p-3 font-semibold">Estado</th>
                    <th className="p-3 font-semibold">Asignado</th>
                    <th className="p-3 font-semibold text-right">Demora de Primera Respuesta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {(detailTab === "unanswered" ? accountCriticalUnansweredTickets : accountAllTickets).map((t, idx) => {
                    const priorityLower = (t["Prioridad (Ticket)"] || "").toLowerCase();
                    const statusLower = (t["Estado (Ticket)"] || "").toLowerCase();
                    const isCritical = priorityLower.includes("crít") || priorityLower.includes("crit");
                    
                    let prioBadge = "bg-slate-800 text-slate-300";
                    if (isCritical) {
                      prioBadge = "bg-rose-950/80 text-rose-400 font-extrabold border border-rose-900";
                    } else if (priorityLower.includes("alt")) {
                      prioBadge = "bg-amber-950/80 text-amber-400 font-bold border border-amber-900";
                    }

                    let statBadge = "bg-slate-850 text-slate-400";
                    if (statusLower === "abierto") {
                      statBadge = "bg-rose-950/30 text-rose-400 border border-rose-900/40 animate-pulse";
                    } else if (statusLower === "en progreso") {
                      statBadge = "bg-amber-950/30 text-amber-400 border border-amber-900/40";
                    } else if (statusLower === "cerrado") {
                      statBadge = "bg-emerald-950/30 text-emerald-400 border border-emerald-900/40";
                    }

                    // Calculate unanswered status and delay times
                    const repliesStr = String(t["Número de respuestas"] || "").trim();
                    const hasRepliesVal = repliesStr !== "" && repliesStr !== "0" && repliesStr !== "N/D" && !isNaN(Number(repliesStr)) && Number(repliesStr) > 0;
                    const hasResponseDate = (t["Hora de responder"] || "").trim() !== "" && (t["Hora de responder"] || "").trim() !== "N/D";
                    const agentTimeStr = String(t["Tiempo de respuesta del agente"] ?? "").trim();
                    const hasAgentTime = agentTimeStr !== "" && agentTimeStr !== "N/D";
                    const isUnanswered = !hasRepliesVal && !hasResponseDate && !hasAgentTime;

                    const minutesVal = Number(t["Tiempo de primera respuesta en horario laboral"]) || 0;
                    const calDelay = calculateCalendarDelay(t["Hora de creación (Ticket)"] || "", t["Hora de responder"] || "");

                    return (
                      <tr key={idx} className="hover:bg-slate-850/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-blue-400 whitespace-nowrap">{t["ID de Ticket"]}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-100">{t["Asunto"]}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                            <span>Creado: {t["Hora de creación (Ticket)"] || "N/D"}</span>
                            {hasResponseDate && <span>Respondido: {t["Hora de responder"]}</span>}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${prioBadge}`}>
                            {t["Prioridad (Ticket)"]}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${statBadge}`}>
                            {t["Estado (Ticket)"]}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300 font-medium">{t["Ingeniero de soporte asignado"] || "Sin Asignar"}</td>
                        <td className="p-3 text-right">
                          {isUnanswered ? (
                            <div className="font-extrabold text-rose-500 animate-pulse">🚨 Sin 1ª Respuesta</div>
                          ) : (
                            <div className="font-bold text-emerald-400">
                              {minutesVal > 0 ? `${minutesVal} min (Lab)` : "Atendido"}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-0.5">{calDelay.text}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Second row: Categories distribution and Historical Aging alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart A.3: Categorías de Tickets */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs lg:col-span-1">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <div className="p-1.5 bg-violet-50 text-violet-600 rounded">
              <PieChartIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Distribución por Categorías
              </h3>
              <p className="text-[10px] text-gray-400">Principales áreas de soporte técnico</p>
            </div>
          </div>

          <div className="h-56 w-full flex items-center justify-center relative">
            {categoryData.length === 0 ? (
              <div className="text-xs text-gray-400">Sin datos</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e293b", color: "#fff", borderRadius: "8px", fontSize: "11px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend to the side/below */}
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {categoryData.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5 text-[10px] text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="truncate" title={item.name}>{item.name}</span>
                <span className="font-bold ml-auto bg-gray-100 px-1 py-0.2 rounded">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart A.4 / Section: Casos sin Atender Históricos (Alert panel of longest un-replied cases) */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded">
                <Hourglass className="w-4 h-4 animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Alerta: Casos Históricos Sin Atender
                </h3>
                <p className="text-[10px] text-gray-400">Casos activos sin ninguna respuesta, priorizados por demora de primera respuesta en horario laboral</p>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              Urgente
            </span>
          </div>

          <div className="space-y-3">
            {topAgingTickets.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mb-1" />
                <span className="font-semibold text-gray-700">¡Impecable!</span>
                <span>No hay tickets históricos sin una primera interacción asignados a este propietario.</span>
              </div>
            ) : (
              topAgingTickets.map((ticket, index) => {
                // Color badges for priority
                const priorityLower = (ticket.priority || "").toLowerCase();
                let priorityColor = "bg-gray-100 text-gray-800";
                if (priorityLower === "crítica" || priorityLower === "critica") {
                  priorityColor = "bg-rose-100 text-rose-800 font-extrabold";
                } else if (priorityLower === "alta") {
                  priorityColor = "bg-amber-100 text-amber-800 font-bold";
                }

                return (
                  <div 
                    key={ticket.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border border-l-4 border-l-rose-500 border-gray-150 bg-rose-50/20 hover:bg-rose-50/40 transition-colors"
                  >
                    <div className="space-y-1 max-w-lg">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#005bbf] bg-blue-50 px-2 py-0.5 rounded">
                          {ticket.id}
                        </span>
                        <span className="text-xs font-extrabold text-gray-900">
                          {ticket.account}
                        </span>
                        <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded-full ${priorityColor}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-700 line-clamp-1">
                        {ticket.subject}
                      </p>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                        <span>Creado: {ticket.created}</span>
                      </div>
                    </div>

                    <div className="mt-2 sm:mt-0 text-right">
                      <div className="text-xs font-extrabold text-rose-700 font-mono">
                        {ticket.delay ? `${ticket.delay} min` : "Sin tiempo de respuesta registrado"}
                      </div>
                      <div className="text-[10px] text-gray-400 font-semibold uppercase">
                        Retraso de Respuesta
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
