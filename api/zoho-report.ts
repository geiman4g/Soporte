/**
 * Función serverless (Vercel) que trae el informe
 * "Reporte Semanal Soporte - Gerentes de cuenta" desde Zoho Desk
 * y lo devuelve normalizado con las mismas columnas que usa el dashboard.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN   (obligatorias, Self Client de api-console.zoho.com)
 *   ZOHO_ORG_ID            (por defecto 749634105)
 *   ZOHO_REPORT_ID         (por defecto 601927000052419003)
 *   ZOHO_ACCOUNTS_URL      (por defecto https://accounts.zoho.com)
 *   ZOHO_DESK_URL          (por defecto https://desk.zoho.com)
 *   ZOHO_ASSIGNEE_IDS      (IDs de propietarios, solo para el modo alterno; por defecto los del informe)
 *   AZURE_CLIENT_ID        (inicio de sesión con Microsoft 365: solo usuarios @ecs-la.com pueden consultar)
 *   AZURE_TENANT_ID, ALLOWED_EMAIL_DOMAIN (opcionales, ver api/auth-config.ts)
 *   DASHBOARD_ACCESS_KEY   (alternativa si aún no se configura Microsoft 365)
 *
 * Estrategia:
 *   1. Intenta exportar el informe guardado de Zoho (mismos filtros que en Zoho).
 *   2. Si la API de informes no está disponible para el token, reconstruye el informe con la
 *      API de tickets (mismos criterios: propietarios del informe, creados en los últimos 12 meses,
 *      estado distinto de "Cerrado" y que no contenga "Cierre por Vencimiento").
 */

import { createRemoteJWKSet, jwtVerify } from "jose";

type AnyRecord = Record<string, any>;

const env = (k: string, d = "") => (process.env[k] ?? d).trim();

const ORG_ID = () => env("ZOHO_ORG_ID", "749634105");
const REPORT_ID = () => env("ZOHO_REPORT_ID", "601927000052419003");
const ACCOUNTS = () => env("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.com").replace(/\/$/, "");
const DESK = () => env("ZOHO_DESK_URL", "https://desk.zoho.com").replace(/\/$/, "");
const DEFAULT_ASSIGNEES =
  "601927000000179333,601927000012456045,601927000010019046,601927000000302301,601927000029805001," +
  "601927000048400324,601927000068336540,601927000000166186,601927000068414539,601927000068414521,601927000068414390";
const TZ = "America/Bogota";

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------
let cachedToken: { value: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.value;
  const body = new URLSearchParams({
    refresh_token: env("ZOHO_REFRESH_TOKEN"),
    client_id: env("ZOHO_CLIENT_ID"),
    client_secret: env("ZOHO_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });
  const r = await fetch(`${ACCOUNTS()}/oauth/v2/token`, { method: "POST", body });
  const j: AnyRecord = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    throw new HttpError(502, `No se pudo obtener el token de Zoho: ${j.error || r.status}`);
  }
  cachedToken = { value: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return cachedToken.value;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function desk(path: string, token: string): Promise<{ status: number; json?: AnyRecord; text: string }> {
  const r = await fetch(`${DESK()}${path}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}`, orgId: ORG_ID() },
  });
  const text = await r.text();
  let json: AnyRecord | undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    /* no JSON */
  }
  return { status: r.status, json, text };
}

// ---------------------------------------------------------------------------
// Normalización (mismo formato que usa el dashboard)
// ---------------------------------------------------------------------------
const clean = (v: any): string => {
  const s = v === null || v === undefined ? "" : String(v).trim();
  return s === "-" || s.toLowerCase() === "null" ? "" : s;
};

/** Convierte duraciones de Zoho ("3d 23h", "1w 0d", "1mos 2w", "00:04:00", "05:47 hrs") a minutos. */
export function durationToMinutes(v: any): number | "" {
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
    const unit = m[2];
    total += unit.startsWith("mo") ? n * 30 * 1440 : unit === "w" ? n * 7 * 1440 : unit === "d" ? n * 1440 : unit === "h" ? n * 60 : n;
  }
  if (matched) return Math.round(total);
  const n = Number(s);
  return isNaN(n) ? "" : n;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  ene: "01", abr: "04", ago: "08", dic: "12",
};
const pad = (n: number | string) => String(n).padStart(2, "0");

/** Fechas de Zoho ("21 Aug 2026 04:27 PM", "2026-08-24 15:14:57.0", ISO) → "YYYY-MM-DD HH:mm:ss" hora Bogotá. */
export function normalizeDate(v: any): string {
  const s = clean(v);
  if (!s) return "";
  const a = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?/);
  if (a) {
    let h = Number(a[4]);
    const ap = (a[7] || "").toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    const mon = MONTHS[a[2].toLowerCase()] || "01";
    return `${a[3]}-${mon}-${pad(a[1])} ${pad(h)}:${a[5]}:${a[6] || "00"}`;
  }
  const b = s.match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (b) return `${b[1]}-${b[2]}-${b[3]} ${b[4]}:${b[5]}:${b[6] || "00"}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      }).formatToParts(d).map(p => [p.type, p.value])
    );
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}:${parts.second}`;
  }
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

function buildRecord(src: {
  zohoId: string; ticketNumber: string; account: string; classification: string; owner: string;
  subject: string; priority: string; status: string; created: string; closed: string; timeSpent: any;
  engineer: string; sla: string; agentResponded: string; firstResp: any; totalResp: any; responses: any; dueDate: string;
}) {
  const timeSpentMin = durationToMinutes(src.timeSpent);
  return {
    "Nombre de Cuenta": clean(src.account) || "Sin Cuenta",
    "Clasificaciones": clean(src.classification) || "Sin Clasificación",
    "Propietario de Ticket": clean(src.owner) || "Sin Propietario",
    "ID de Ticket": clean(src.ticketNumber),
    "Asunto": clean(src.subject) || "Sin Asunto",
    "Categoria (Ticket)": clean(src.classification) || "Sin Clasificación",
    "Prioridad (Ticket)": clean(src.priority) || "Sin Prioridad",
    "Estado (Ticket)": clean(src.status) || "Sin Estado",
    "Hora de creación (Ticket)": normalizeDate(src.created),
    "Ticket Tiempo terminado": normalizeDate(src.closed),
    // Horas decimales (el informe lo entrega como hh:mm:ss)
    "Tiempo total empleado": timeSpentMin === "" ? "" : Math.round((timeSpentMin / 60) * 100) / 100,
    "Ingeniero de soporte asignado": clean(src.engineer) || "No Asignado",
    "Tipo de vulneración del SLA": normalizeSla(src.sla),
    "Tiempo de respuesta del agente": normalizeDate(src.agentResponded),
    "Tiempo de primera respuesta en horario laboral": durationToMinutes(src.firstResp),
    "Tiempo total de respuesta en horario laboral": durationToMinutes(src.totalResp),
    "Número de respuestas": Number(clean(src.responses)) || 0,
    "Hora de responder": normalizeDate(src.dueDate),
    zohoId: clean(src.zohoId),
  };
}

// ---------------------------------------------------------------------------
// Modo 1: exportar el informe guardado
// ---------------------------------------------------------------------------
async function fromSavedReport(token: string) {
  const base = `/api/v1/reports/${REPORT_ID()}/export?orgId=${ORG_ID()}&includeDetails=true&from=0&limit=2000&format=`;
  const rj = await desk(base + "json", token);
  if (rj.status !== 200 || !rj.json?.reportData) return null;

  const records: AnyRecord[] = [];
  const walk = (groups: AnyRecord[] | null | undefined) => {
    for (const g of groups || []) {
      if (Array.isArray(g.records)) records.push(...g.records);
      if (g.subGroup) walk(g.subGroup);
    }
  };
  walk(rj.json.reportData.dataPoints);
  if (Array.isArray(rj.json.reportData.records)) records.push(...rj.json.reportData.records);

  // Detalle de cada ticket con la API de Zoho Desk (ID interno para el enlace + datos adicionales)
  const details = await fetchTicketDetails(
    records.map(r => clean(r.tickets_ticketNumber)).filter(Boolean),
    token
  );

  return records.map(r => enrich(
    buildRecord({
      zohoId: details[clean(r.tickets_ticketNumber)]?.id || "",
      ticketNumber: r.tickets_ticketNumber,
      account: r.accounts_accountName,
      classification: r.tickets_classification,
      owner: r.tickets_assigneeId,
      subject: r.tickets_subject,
      priority: r.tickets_priority,
      status: r.tickets_status,
      created: r.tickets_createdTime,
      closed: r.tickets_closedTime,
      timeSpent: r.tickets_totalTimeSpent,
      engineer: r.tickets_cf_ingeniero_asignado,
      sla: r.tickets_slaViolationType,
      agentResponded: r.tickets_agentRespondedTime,
      firstResp: r.tickets_firstResponseTimeInBusinessHours,
      totalResp: r.tickets_totalResponseTimeInBusinessHours,
      responses: r.tickets_numberOfResponses,
      dueDate: r.tickets_responseDueDate,
    }),
    details[clean(r.tickets_ticketNumber)]
  ));
}

/** Trae el ticket completo (API de tickets) para cada número, en lotes de 50. */
async function fetchTicketDetails(numbers: string[], token: string): Promise<Record<string, AnyRecord>> {
  const out: Record<string, AnyRecord> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < numbers.length; i += 50) chunks.push(numbers.slice(i, i + 50));
  await mapLimit(chunks, 4, async chunk => {
    const r = await desk(`/api/v1/tickets/search?ticketNumber=${chunk.join(",")}&limit=100`, token).catch(() => null);
    for (const t of r?.json?.data || []) out[String(t.ticketNumber)] = t;
  });
  return out;
}

/** Completa el registro del informe con datos del ticket de la API de Zoho Desk. */
function enrich(rec: AnyRecord, t: AnyRecord | undefined) {
  if (!t) return rec;
  if (!rec.zohoId && t.id) rec.zohoId = String(t.id);
  if (rec["Nombre de Cuenta"] === "Sin Cuenta" && t.contact?.account?.accountName) rec["Nombre de Cuenta"] = t.contact.account.accountName;
  if (rec["Prioridad (Ticket)"] === "Sin Prioridad" && clean(t.priority)) rec["Prioridad (Ticket)"] = clean(t.priority);
  if (rec["Clasificaciones"] === "Sin Clasificación" && clean(t.classification)) {
    rec["Clasificaciones"] = rec["Categoria (Ticket)"] = clean(t.classification);
  }
  if (rec["Ingeniero de soporte asignado"] === "No Asignado" && clean(t.cf?.cf_ingeniero_asignado)) {
    rec["Ingeniero de soporte asignado"] = clean(t.cf.cf_ingeniero_asignado);
  }
  if (clean(t.status)) rec["Estado (Ticket)"] = clean(t.status); // estado actual en tiempo real
  const contact = t.contact ? [t.contact.firstName, t.contact.lastName].filter(Boolean).join(" ") : "";
  rec["Contacto"] = contact;
  rec["Correo del contacto"] = clean(t.email || t.contact?.email);
  rec["Canal"] = clean(t.channel);
  rec["Última actividad"] = normalizeDate(t.modifiedTime);
  rec["Última respuesta del cliente"] = normalizeDate(t.customerResponseTime);
  const dir = t.lastThread?.direction;
  rec["Último mensaje de"] = dir === "in" ? "Cliente" : dir === "out" ? "Agente" : "";
  rec["Fecha de vencimiento"] = normalizeDate(t.dueDate);
  rec["Vencido"] = Boolean(t.isOverDue);
  rec["Número de hilos"] = Number(t.threadCount) || 0;
  return rec;
}

// ---------------------------------------------------------------------------
// Modo 2: reconstruir el informe con la API de tickets
// ---------------------------------------------------------------------------
function last12MonthsRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1, 5, 0, 0)); // 00:00 Bogotá
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 4, 59, 59)); // fin de mes Bogotá
  return `${start.toISOString()},${end.toISOString()}`;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

async function fromTicketsApi(token: string) {
  const assignees = env("ZOHO_ASSIGNEE_IDS", DEFAULT_ASSIGNEES);
  const range = last12MonthsRange();
  const tickets: AnyRecord[] = [];
  for (let from = 0; from < 5000; from += 100) {
    const r = await desk(
      `/api/v1/tickets/search?assigneeId=${assignees}&createdTimeRange=${encodeURIComponent(range)}&limit=100&from=${from}&sortBy=-createdTime`,
      token
    );
    if (r.status === 204) break;
    if (r.status !== 200) throw new HttpError(502, `Zoho respondió ${r.status} al buscar tickets: ${r.text.slice(0, 200)}`);
    const data: AnyRecord[] = r.json?.data || [];
    tickets.push(...data);
    if (data.length < 100) break;
  }

  const open = tickets.filter(t => {
    const st = String(t.status || "").toLowerCase();
    return st !== "cerrado" && !st.includes("cierre por vencimiento");
  });

  const metrics = await mapLimit(open, 8, async t => {
    const r = await desk(`/api/v1/tickets/${t.id}/metrics`, token).catch(() => null);
    return r?.json || {};
  });

  return open.map((t, i) => enrich(buildRecordFromTicket(t, metrics[i] || {}), t));
}

function buildRecordFromTicket(t: AnyRecord, m: AnyRecord) {
  {
    const owner = t.assignee ? [t.assignee.firstName, t.assignee.lastName].filter(Boolean).join(" ") : "";
    return buildRecord({
      zohoId: String(t.id),
      ticketNumber: t.ticketNumber,
      account: t.contact?.account?.accountName || "",
      classification: t.classification,
      owner,
      subject: t.subject,
      priority: t.priority,
      status: t.status,
      created: t.createdTime,
      closed: t.closedTime,
      timeSpent: "",
      engineer: t.cf?.cf_ingeniero_asignado || t.customFields?.["Ingeniero de soporte asignado"] || "",
      sla: t.isOverDue ? "Resolution Violation" : "Not Violated",
      agentResponded: "",
      firstResp: m.firstResponseTime,
      totalResp: m.totalResponseTime,
      responses: m.responseCount,
      dueDate: t.dueDate,
    });
  }
}

// ---------------------------------------------------------------------------
// Inicio de sesión con Microsoft 365: valida el token de Microsoft Entra ID
// ---------------------------------------------------------------------------
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

async function verifyMicrosoftUser(req: any): Promise<string> {
  const clientId = env("AZURE_CLIENT_ID");
  const tenant = env("AZURE_TENANT_ID", "afedf556-d8ff-48b9-875b-d191d77f4832");
  const domain = env("ALLOWED_EMAIL_DOMAIN", "ecs-la.com").toLowerCase();
  const auth = String(req.headers["authorization"] || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new HttpError(401, "Inicia sesión con tu cuenta de Microsoft 365 de ECS.");
  jwks = jwks || createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`));
  let payload: AnyRecord;
  try {
    ({ payload } = await jwtVerify(token, jwks, {
      issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
      audience: clientId,
    }));
  } catch {
    throw new HttpError(401, "La sesión de Microsoft expiró o no es válida. Vuelve a iniciar sesión.");
  }
  const email = String(payload.preferred_username || payload.email || payload.upn || "").toLowerCase();
  if (payload.tid !== tenant || !email.endsWith(`@${domain}`)) {
    throw new HttpError(403, `Solo las cuentas @${domain} pueden consultar este dashboard.`);
  }
  return email;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (env("AZURE_CLIENT_ID") && env("AUTH_DISABLED").toLowerCase() !== "true") {
      await verifyMicrosoftUser(req);
    } else {
      const requiredKey = env("DASHBOARD_ACCESS_KEY");
      if (requiredKey && req.headers["x-dashboard-key"] !== requiredKey) {
        return res.status(401).json({ error: "Clave de acceso inválida o ausente.", code: "key" });
      }
    }
    if (!env("ZOHO_CLIENT_ID") || !env("ZOHO_CLIENT_SECRET") || !env("ZOHO_REFRESH_TOKEN")) {
      return res.status(500).json({
        error: "Faltan las credenciales de Zoho (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN) en Vercel.",
      });
    }

    const token = await getAccessToken();
    let source = "report";
    let tickets = await fromSavedReport(token).catch(() => null);
    if (!tickets) {
      source = "tickets-api";
      tickets = await fromTicketsApi(token);
    }

    return res.status(200).json({
      reportName: "Reporte Semanal Soporte - Gerentes de cuenta",
      reportId: REPORT_ID(),
      source,
      fetchedAt: new Date().toISOString(),
      count: tickets.length,
      tickets,
    });
  } catch (err: any) {
    const status = err instanceof HttpError ? err.status : 500;
    return res.status(status).json({ error: err?.message || "Error desconocido al consultar Zoho Desk." });
  }
}
