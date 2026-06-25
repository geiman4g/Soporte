import React, { useState, useMemo } from "react";
import { TicketRecord } from "../types";
import { 
  ArrowUpDown, 
  Download, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  FileSpreadsheet, 
  CheckCircle,
  HelpCircle
} from "lucide-react";
import * as XLSX from "xlsx";

interface CriticalTicketsTableProps {
  filteredTickets: TicketRecord[];
}

type SortField = 
  | "ID de Ticket" 
  | "Nombre de Cuenta" 
  | "Asunto" 
  | "Prioridad (Ticket)" 
  | "Estado (Ticket)" 
  | "Propietario de Ticket" 
  | "Tiempo de primera respuesta en horario laboral"
  | "Hora de creación (Ticket)"
  | "Demora Calendario (Real)";

export function CriticalTicketsTable({ filteredTickets }: CriticalTicketsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Sorting states. Default sorting: "Tiempo de primera respuesta en horario laboral" DESCENDING as requested!
  const [sortField, setSortField] = useState<SortField>("Tiempo de primera respuesta en horario laboral");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Handle priority ranking weight
  const getPriorityWeight = (priority: string) => {
    const p = (priority || "").toLowerCase();
    if (p === "crítica" || p === "critica") return 4;
    if (p === "alta") return 3;
    if (p === "media") return 2;
    if (p === "baja") return 1;
    return 0;
  };

  // Formatter for elapsed delay time in minutes, hours, and days
  const formatDetailedDelay = (minutes: number) => {
    if (!minutes || isNaN(minutes) || minutes <= 0) {
      return { raw: "0 min", human: "Atendido / Sin demora", isHigh: false };
    }

    const raw = `${minutes} min`;
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = Math.round(minutes % 60);

    const parts: string[] = [];
    if (days > 0) {
      parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);
    }
    if (hours > 0) {
      parts.push(`${hours} h`);
    }
    if (mins > 0 || parts.length === 0) {
      parts.push(`${mins} min`);
    }

    return {
      raw,
      human: parts.join(", "),
      isHigh: minutes >= 60,
      isCritical: minutes >= 180
    };
  };

  // Function to calculate and format exact calendar delay between creation and response (or now)
  const formatCalendarDelay = (createdStr: string, respondedStr: string) => {
    if (!createdStr) {
      return { text: "N/D", isCritical: false, isHigh: false, minutes: 0, isAnswered: false };
    }

    const cleanedCreated = createdStr.replace(/-/g, "/");
    const createdDate = new Date(cleanedCreated);
    if (isNaN(createdDate.getTime())) {
      return { text: "Formato inválido", isCritical: false, isHigh: false, minutes: 0, isAnswered: false };
    }

    let endDate: Date;
    let isAnswered = true;
    if (respondedStr && respondedStr.trim() !== "") {
      const cleanedResponded = respondedStr.replace(/-/g, "/");
      endDate = new Date(cleanedResponded);
      if (isNaN(endDate.getTime())) {
        endDate = new Date(); // fallback
        isAnswered = false;
      }
    } else {
      endDate = new Date(); // Current live time
      isAnswered = false;
    }

    const diffMs = endDate.getTime() - createdDate.getTime();
    const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

    if (diffMinutes === 0) {
      return { 
        text: isAnswered ? "Al instante (< 1m)" : "Creado ahora", 
        isCritical: false, 
        isHigh: false,
        minutes: 0,
        isAnswered 
      };
    }

    const days = Math.floor(diffMinutes / 1440);
    const hours = Math.floor((diffMinutes % 1440) / 60);
    const mins = diffMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);

    const delayText = parts.join(" ");

    return {
      text: isAnswered ? `Atendido en ${delayText}` : `Espera: ${delayText}`,
      isCritical: !isAnswered && diffMinutes >= 180, // unanswered for more than 3 hours
      isHigh: diffMinutes >= 60,
      minutes: diffMinutes,
      isAnswered
    };
  };

  // Filter and sort tickets
  const processedTickets = useMemo(() => {
    // 1. Text search filter
    let results = filteredTickets.filter(t => {
      const q = searchQuery.toLowerCase();
      return (
        (t["ID de Ticket"] || "").toLowerCase().includes(q) ||
        (t["Nombre de Cuenta"] || "").toLowerCase().includes(q) ||
        (t["Asunto"] || "").toLowerCase().includes(q) ||
        (t["Propietario de Ticket"] || "").toLowerCase().includes(q) ||
        (t["Prioridad (Ticket)"] || "").toLowerCase().includes(q) ||
        (t["Estado (Ticket)"] || "").toLowerCase().includes(q) ||
        (t["Ingeniero de soporte asignado"] || "").toLowerCase().includes(q)
      );
    });

    // 2. Sort results
    results.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === "Prioridad (Ticket)") {
        valA = getPriorityWeight(String(a["Prioridad (Ticket)"]));
        valB = getPriorityWeight(String(b["Prioridad (Ticket)"]));
      } 
      else if (sortField === "Tiempo de primera respuesta en horario laboral") {
        valA = Number(a["Tiempo de primera respuesta en horario laboral"]) || 0;
        valB = Number(b["Tiempo de primera respuesta en horario laboral"]) || 0;
      } 
      else if (sortField === "Hora de creación (Ticket)") {
        const timeA = a["Hora de creación (Ticket)"] ? new Date(String(a["Hora de creación (Ticket)"]).replace(/-/g, "/")).getTime() : 0;
        const timeB = b["Hora de creación (Ticket)"] ? new Date(String(b["Hora de creación (Ticket)"]).replace(/-/g, "/")).getTime() : 0;
        valA = isNaN(timeA) ? 0 : timeA;
        valB = isNaN(timeB) ? 0 : timeB;
      }
      else if (sortField === "Demora Calendario (Real)") {
        const delayA = formatCalendarDelay(a["Hora de creación (Ticket)"] || "", a["Hora de responder"] || "").minutes;
        const delayB = formatCalendarDelay(b["Hora de creación (Ticket)"] || "", b["Hora de responder"] || "").minutes;
        valA = delayA;
        valB = delayB;
      }
      else {
        valA = String(a[sortField] || "").toLowerCase();
        valB = String(b[sortField] || "").toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return results;
  }, [filteredTickets, searchQuery, sortField, sortDirection]);

  // Paginated records
  const totalRecords = processedTickets.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedTickets.slice(start, start + pageSize);
  }, [processedTickets, currentPage, pageSize]);

  // Triggered when clicking columns
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to desc for new fields
    }
    setCurrentPage(1);
  };

  // Export visible/filtered table to CSV
  const handleExportCSV = () => {
    const headers = [
      "ID de Ticket",
      "Nombre de Cuenta",
      "Asunto",
      "Prioridad (Ticket)",
      "Estado (Ticket)",
      "Propietario de Ticket",
      "Tiempo de primera respuesta en horario laboral"
    ];

    const csvRows = [
      headers.join(","),
      ...processedTickets.map(t => [
        `"${String(t["ID de Ticket"] || "").replace(/"/g, '""')}"`,
        `"${String(t["Nombre de Cuenta"] || "").replace(/"/g, '""')}"`,
        `"${String(t["Asunto"] || "").replace(/"/g, '""')}"`,
        `"${String(t["Prioridad (Ticket)"] || "").replace(/"/g, '""')}"`,
        `"${String(t["Estado (Ticket)"] || "").replace(/"/g, '""')}"`,
        `"${String(t["Propietario de Ticket"] || "").replace(/"/g, '""')}"`,
        t["Tiempo de primera respuesta en horario laboral"] || 0
      ].join(","))
    ];

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `casos_criticos_ecs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export full ticket record dataset or filtered dataset to genuine .XLSX Excel sheet
  const handleExportExcel = () => {
    // Structure data exactly for Excel
    const dataToExport = processedTickets.map(t => ({
      "ID de Ticket": t["ID de Ticket"],
      "Nombre de Cuenta": t["Nombre de Cuenta"],
      "Asunto": t["Asunto"],
      "Prioridad": t["Prioridad (Ticket)"],
      "Estado": t["Estado (Ticket)"],
      "Propietario": t["Propietario de Ticket"],
      "Tiempo 1ª Respuesta (min)": Number(t["Tiempo de primera respuesta en horario laboral"]) || 0,
      "Clasificación": t["Clasificaciones"],
      "Ingeniero Asignado": t["Ingeniero de soporte asignado"],
      "SLA Vulneración": t["Tipo de vulneración del SLA"],
      "Total Horas Empleadas": Number(t["Tiempo total empleado"]) || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Casos de Soporte");

    // Generate buffer and trigger download
    XLSX.writeFile(workbook, `Reporte_Soporte_ECS_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden" id="critical-cases-panel">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-50/50">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-bounce" />
            Informe de Casos Críticos y Atrasados
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Muestra el listado de casos ordenados por el mayor retraso en la primera respuesta laboral.
          </p>
        </div>

        {/* Search, Rows selection, and Export buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Dynamic Search */}
          <div className="relative shrink-0 w-full md:w-64">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Buscar en este informe..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="block w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-[#005bbf] focus:border-[#005bbf]"
            />
          </div>

          {/* Export to CSV */}
          <button
            onClick={handleExportCSV}
            disabled={totalRecords === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Exportar a archivo CSV plano"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>

          {/* Export to genuine Excel */}
          <button
            onClick={handleExportExcel}
            disabled={totalRecords === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Exportar reporte estructurado de Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </button>
        </div>
      </div>

      {/* Actual Data Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
          <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th 
                scope="col" 
                onClick={() => handleSort("ID de Ticket")}
                className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group select-none"
              >
                <div className="flex items-center gap-1">
                  ID de Ticket
                  <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-700" />
                </div>
              </th>
              <th 
                scope="col" 
                onClick={() => handleSort("Nombre de Cuenta")}
                className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group select-none"
              >
                <div className="flex items-center gap-1">
                  Nombre de Cuenta
                  <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-700" />
                </div>
              </th>
              <th 
                scope="col" 
                onClick={() => handleSort("Asunto")}
                className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group select-none w-1/4"
              >
                <div className="flex items-center gap-1">
                  Asunto
                  <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-700" />
                </div>
              </th>
              <th 
                scope="col" 
                onClick={() => handleSort("Prioridad (Ticket)")}
                className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group select-none text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  Prioridad
                  <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-700" />
                </div>
              </th>
              <th 
                scope="col" 
                onClick={() => handleSort("Estado (Ticket)")}
                className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group select-none text-center"
              >
                <div className="flex items-center justify-center gap-1">
                  Estado
                  <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-700" />
                </div>
              </th>
              <th 
                scope="col" 
                onClick={() => handleSort("Propietario de Ticket")}
                className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group select-none"
              >
                <div className="flex items-center gap-1">
                  Propietario
                  <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-700" />
                </div>
              </th>
              <th 
                scope="col" 
                onClick={() => handleSort("Hora de creación (Ticket)")}
                className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group select-none bg-slate-100/30"
              >
                <div className="flex items-center gap-1">
                  Fechas (Creación / Respuesta)
                  <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-700" />
                </div>
              </th>
              <th 
                scope="col" 
                onClick={() => handleSort("Demora Calendario (Real)")}
                className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group select-none text-right bg-indigo-50/40 text-indigo-800"
              >
                <div className="flex items-center justify-end gap-1">
                  Demora Real
                  <ArrowUpDown className="w-3 h-3 text-indigo-500" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-150">
            {paginatedTickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <HelpCircle className="w-8 h-8 text-gray-300" />
                    <span>No se encontraron registros que coincidan con la búsqueda.</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTickets.map((ticket, index) => {
                const priorityLower = (ticket["Prioridad (Ticket)"] || "").toLowerCase();
                const statusLower = (ticket["Estado (Ticket)"] || "").toLowerCase();
                
                // Styling priorities
                let priorityBadge = "bg-gray-100 text-gray-700";
                if (priorityLower === "crítica" || priorityLower === "critica") {
                  priorityBadge = "bg-rose-100 text-rose-800 font-extrabold border border-rose-200";
                } else if (priorityLower === "alta") {
                  priorityBadge = "bg-amber-100 text-amber-800 font-semibold border border-amber-200";
                } else if (priorityLower === "media") {
                  priorityBadge = "bg-blue-50 text-blue-700 border border-blue-100";
                } else if (priorityLower === "baja") {
                  priorityBadge = "bg-slate-100 text-slate-600";
                }

                // Styling statuses
                let statusBadge = "bg-gray-100 text-gray-600";
                if (statusLower === "abierto") {
                  statusBadge = "bg-rose-50 text-rose-700 font-semibold border border-rose-100 animate-pulse";
                } else if (statusLower === "en progreso") {
                  statusBadge = "bg-amber-50 text-amber-800 border border-amber-100";
                } else if (statusLower === "pendiente") {
                  statusBadge = "bg-blue-50 text-blue-700 border border-blue-100";
                } else if (statusLower === "cerrado") {
                  statusBadge = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                }

                // First response highlight if high
                const minutesVal = Number(ticket["Tiempo de primera respuesta en horario laboral"]) || 0;
                const delayInfo = formatDetailedDelay(minutesVal);
                let responseColor = "text-gray-900";
                if (minutesVal >= 180) {
                  responseColor = "text-rose-700 font-extrabold";
                } else if (minutesVal >= 60) {
                  responseColor = "text-amber-700 font-bold";
                }

                // Calculate the real elapsed calendar time
                const calDelay = formatCalendarDelay(
                  ticket["Hora de creación (Ticket)"] || "",
                  ticket["Hora de responder"] || ""
                );

                let calBadgeColor = "text-gray-700 bg-gray-50 border border-gray-150";
                if (calDelay.isCritical) {
                  calBadgeColor = "text-rose-700 bg-rose-50 border border-rose-200 font-extrabold";
                } else if (calDelay.isHigh) {
                  calBadgeColor = "text-amber-700 bg-amber-50 border border-amber-200 font-bold";
                } else if (calDelay.isAnswered) {
                  calBadgeColor = "text-emerald-700 bg-emerald-50/60 border border-emerald-200 font-semibold";
                }

                return (
                  <tr 
                    key={ticket["ID de Ticket"] + "-" + index}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* ID */}
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-[#005bbf] whitespace-nowrap">
                      {ticket["ID de Ticket"]}
                    </td>
                    
                    {/* Nombre Cuenta */}
                    <td className="px-4 py-2.5 font-semibold text-gray-900 truncate max-w-[140px]" title={ticket["Nombre de Cuenta"]}>
                      {ticket["Nombre de Cuenta"]}
                    </td>
                    
                    {/* Asunto */}
                    <td className="px-4 py-2.5 text-gray-700 truncate max-w-xs" title={ticket["Asunto"]}>
                      {ticket["Asunto"]}
                    </td>
                    
                    {/* Prioridad */}
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase ${priorityBadge}`}>
                        {ticket["Prioridad (Ticket)"]}
                      </span>
                    </td>
                    
                    {/* Estado */}
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase ${statusBadge}`}>
                        {ticket["Estado (Ticket)"]}
                      </span>
                    </td>
                    
                    {/* Propietario */}
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      {ticket["Propietario de Ticket"]}
                    </td>

                    {/* Fechas de Registro */}
                    <td className="px-4 py-2.5 text-gray-600 bg-slate-150/10">
                      <div className="flex flex-col text-[11px] space-y-0.5">
                        <span className="text-gray-500 font-medium">
                          <strong className="text-gray-700">Creado:</strong> {ticket["Hora de creación (Ticket)"] || "N/D"}
                        </span>
                        {ticket["Hora de responder"] ? (
                          <span className="text-emerald-600 font-semibold">
                            <strong className="text-emerald-700">Rpta:</strong> {ticket["Hora de responder"]}
                          </span>
                        ) : (
                          <span className="text-rose-500 font-bold animate-pulse">
                            🚨 Sin primera respuesta
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Demora Calendario (Real) */}
                    <td className="px-4 py-2.5 text-right font-sans text-xs bg-indigo-50/10">
                      <div className="flex flex-col items-end">
                        <span className={`inline-flex px-2 py-1 rounded text-xs ${calBadgeColor}`}>
                          {calDelay.text}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/30">
        <div className="text-xs text-gray-500">
          Mostrando <span className="font-semibold text-gray-800">
            {totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0}
          </span> a <span className="font-semibold text-gray-800">
            {Math.min(currentPage * pageSize, totalRecords)}
          </span> de <span className="font-semibold text-gray-800">{totalRecords}</span> registros 
          {searchQuery && ` (filtrado de ${filteredTickets.length} totales)`}
        </div>

        <div className="flex items-center gap-4">
          {/* Rows per page selector */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>Filas por página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-[#005bbf] focus:border-[#005bbf]"
            >
              {[5, 10, 20, 50].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-600 font-semibold min-w-[50px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
