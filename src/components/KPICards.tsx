import React, { useMemo } from "react";
import { 
  FileText, 
  Clock, 
  AlertOctagon, 
  CheckCircle2, 
  Activity, 
  ShieldAlert
} from "lucide-react";
import { TicketRecord } from "../types";

interface KPICardsProps {
  filteredTickets: TicketRecord[];
}

export function KPICards({ filteredTickets }: KPICardsProps) {
  const stats = useMemo(() => {
    const total = filteredTickets.length;
    
    let openCount = 0;
    let criticalCount = 0;
    let slaBreaches = 0;
    let criticalUnanswered = 0;
    
    let responseTimesSum = 0;
    let responseTimesCount = 0;

    filteredTickets.forEach(t => {
      // Open cases (not "Cerrado")
      const status = (t["Estado (Ticket)"] || "").toLowerCase();
      if (status !== "cerrado") {
        openCount++;
      }

      // Critical or High priority
      const priority = (t["Prioridad (Ticket)"] || "").toLowerCase().trim();
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

      if (isCriticalOrHigh) {
        criticalCount++;
        // Unanswered critical/high cases: open and unanswered
        if (isNotClosed && isUnanswered) {
          criticalUnanswered++;
        }
      }

      // SLA Breaches
      const slaVulnerability = (t["Tipo de vulneración del SLA"] || "").trim().toLowerCase();
      if (slaVulnerability !== "ninguna" && slaVulnerability !== "" && slaVulnerability !== "none") {
        slaBreaches++;
      }

      // Response times
      const rawRespTime = t["Tiempo de primera respuesta en horario laboral"];
      const replies = Number(t["Número de respuestas"]) || 0;
      const hasResponse = (t["Hora de responder"] || "").trim() !== "";

      if (rawRespTime !== undefined && rawRespTime !== null) {
        const strVal = String(rawRespTime).trim();
        // Extract digits or parse float
        const match = strVal.match(/[\d.]+/);
        const respTime = match ? parseFloat(match[0]) : NaN;

        if (!isNaN(respTime) && respTime >= 0) {
          // A ticket is counted in First Response average if it actually has responses
          if (replies > 0 || hasResponse) {
            responseTimesSum += respTime;
            responseTimesCount++;
          }
        }
      }
    });

    // Fallback: if no tickets have responses yet, calculate based on all tickets with positive response/elapsed times
    if (responseTimesCount === 0) {
      filteredTickets.forEach(t => {
        const rawRespTime = t["Tiempo de primera respuesta en horario laboral"];
        if (rawRespTime !== undefined && rawRespTime !== null) {
          const strVal = String(rawRespTime).trim();
          const match = strVal.match(/[\d.]+/);
          const respTime = match ? parseFloat(match[0]) : NaN;
          if (!isNaN(respTime) && respTime > 0) {
            responseTimesSum += respTime;
            responseTimesCount++;
          }
        }
      });
    }

    const avgResponseTime = responseTimesCount > 0 
      ? Math.round(responseTimesSum / responseTimesCount) 
      : 0;

    return {
      total,
      openCount,
      criticalCount,
      criticalUnanswered,
      slaBreaches,
      avgResponseTime,
      responseTimesCount
    };
  }, [filteredTickets]);

  // Format response time nicely (e.g. "X min" or "Y h Z min")
  const formatTime = (minutes: number) => {
    if (minutes === 0) return "N/D";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const cardsData = [
    {
      title: "Total de Casos",
      value: stats.total,
      subtext: "Casos totales asignados",
      icon: FileText,
      colorClass: "border-l-4 border-[#005bbf]",
      iconBg: "bg-blue-50 text-[#005bbf]",
      isCritical: false
    },
    {
      title: "Casos Abiertos",
      value: stats.openCount,
      subtext: `${stats.total - stats.openCount} resueltos/cerrados`,
      icon: Activity,
      colorClass: "border-l-4 border-emerald-500",
      iconBg: "bg-emerald-50 text-emerald-600",
      isCritical: false
    },
    {
      title: "Casos Críticos Sin Respuesta",
      value: stats.criticalUnanswered,
      subtext: "Prioridad Crítica con 0 interacciones",
      icon: AlertOctagon,
      colorClass: stats.criticalUnanswered > 0 ? "border-t-4 border-rose-600" : "border-l-4 border-gray-200",
      iconBg: stats.criticalUnanswered > 0 ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-gray-50 text-gray-400",
      isCritical: stats.criticalUnanswered > 0
    },
    {
      title: "Vulneraciones de SLA",
      value: stats.slaBreaches,
      subtext: "Casos fuera de tiempos acordados",
      icon: ShieldAlert,
      colorClass: stats.slaBreaches > 0 ? "border-t-4 border-[#f2994a]" : "border-l-4 border-gray-200",
      iconBg: stats.slaBreaches > 0 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400",
      isCritical: stats.slaBreaches > 0
    },
    {
      title: "Tiempo Prom. 1ª Respuesta",
      value: formatTime(stats.avgResponseTime),
      subtext: `Calculado sobre ${stats.responseTimesCount} casos`,
      icon: Clock,
      colorClass: "border-l-4 border-violet-500",
      iconBg: "bg-violet-50 text-violet-600",
      isCritical: false
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cardsData.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div 
            key={idx} 
            className={`bg-white rounded-xl shadow-xs p-5 border border-gray-200 transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${card.colorClass}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {card.title}
                </p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-2 tracking-tight">
                  {card.value}
                </h3>
              </div>
              <div className={`p-2.5 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <IconComponent className="w-5 h-5" />
              </div>
            </div>
            
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">
                {card.subtext}
              </span>
              
              {card.isCritical && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 uppercase animate-pulse">
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
