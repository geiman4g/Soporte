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

// type definition for optional records
type AnyRecord = Record<string, any>;

/** Lee una variable de entorno quitando espacios, saltos de línea y comillas que a veces se pegan por error en Vercel.
 *  Si la variable está vacía se usa el valor por defecto. */
/** Nombres alternativos que a veces se usan al crear las variables (p. ej. con prefijo VITE_). */
const ENV_ALIASES: Record<string, string[]> = {
  ZOHO_CLIENT_ID: ["VITE_ZOHO_CLIENT_ID", "ZOHO_CLIENTID", "ZOHO_CLIENT"],
  ZOHO_CLIENT_SECRET: ["VITE_ZOHO_CLIENT_SECRET", "ZOHO_CLIENTSECRET", "ZOHO_SECRET"],
  ZOHO_REFRESH_TOKEN: ["VITE_ZOHO_REFRESH_TOKEN", "ZOHO_REFRESHTOKEN", "ZOHO_TOKEN"],
};

/** Busca la variable sin importar mayúsculas/minúsculas ni espacios en el nombre. */
function rawEnv(k: string): string | undefined {
  for (const name of [k, ...(ENV_ALIASES[k] || [])]) {
    if (process.env[name] !== undefined && String(process.env[name]).trim() !== "") return process.env[name];
    const found = Object.keys(process.env).find(e => e.trim().toUpperCase() === name);
    if (found && String(process.env[found]).trim() !== "") return process.env[found];
  }
  return undefined;
}

const env = (k: string, d = "") => {
  const v = String(rawEnv(k) ?? "")
    .replace(/[\r\n]/g, "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
  return v || d;
};

const DEFAULT_ORG_ID = "749634105";
const REPORT_ID = () => env("ZOHO_REPORT_ID", "601927000052419003");
const DEFAULT_ASSIGNEES =
  "601927000000179333,601927000012456045,601927000010019046,601927000000302301,601927000029805001," +
  "601927000048400324,601927000068336540,601927000000166186,601927000068414539,601927000068414521,601927000068414390";
const TZ = "America/Bogota";

// ---------------------------------------------------------------------------
// Conexión con Zoho (OAuth + centro de datos + organización)
// ---------------------------------------------------------------------------
/** Centros de datos de Zoho. Si el configurado no reconoce las credenciales, se prueban los demás. */
const DATA_CENTERS = [".com", ".eu", ".in", ".com.au", ".jp", ".ca", ".sa", ".com.cn"];
const stripSlash = (u: string) => u.replace(/\/+$/, "");
const dcOf = (url: string) => {
  const m = url.match(/zoho(\.[a-z.]+)/i);
  return m ? m[1].toLowerCase() : ".com";
};

let resolvedAccounts: string | null = null;
let resolvedDesk: string | null = null;
let resolvedOrg: string | null = null;

const ORG_ID = () => resolvedOrg || env("ZOHO_ORG_ID", DEFAULT_ORG_ID);
const DESK = () => resolvedDesk || stripSlash(env("ZOHO_DESK_URL", "https://desk.zoho.com"));

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let cachedToken: { value: string; exp: number } | null = null;
let pendingToken: Promise<string> | null = null;

function accountsCandidates(): string[] {
  const explicit = stripSlash(env("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.com"));
  const all = [resolvedAccounts, explicit, ...DATA_CENTERS.map(dc => `https://accounts.zoho${dc}`)].filter(Boolean) as string[];
  return [...new Set(all)];
}

/** Explica en español los errores que devuelve Zoho al renovar el token. */
function tokenErrorMessage(err: string, desc: string): string {
  const e = err.toLowerCase();
  if (e === "invalid_client")
    return "Zoho rechazó ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET (invalid_client). Verifica que ambos sean del mismo Self Client " +
      "de api-console.zoho.com, que estén completos y sin espacios ni comillas.";
  if (e === "invalid_code")
    return "ZOHO_REFRESH_TOKEN no es válido, expiró o fue revocado (invalid_code). Genera un código nuevo en el Self Client " +
      "y cámbialo por un refresh token (ver README).";
  if (e === "access denied" || /too many requests/i.test(desc))
    return "Zoho bloqueó temporalmente la renovación del token por demasiadas solicitudes. Espera unos minutos e intenta de nuevo.";
  return `No se pudo obtener el token de Zoho: ${err || "error desconocido"}${desc ? ` (${desc})` : ""}`;
}

async function requestToken(accounts: string) {
  const body = new URLSearchParams({
    refresh_token: env("ZOHO_REFRESH_TOKEN"),
    client_id: env("ZOHO_CLIENT_ID"),
    client_secret: env("ZOHO_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });
  const r = await fetch(`${accounts}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  });
  const j: AnyRecord = await r.json().catch(() => ({}));
  return { ok: r.ok && !!j.access_token, status: r.status, j };
}

async function refreshAccessToken(): Promise<string> {
  let firstError: { err: string; desc: string; status: number } | null = null;
  for (const accounts of accountsCandidates()) {
    let res;
    try {
      res = await requestToken(accounts);
    } catch {
      continue; // centro de datos no alcanzable; se prueba el siguiente
    }
    if (res.ok) {
      resolvedAccounts = accounts;
      // La URL de Desk debe ser del mismo centro de datos que la cuenta
      const explicitDesk = stripSlash(env("ZOHO_DESK_URL"));
      resolvedDesk = explicitDesk && dcOf(explicitDesk) === dcOf(accounts)
        ? explicitDesk
        : `https://desk.zoho${dcOf(accounts)}`;
      if (resolvedAccounts !== stripSlash(env("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.com"))) {
        console.warn(`[zoho] Credenciales válidas en ${accounts}; actualiza ZOHO_ACCOUNTS_URL y ZOHO_DESK_URL (${resolvedDesk}).`);
      }
      cachedToken = { value: res.j.access_token, exp: Date.now() + (Number(res.j.expires_in) || 3600) * 1000 };
      return cachedToken.value;
    }
    const err = String(res.j.error || "");
    const desc = String(res.j.error_description || "");
    if (!firstError) firstError = { err, desc, status: res.status };
    // Límite de solicitudes: no tiene sentido probar otros centros de datos
    if (err.toLowerCase() === "access denied" || /too many requests/i.test(desc)) break;
    // Solo estos errores pueden deberse a un centro de datos equivocado
    if (!["invalid_client", "invalid_code"].includes(err.toLowerCase())) break;
  }
  const e = firstError || { err: "sin respuesta de Zoho", desc: "", status: 502 };
  const tooMany = e.err.toLowerCase() === "access denied" || /too many requests/i.test(e.desc);
  throw new HttpError(tooMany ? 429 : 502, tokenErrorMessage(e.err, e.desc));
}

/** Token de acceso con caché; si varias consultas llegan a la vez se renueva una sola vez. */
async function getAccessToken(force = false): Promise<string> {
  if (!force && cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.value;
  if (!pendingToken) pendingToken = refreshAccessToken().finally(() => { pendingToken = null; });
  return pendingToken;
}

/** Confirma el ID de organización de Zoho Desk (si el configurado no existe para esta cuenta, usa el disponible). */
async function resolveOrgId(): Promise<string> {
  if (resolvedOrg) return resolvedOrg;
  const wanted = env("ZOHO_ORG_ID", DEFAULT_ORG_ID);
  const token = await getAccessToken();
  const r = await fetch(`${DESK()}/api/v1/organizations`, { headers: { Authorization: `Zoho-oauthtoken ${token}` } }).catch(() => null);
  if (r && (r.status === 401 || r.status === 403)) {
    const txt = await r.text().catch(() => "");
    throw new HttpError(502,
      `Zoho Desk rechazó el token (${r.status}). Revisa que el refresh token se haya generado con los alcances ` +
      `Desk.tickets.READ,Desk.search.READ,Desk.basic.READ,Desk.settings.READ. ${txt.slice(0, 150)}`);
  }
  const j: AnyRecord = r ? await r.json().catch(() => ({})) : {};
  const ids: string[] = (j.data || []).map((o: AnyRecord) => String(o.id));
  if (ids.length && !ids.includes(wanted)) {
    console.warn(`[zoho] ZOHO_ORG_ID=${wanted} no pertenece a esta cuenta; se usa ${ids[0]}.`);
    resolvedOrg = ids[0];
  } else {
    resolvedOrg = wanted;
  }
  return resolvedOrg;
}

/** Llamada a la API de Zoho Desk. Si el token venció, se renueva y se reintenta una vez. */
async function desk(path: string, _token?: string): Promise<{ status: number; json?: AnyRecord; text: string }> {
  const call = async (token: string) => fetch(`${DESK()}${path}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}`, orgId: ORG_ID() },
  });
  let r = await call(await getAccessToken());
  if (r.status === 401) {
    cachedToken = null;
    r = await call(await getAccessToken(true));
  }
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

/**
 * Conteos de una semana (lunes a domingo, hora Bogotá) por cuenta, incluidos tickets ya cerrados:
 *  - reportados: creados en la semana
 *  - cerrados: con fecha de cierre dentro de la semana
 */
async function weekCounts(mondayYmd: string) {
  const [y, mo, d] = mondayYmd.split("-").map(Number);
  const start = new Date(Date.UTC(y, mo - 1, d, 5, 0, 0)); // 00:00 Bogotá
  const end = new Date(start.getTime() + 7 * 86400000 - 1000);
  const now = new Date();
  const assignees = env("ZOHO_ASSIGNEE_IDS", DEFAULT_ASSIGNEES);

  const search = async (rangeParam: string, from: Date, to: Date) => {
    const out: AnyRecord[] = [];
    const range = encodeURIComponent(`${from.toISOString()},${to.toISOString()}`);
    for (let i = 0; i < 3000; i += 100) {
      const r = await desk(`/api/v1/tickets/search?assigneeId=${assignees}&${rangeParam}=${range}&limit=100&from=${i}`);
      if (r.status === 204) break;
      if (r.status !== 200) throw new HttpError(502, `Zoho respondió ${r.status} al consultar la semana: ${r.text.slice(0, 200)}`);
      const data: AnyRecord[] = r.json?.data || [];
      out.push(...data);
      if (data.length < 100) break;
    }
    return out;
  };

  const created = await search("createdTimeRange", start, end);
  // Un ticket cerrado en la semana tiene modificación posterior al inicio de la semana
  const modified = await search("modifiedTimeRange", start, end < now ? now : end);
  const closed = modified.filter(t => {
    const c = t.closedTime ? new Date(t.closedTime) : null;
    return c && c >= start && c <= end;
  });

  const key = (t: AnyRecord) => {
    const account = clean(t.contact?.account?.accountName) || "Sin Cuenta";
    const owner = t.assignee ? [t.assignee.firstName, t.assignee.lastName].filter(Boolean).join(" ") : "";
    return { account, owner, k: `${account}||${owner}` };
  };
  // closedPrev = cerrados en la semana que se crearon ANTES del lunes (estaban abiertos al cierre de la semana anterior)
  const map = new Map<string, { account: string; owner: string; reported: number; closed: number; closedPrev: number }>();
  const add = (t: AnyRecord, field: "reported" | "closed" | "closedPrev") => {
    const { account, owner, k } = key(t);
    if (!map.has(k)) map.set(k, { account, owner, reported: 0, closed: 0, closedPrev: 0 });
    map.get(k)![field] += 1;
  };
  const seenCreated = new Set<string>();
  created.forEach(t => { if (!seenCreated.has(t.id)) { seenCreated.add(t.id); add(t, "reported"); } });
  const seenClosed = new Set<string>();
  closed.forEach(t => {
    if (seenClosed.has(t.id)) return;
    seenClosed.add(t.id);
    add(t, "closed");
    if (t.createdTime && new Date(t.createdTime) < start) add(t, "closedPrev");
  });
  return [...map.values()];
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
let jwks: any = null;

async function verifyMicrosoftUser(req: any): Promise<string> {
  const clientId = env("AZURE_CLIENT_ID");
  const tenant = env("AZURE_TENANT_ID", "afedf556-d8ff-48b9-875b-d191d77f4832");
  const domain = env("ALLOWED_EMAIL_DOMAIN", "ecs-la.com").toLowerCase();
  const auth = String(req.headers["authorization"] || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new HttpError(401, "Inicia sesión con tu cuenta de Microsoft 365 de ECS.");
  let payload: AnyRecord;
  try {
    const { createRemoteJWKSet, jwtVerify } = (await (Function('return import("jose")')() as Promise<any>));
    jwks = jwks || createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`));
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
    const missing = ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN"].filter(k => !env(k));
    if (missing.length) {
      return res.status(500).json({
        error: `Faltan credenciales de Zoho en las variables de entorno: ${missing.join(", ")}. ` +
          "En Vercel agrégalas en Settings → Environment Variables (marca Production) y luego haz Redeploy; " +
          "en local, créalas en un archivo .env en la raíz del proyecto.",
        // Diagnóstico (solo nombres, nunca valores)
        entorno: process.env.VERCEL_ENV || (process.env.VERCEL ? "vercel" : "local"),
        variablesZohoDetectadas: Object.keys(process.env).filter(k => /zoho/i.test(k)),
      });
    }

    const token = await getAccessToken();
    const orgId = await resolveOrgId();

    // Diagnóstico de la conexión: /api/zoho-report?check=1
    const query = req.query || Object.fromEntries(new URL(req.url || "/", "http://x").searchParams);
    if (query.check) {
      return res.status(200).json({
        ok: true,
        accountsUrl: resolvedAccounts,
        deskUrl: DESK(),
        orgId,
        reportId: REPORT_ID(),
        mensaje: "Conexión con Zoho Desk correcta.",
      });
    }

    // Conteos semanales para el reporte "Registro Semanal": /api/zoho-report?week=YYYY-MM-DD (lunes)
    if (query.week) {
      const week = String(query.week);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) return res.status(400).json({ error: "Parámetro week inválido (YYYY-MM-DD)." });
      return res.status(200).json({ week, accounts: await weekCounts(week) });
    }

    let source = "report";
    let fallbackReason = "";
    let tickets = await fromSavedReport(token).catch((e: any) => {
      fallbackReason = e?.message || "error al exportar el informe";
      return null;
    });
    if (!tickets) {
      source = "tickets-api";
      if (!fallbackReason) fallbackReason = "La API de informes no devolvió datos para este token.";
      tickets = await fromTicketsApi(token);
    }

    return res.status(200).json({
      reportName: "Reporte Semanal Soporte - Gerentes de cuenta",
      reportId: REPORT_ID(),
      source,
      ...(fallbackReason ? { fallbackReason } : {}),
      fetchedAt: new Date().toISOString(),
      count: tickets.length,
      tickets,
    });
  } catch (err: any) {
    const status = err instanceof HttpError ? err.status : 500;
    console.error("[zoho-report]", err);
    return res.status(status).json({ error: err?.message || "Error desconocido al consultar Zoho Desk." });
  }
}
