import React, { useState, useEffect, useMemo, useRef } from "react";
import { Header } from "./components/Header";
import { UploadZone } from "./components/UploadZone";
import { FilterSection } from "./components/FilterSection";
import { KPICards } from "./components/KPICards";
import { DashboardCharts } from "./components/DashboardCharts";
import { CriticalTicketsTable } from "./components/CriticalTicketsTable";
import { TrackingCharts } from "./components/TrackingCharts";
import { TicketDetailDrawer } from "./components/TicketDetailDrawer";
import { ZohoSyncPanel } from "./components/ZohoSyncPanel";
import { Selection } from "./utils/selection";
import { fetchZohoReport, getLastSync } from "./utils/zoho";
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
  const [selection, setSelection] = useState<Selection | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(getLastSync());
  const [syncing, setSyncing] = useState(false);
  const ticketsRef = useRef<TicketRecord[]>([]);
  useEffect(() => { ticketsRef.current = tickets; }, [tickets]);

  const ownersIn = (list: TicketRecord[]) =>
    Array.from(new Set(list.map(t => t["Propietario de Ticket"] || "Sin Propietario")));

  const saveCache = (list: TicketRecord[]) => {
    try { localStorage.setItem("ecs_support_tickets", JSON.stringify(list)); } catch { /* sin almacenamiento */ }
  };

  // 1. Carga inicial: datos guardados en este navegador; si no hay, se intenta traer de Zoho Desk.
  useEffect(() => {
    let cached: string | null = null;
    try { cached = localStorage.getItem("ecs_support_tickets"); } catch { /* sin almacenamiento */ }
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as TicketRecord[];
        setTickets(parsed);
        setSelectedOwners(ownersIn(parsed));
        return;
      } catch (err) {
        console.error("Error parsing cached ticket data:", err);
      }
    }
    setSyncing(true);
    fetchZohoReport()
      .then(r => handleDataLoaded(r.tickets, r.fetchedAt))
      .catch(() => { /* sin servicio o sin clave: queda el estado vacío con el botón de actualizar */ })
      .finally(() => setSyncing(false));
  }, []);

  const loadDefaultMockData = () => {
    setTickets(INITIAL_MOCK_DATA);
    saveCache(INITIAL_MOCK_DATA);
    setSelectedOwners(ownersIn(INITIAL_MOCK_DATA));
  };

  // Al cargar datos nuevos se conserva el filtro de propietario que el usuario tenía seleccionado.
  const handleDataLoaded = (newTickets: TicketRecord[], fetchedAt?: string) => {
    const newOwners = ownersIn(newTickets);
    const prevOwners = ownersIn(ticketsRef.current);
    setSelectedOwners(current => {
      const hadAll = prevOwners.length === 0 || prevOwners.every(o => current.includes(o));
      if (hadAll) return newOwners;
      const kept = current.filter(o => newOwners.includes(o));
      return kept.length ? kept : newOwners;
    });
    ticketsRef.current = newTickets;
    setTickets(newTickets);
    saveCache(newTickets);
    if (fetchedAt) setLastSync(fetchedAt);
  };

  const handleClearData = () => {
    setIsResetting(true);
    setTimeout(() => {
      setTickets([]);
      setSelectedOwners([]);
      setSelection(null);
      try { localStorage.removeItem("ecs_support_tickets"); } catch { /* sin almacenamiento */ }
      setIsResetting(false);
    }, 450);
  };

  const totalOwners = useMemo(() => ownersIn(tickets).length, [tickets]);

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
              Actualiza desde Zoho Desk o sube reportes de soporte técnico, valida niveles de servicio, demoras de primera respuesta laboral, y gestiona picos de casos críticos.
            </p>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10 text-xs self-stretch md:self-auto flex flex-col justify-center">
            <div className="text-blue-200 uppercase font-bold tracking-wider text-[10px]">Datos Cargados</div>
            <div className="text-lg font-black tracking-tight mt-0.5 font-mono text-amber-300">
              {tickets.length} Registros
            </div>
          </div>
        </div>

        {/* Actualización en vivo desde Zoho Desk */}
        <ZohoSyncPanel onDataLoaded={handleDataLoaded} lastSync={lastSync} syncing={syncing} setSyncing={setSyncing} />

        {/* Data Upload and Reset Actions */}
        <div className="grid grid-cols-1 gap-6">
          <UploadZone 
            onDataLoaded={(d) => handleDataLoaded(d)} 
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
                {syncing ? "Consultando Zoho Desk..." : "No hay registros cargados. Usa «Actualizar desde Zoho Desk» o sube un archivo Excel (.xlsx)."}
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
              <KPICards filteredTickets={filteredTickets} onSelect={setSelection} />
            </section>

            {/* 2. Charts and Warnings */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                Gráficos de Análisis y Criticidad
              </h3>
              <DashboardCharts filteredTickets={filteredTickets} onSelect={setSelection} />
            </section>

            {/* 2b. Seguimiento operativo */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                Seguimiento por Estado, Propietario, Antigüedad y SLA
              </h3>
              <TrackingCharts filteredTickets={filteredTickets} onSelect={setSelection} />
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

      {/* Detalle de casos al hacer clic en cualquier gráfica */}
      <TicketDetailDrawer
        selection={selection}
        filteredTickets={filteredTickets}
        selectedOwnersCount={selectedOwners.length}
        totalOwnersCount={totalOwners}
        onClose={() => setSelection(null)}
      />

      {/* Simple Professional Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12 text-center text-xs text-gray-400">
        <p className="font-semibold text-gray-500">Effective Computer Solutions &copy; {new Date().getFullYear()}</p>
        <p className="mt-1">Consola Interna de Aseguramiento de Calidad y Cumplimiento de Acuerdos de Nivel de Servicio (SLA)</p>
      </footer>
    </div>
  );
}
