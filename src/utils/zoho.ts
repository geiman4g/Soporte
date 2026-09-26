import { TicketRecord } from "../types";
import { getIdToken } from "../auth/msal";

/** Portal de Zoho Desk de ECS */
export const ZOHO_PORTAL = "https://desk.zoho.com/agent/ecsla/effective-computer-solutions";
export const ZOHO_REPORT_URL = `${ZOHO_PORTAL}/reports/details/601927000052419003`;
export const ZOHO_REPORT_NAME = "Reporte Semanal Soporte - Gerentes de cuenta";

/** Enlace para abrir un ticket en Zoho Desk (por ID interno o, si no existe, buscando el número). */
export function zohoTicketUrl(t: Pick<TicketRecord, "ID de Ticket" | "zohoId">): string {
  if (t.zohoId) return `${ZOHO_PORTAL}/tickets/details/${t.zohoId}`;
  const num = String(t["ID de Ticket"] || "").replace(/[^\d]/g, "");
  return `${ZOHO_PORTAL}/tickets/search?searchDept=currentDept&searchWord=${encodeURIComponent(num || t["ID de Ticket"] || "")}`;
}

// ---------------------------------------------------------------------------
// Sincronización con la función /api/zoho-report
// ---------------------------------------------------------------------------
const KEY_STORAGE = "ecs_zoho_access_key";
const SYNC_STORAGE = "ecs_zoho_last_sync";

export const getAccessKey = () => {
  try { return localStorage.getItem(KEY_STORAGE) || ""; } catch { return ""; }
};
export const setAccessKey = (k: string) => {
  try { localStorage.setItem(KEY_STORAGE, k); } catch { /* sin almacenamiento */ }
};
export const getLastSync = (): string | null => {
  try { return localStorage.getItem(SYNC_STORAGE); } catch { return null; }
};
const setLastSync = (iso: string) => {
  try { localStorage.setItem(SYNC_STORAGE, iso); } catch { /* sin almacenamiento */ }
};

export class ZohoSyncError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface ZohoSyncResult {
  tickets: TicketRecord[];
  fetchedAt: string;
  source: string;
}

export async function fetchZohoReport(): Promise<ZohoSyncResult> {
  const url = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/zoho-report`;
  let res: Response;
  let idToken = "";
  try {
    idToken = await getIdToken();
  } catch {
    throw new ZohoSyncError("Tu sesión de Microsoft expiró. Vuelve a iniciar sesión.", 401);
  }
  try {
    const headers: Record<string, string> = { "x-dashboard-key": getAccessKey() };
    if (idToken) headers.Authorization = `Bearer ${idToken}`;
    res = await fetch(url, { headers, cache: "no-store" });
  } catch {
    throw new ZohoSyncError("No se pudo conectar con el servicio de sincronización.", 0);
  }
  const body = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    if (res.status === 401 && body?.code === "key") throw new ZohoSyncError(body.error, 401.1);
    throw new ZohoSyncError(
      body?.error || (res.status === 404
        ? "El servicio /api/zoho-report no está disponible (¿el dashboard está publicado en Vercel?)."
        : `Error ${res.status} al consultar Zoho Desk.`),
      res.status
    );
  }
  const tickets = (body.tickets || []) as TicketRecord[];
  const fetchedAt = body.fetchedAt || new Date().toISOString();
  setLastSync(fetchedAt);
  return { tickets, fetchedAt, source: body.source || "report" };
}

// ---------------------------------------------------------------------------
// Normalización de valores de Zoho (también para archivos exportados de Zoho y cargados a mano)
// ---------------------------------------------------------------------------
const clean = (v: any): string => {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s === "-" ? "" : s;
};

/** "3d 23h", "1w 0d", "1mos 2w", "00:04:00", "05:47 hrs", "320" → minutos */
export function durationToMinutes(v: any): number | "" {
  if (typeof v === "number") return v;
  const s = clean(v).toLowerCase();
  if (!s) return "";
  const hms = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?(\s*hrs?)?$/);
  if (hms) return Number(hms[1]) * 60 + Number(hms[2]) + Math.round(Number(hms[3] || 0) / 60);
  let total = 0;
  let matched = false;
  const re = /(\d+(?:\.\d+)?)\s*(mos|mo|w|d|h|m)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    matched = true;
    const n = Number(m[1]);
    const u = m[2];
    total += u.startsWith("mo") ? n * 43200 : u === "w" ? n * 10080 : u === "d" ? n * 1440 : u === "h" ? n * 60 : n;
  }
  if (matched) return Math.round(total);
  const n = Number(s.replace(",", "."));
  return isNaN(n) ? "" : n;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08",
  sep: "09", oct: "10", nov: "11", dec: "12", ene: "01", abr: "04", ago: "08", dic: "12",
};
const pad = (n: number | string) => String(n).padStart(2, "0");

/** "21 Aug 2026 04:27 PM" / "2026-08-24 15:14:57.0" → "YYYY-MM-DD HH:mm:ss" */
export function normalizeZohoDate(v: any): string {
  if (typeof v === "number" && v > 20000 && v < 80000) {
    // Fecha serial de Excel
    const d = new Date(Math.round((v - 25569) * 86400000));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
  }
  const s = clean(v);
  if (!s) return "";
  const a = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?/);
  if (a) {
    let h = Number(a[4]);
    const ap = (a[7] || "").toLowerCase().replace(/[^ap]/g, "");
    if (ap === "p" && h < 12) h += 12;
    if (ap === "a" && h === 12) h = 0;
    return `${a[3]}-${MONTHS[a[2].toLowerCase()] || "01"}-${pad(a[1])} ${pad(h)}:${a[5]}:${a[6] || "00"}`;
  }
  const b = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(\.\d+)?$/);
  if (b) return `${b[1]}-${b[2]}-${b[3]} ${b[4]}:${b[5]}:${b[6] || "00"}`;
  return s;
}

export function normalizeSla(v: any): string {
  const s = clean(v).toLowerCase();
  if (!s || s.includes("not violated") || s === "none" || s === "ninguna") return "Ninguna";
  if (s.includes("response") && s.includes("resolution")) return "Respuesta y resolución vencidas";
  if (s.includes("resolution")) return "Resolución vencida";
  if (s.includes("response")) return "Respuesta vencida";
  return clean(v);
}
