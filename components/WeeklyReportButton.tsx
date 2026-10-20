import React, { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { TicketRecord } from "../types";
import { buildWeeklyRows, exportWeeklyReport, isoWeekLabel, mondayOf, ymd } from "../utils/weeklyReport";
import { fetchWeekCounts } from "../utils/zoho";

/** Botón "Reporte soporte semanal": exporta la hoja 'Registro Semanal' (misma estructura del Excel de seguimiento). */
export function WeeklyReportButton({ tickets }: { tickets: TicketRecord[] }) {
  const [week, setWeek] = useState(() => ymd(mondayOf(new Date())));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const [y, m, d] = week.split("-").map(Number);
      const monday = mondayOf(new Date(y, m - 1, d));
      const mondayYmd = ymd(monday);
      let counts = null;
      try {
        counts = await fetchWeekCounts(mondayYmd);
      } catch {
        counts = null;
      }
      const rows = buildWeeklyRows(tickets, monday, counts);
      await exportWeeklyReport(rows, `Registro_Semanal_${isoWeekLabel(monday)}_${mondayYmd}.xlsx`);
      setMsg(counts
        ? `Exportado: ${rows.length} filas (${isoWeekLabel(monday)}).`
        : `Exportado con los datos cargados (sin conexión a Zoho): «cerrados en la semana» y «Δ» solo cuentan los tickets cerrados que traiga el archivo cargado.`);
    } catch (e: any) {
      setMsg(`No se pudo generar el reporte: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-semibold text-gray-500" htmlFor="weekly-report-week">Semana (lunes)</label>
        <input
          id="weekly-report-week"
          type="date"
          value={week}
          onChange={e => e.target.value && setWeek(ymd(mondayOf(new Date(`${e.target.value}T00:00:00`))))}
          className="border border-gray-300 rounded-lg px-2 py-1 text-xs"
        />
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="Exporta la hoja 'Registro Semanal' con la estructura del Excel de seguimiento semanal de clientes"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
          Reporte soporte semanal
        </button>
      </div>
      {msg && <span className="text-[10px] text-gray-500 max-w-md text-right">{msg}</span>}
    </div>
  );
}
