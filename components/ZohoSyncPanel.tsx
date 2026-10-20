import React, { useState } from "react";
import { RefreshCw, CloudDownload, KeyRound, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { TicketRecord } from "../types";
import { useAuthUser } from "../auth/AuthGate";
import {
  fetchZohoReport, getAccessKey, setAccessKey, ZOHO_REPORT_NAME, ZOHO_REPORT_URL, ZohoSyncError,
} from "../utils/zoho";

interface Props {
  onDataLoaded: (tickets: TicketRecord[], fetchedAt: string) => void;
  lastSync: string | null;
  syncing: boolean;
  setSyncing: (b: boolean) => void;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function ZohoSyncPanel({ onDataLoaded, lastSync, syncing, setSyncing }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [askKey, setAskKey] = useState(false);
  const [keyDraft, setKeyDraft] = useState(getAccessKey());
  const user = useAuthUser();

  const sync = async () => {
    setSyncing(true);
    setError(null);
    setOkMsg(null);
    try {
      const r = await fetchZohoReport();
      onDataLoaded(r.tickets, r.fetchedAt);
      setOkMsg(`Se cargaron ${r.tickets.length} casos desde Zoho Desk${r.source === "tickets-api" ? " (vía API de tickets)" : ""}.`);
      setAskKey(false);
    } catch (e: any) {
      if (e instanceof ZohoSyncError && e.status === 401.1) {
        setAskKey(true);
        setError("Ingresa la clave de acceso del dashboard para consultar Zoho Desk.");
      } else {
        setError(e?.message || "No se pudo actualizar desde Zoho Desk.");
      }
    } finally {
      setSyncing(false);
    }
  };

  const saveKeyAndSync = (e: React.FormEvent) => {
    e.preventDefault();
    setAccessKey(keyDraft.trim());
    sync();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 text-[#005bbf] rounded-lg"><CloudDownload className="w-5 h-5" /></div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Datos en vivo desde Zoho Desk</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Informe:{" "}
              <a href={ZOHO_REPORT_URL} target="_blank" rel="noopener noreferrer" className="text-[#005bbf] font-semibold hover:underline inline-flex items-center gap-0.5">
                {ZOHO_REPORT_NAME} <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {lastSync ? <>Última actualización: <strong className="text-gray-600">{fmt(lastSync)}</strong></> : "Aún no se ha actualizado desde Zoho en este navegador."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!user && <button
            onClick={() => setAskKey(v => !v)}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer"
            title="Configurar clave de acceso"
          >
            <KeyRound className="w-4 h-4" />
          </button>}
          <button
            onClick={sync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#005bbf] hover:bg-[#004a9c] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Actualizando..." : "Actualizar desde Zoho Desk"}
          </button>
        </div>
      </div>

      {askKey && (
        <form onSubmit={saveKeyAndSync} className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            value={keyDraft}
            onChange={e => setKeyDraft(e.target.value)}
            placeholder="Clave de acceso del dashboard"
            autoComplete="off"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-[#005bbf] focus:border-[#005bbf]"
          />
          <button type="submit" className="px-3 py-2 rounded-lg text-xs font-semibold text-[#005bbf] bg-[#005bbf]/10 hover:bg-[#005bbf]/20 cursor-pointer">
            Guardar y actualizar
          </button>
        </form>
      )}

      {error && (
        <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}
      {okMsg && !error && (
        <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" /> <span>{okMsg}</span>
        </div>
      )}
    </div>
  );
}
