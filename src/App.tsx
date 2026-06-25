import React, { useState, useEffect, useMemo } from "react";
import { Header } from "./components/Header";
import { UploadZone } from "./components/UploadZone";
import { FilterSection } from "./components/FilterSection";
import { KPICards } from "./components/KPICards";
import { DashboardCharts } from "./components/DashboardCharts";
import { CriticalTicketsTable } from "./components/CriticalTicketsTable";
import { INITIAL_MOCK_DATA } from "./mockData";
import { TicketRecord } from "./types";
import { 
  Database, 
  HelpCircle, 
  FileCheck, 
  BarChart3, 
  TableProperties, 
  RefreshCw, 
  Info,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";

export default function App() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [isResetting, setIsResetting] = useState(false);

  // 1. Initial State Load - Read from localStorage or pre-populate with mock data
  useEffect(() => {
    const cached = localStorage.getItem("ecs_support_tickets");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as TicketRecord[];
        setTickets(parsed);
        
        // Auto-select all unique owners by default
        const uniqueOwners = Array.from(new Set(parsed.map(t => t["Propietario de Ticket"] || "Sin Propietario")));
        setSelectedOwners(uniqueOwners);
      } catch (err) {
        console.error("Error parsing cached ticket data:", err);
        loadDefaultMockData();
      }
    } else {
      loadDefaultMockData();
    }
  }, []);

  const loadDefaultMockData = () => {
    setTickets(INITIAL_MOCK_DATA);
    localStorage.setItem("ecs_support_tickets", JSON.stringify(INITIAL_MOCK_DATA));
    
    // Auto-select all unique owners by default
    const uniqueOwners = Array.from(new Set(INITIAL_MOCK_DATA.map(t => t["Propietario de Ticket"])));
    setSelectedOwners(uniqueOwners);
  };

  // Save changes to localStorage whenever tickets change
  const handleDataLoaded = (newTickets: TicketRecord[]) => {
    setTickets(newTickets);
    localStorage.setItem("ecs_support_tickets", JSON.stringify(newTickets));
    
    // Reset selected owners to contain all unique owners in the newly uploaded file
    const uniqueOwners = Array.from(new Set(newTickets.map(t => t["Propietario de Ticket"] || "Sin Propietario")));
    setSelectedOwners(uniqueOwners);
  };

  const handleClearData = () => {
    setIsResetting(true);
    setTimeout(() => {
      setTickets([]);
      setSelectedOwners([]);
      localStorage.removeItem("ecs_support_tickets");
      setIsResetting(false);
    }, 450);
  };

  // 2. Perform filtering based on the Mandatory support owner global filter
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const owner = t["Propietario de Ticket"] || "Sin Propietario";
      return selectedOwners.includes(owner);
    });
  }, [tickets, selectedOwners]);

  // SLA status statistics summary
  const totalBreaches = useMemo(() => {
    return filteredTickets.filter(t => {
      const sla = (t["Tipo de vulneración del SLA"] || "").trim().toLowerCase();
      return sla !== "ninguna" && sla !== "" && sla !== "none";
    }).length;
  }, [filteredTickets]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-root">
      {/* Header with live clock and brand logo */}
      <Header />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Intro Alert Hero explaining dataset source */}
        <div className="bg-gradient-to-r from-[#005bbf] to-[#0d69af] text-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400 animate-pulse" />
              Consola de Inteligencia de Soporte Técnico
            </h2>
            <p className="text-xs text-blue-100 max-w-2xl">
              Análisis interactivo de rendimiento para <strong className="text-white">Effective Computer Solutions</strong>. 
              Sube y audita reportes periódicos de soporte técnico, valida niveles de servicio, demoras de primera respuesta laboral, y gestiona picos de casos críticos.
            </p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10 text-xs self-stretch md:self-auto flex flex-col justify-center">
            <div className="text-blue-200 uppercase font-bold tracking-wider text-[10px]">Datos Cargados</div>
            <div className="text-lg font-black tracking-tight mt-0.5 font-mono text-amber-300">
              {tickets.length} Registros
            </div>
          </div>
        </div>

        {/* Data Upload and Reset Actions */}
        <div className="grid grid-cols-1 gap-6">
          <UploadZone 
            onDataLoaded={handleDataLoaded} 
            onClearData={handleClearData} 
            dataCount={tickets.length}
          />
        </div>

        {/* Global Filter Bar (Required support owner) */}
        {tickets.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            <FilterSection 
              tickets={tickets} 
              selectedOwners={selectedOwners} 
              onChangeSelectedOwners={setSelectedOwners} 
            />
          </div>
        )}

        {/* Empty State warning if database was reset or has 0 rows */}
        {tickets.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center max-w-xl mx-auto shadow-xs space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
              <Database className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900">La Base de Datos está Vacía</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                No hay registros cargados. Sube un archivo Excel (.xlsx) o descarga la plantilla de prueba para ver el dashboard activo.
              </p>
            </div>
            <button
              onClick={loadDefaultMockData}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#005bbf] hover:bg-[#005bbf]/90 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Cargar Conjunto de Datos de Demostración
            </button>
          </div>
        ) : (
          /* Dashboard Core Panels */
          <div className="space-y-8 animate-fade-in">
            
            {/* 1. KPIs Block */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-gray-400" />
                Métricas Clave y KPIs Globales
              </h3>
              <KPICards filteredTickets={filteredTickets} />
            </section>

            {/* 2. Charts and Warnings */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                Gráficos de Análisis y Criticidad
              </h3>
              <DashboardCharts filteredTickets={filteredTickets} />
            </section>

            {/* 3. Detailed Exportable Table */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <TableProperties className="w-3.5 h-3.5 text-gray-400" />
                Auditoría y Desglose Detallado de Incidentes
              </h3>
              <CriticalTicketsTable filteredTickets={filteredTickets} />
            </section>
          </div>
        )}
      </main>

      {/* Simple Professional Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12 text-center text-xs text-gray-400">
        <p className="font-semibold text-gray-500">Effective Computer Solutions &copy; {new Date().getFullYear()}</p>
        <p className="mt-1">Consola Interna de Aseguramiento de Calidad y Cumplimiento de Acuerdos de Nivel de Servicio (SLA)</p>
      </footer>
    </div>
  );
}
