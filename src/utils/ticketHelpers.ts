import { TicketRecord } from "../types";

/** Reglas compartidas para que todas las gráficas y tablas calculen igual. */

export const ownerOf = (t: TicketRecord) => t["Propietario de Ticket"] || "Sin Propietario";
export const accountOf = (t: TicketRecord) => t["Nombre de Cuenta"] || "Sin Cuenta";
export const statusOf = (t: TicketRecord) => t["Estado (Ticket)"] || "Sin Estado";
export const priorityOf = (t: TicketRecord) => t["Prioridad (Ticket)"] || "Sin Prioridad";
export const classificationOf = (t: TicketRecord) =>
  t["Clasificaciones"] || t["Categoria (Ticket)"] || "Sin Clasificación";

export function isClosed(t: TicketRecord): boolean {
  const s = (t["Estado (Ticket)"] || "").toLowerCase();
  return ["cerr", "clos", "solv", "termin", "resuel", "done", "final", "cierre"].some(k => s.includes(k));
}

export function isCriticalOrHigh(t: TicketRecord): boolean {
  const p = (t["Prioridad (Ticket)"] || "").toLowerCase().trim();
  return ["crít", "crit", "alt", "urg", "high", "emerg", "p1", "p2"].some(k => p.includes(k)) || p === "1" || p === "2";
}

export function hasResponse(t: TicketRecord): boolean {
  const n = Number(String(t["Número de respuestas"] ?? "").trim());
  if (!isNaN(n) && n > 0) return true;
  const agent = String(t["Tiempo de respuesta del agente"] ?? "").trim();
  return agent !== "" && agent !== "N/D";
}

export const isUnanswered = (t: TicketRecord) => !hasResponse(t);

export function hasSlaBreach(t: TicketRecord): boolean {
  const s = (t["Tipo de vulneración del SLA"] || "").trim().toLowerCase();
  return s !== "" && s !== "ninguna" && s !== "none" && !s.includes("not violated");
}

export function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(String(s).trim().replace(/-/g, "/").replace("T", " ").replace(/\.\d+$/, ""));
  return isNaN(d.getTime()) ? null : d;
}

/** Días calendario desde la creación hasta el cierre (o hasta hoy si sigue abierto). */
export function ageDays(t: TicketRecord, now = new Date()): number | null {
  const c = parseDate(t["Hora de creación (Ticket)"]);
  if (!c) return null;
  const end = parseDate(t["Ticket Tiempo terminado"]) || now;
  return Math.max(0, (end.getTime() - c.getTime()) / 86400000);
}

export const AGE_BUCKETS = [
  { key: "0-2 d", min: 0, max: 3 },
  { key: "3-7 d", min: 3, max: 8 },
  { key: "8-15 d", min: 8, max: 16 },
  { key: "16-30 d", min: 16, max: 31 },
  { key: "31-90 d", min: 31, max: 91 },
  { key: "+90 d", min: 91, max: Infinity },
];

export function ageBucketOf(t: TicketRecord): string {
  const d = ageDays(t);
  if (d === null) return "Sin fecha";
  return AGE_BUCKETS.find(b => d >= b.min && d < b.max)?.key || "Sin fecha";
}

/** Lunes de la semana de creación, "YYYY-MM-DD" */
export function weekOf(t: TicketRecord): string | null {
  const d = parseDate(t["Hora de creación (Ticket)"]);
  if (!d) return null;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

export function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return "—";
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = Math.round(minutes % 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m && !d) parts.push(`${m}m`);
  return parts.join(" ") || "0m";
}

/** Orden lógico del flujo de estados de ECS; los desconocidos van al final. */
const STATUS_ORDER = [
  "nuevo", "abierto", "en gestión n1", "en gestión n2", "en gestión n3", "en progreso",
  "esperando aprobación interna", "esperando información del cliente", "pendiente",
  "en validación cliente", "cerrado",
];
export function statusRank(s: string): number {
  const i = STATUS_ORDER.indexOf(s.toLowerCase());
  return i === -1 ? 50 : i;
}

/** Colores por estado (paleta fija para que cada estado se vea igual en todas las gráficas). */
export function statusColor(s: string): string {
  const l = s.toLowerCase();
  if (l === "nuevo" || l === "abierto") return "#dc2626";
  if (l.includes("n1")) return "#005bbf";
  if (l.includes("n2")) return "#3b82f6";
  if (l.includes("n3")) return "#7c3aed";
  if (l.includes("aprobación") || l.includes("aprobacion")) return "#f59e0b";
  if (l.includes("información") || l.includes("informacion") || l.includes("pendiente")) return "#f2994a";
  if (l.includes("validación") || l.includes("validacion")) return "#10b981";
  if (l.includes("cerr")) return "#6b7280";
  return "#94a3b8";
}

/** Días desde la última actividad del ticket (dato de la API de Zoho Desk). */
export function inactivityDays(t: TicketRecord, now = new Date()): number | null {
  const d = parseDate(t["Última actividad"]);
  return d ? Math.max(0, (now.getTime() - d.getTime()) / 86400000) : null;
}

export const INACTIVITY_BUCKETS = [
  { key: "Hoy / ayer", min: 0, max: 2 },
  { key: "2-7 días", min: 2, max: 8 },
  { key: "8-15 d", min: 8, max: 16 },
  { key: "16-30 d", min: 16, max: 31 },
  { key: "Más de 30 días", min: 31, max: Infinity },
];

export function inactivityBucketOf(t: TicketRecord): string | null {
  const d = inactivityDays(t);
  if (d === null) return null;
  return INACTIVITY_BUCKETS.find(b => d >= b.min && d < b.max)?.key || null;
}

/** "Cliente" = el último mensaje lo escribió el cliente (pendiente de ECS). */
export const lastFromOf = (t: TicketRecord) =>
  t["Último mensaje de"] === "Cliente" ? "Pendiente de ECS (escribió el cliente)"
  : t["Último mensaje de"] === "Agente" ? "Esperando al cliente (respondió ECS)"
  : "Sin dato";
