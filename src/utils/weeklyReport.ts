import { TicketRecord } from "../types";
import {
  ageDays, hasSlaBreach, hoursAwaitingEcs, isClosed, isUnanswered, ownerOf, parseDate, statusOf,
} from "./ticketHelpers";

/**
 * Reporte "Registro Semanal" con la misma estructura de la hoja
 * Seguimiento_Semanal_Clientes_ECS_V_2.xlsx → 'Registro Semanal' (SharePoint · Gestión de proyectos).
 */

// ---------------------------------------------------------------------------
// Catálogo de clientes (hoja 'Clientes' / último 'Registro Semanal')
// ---------------------------------------------------------------------------
export interface CatalogClient { id: string; name: string; cell: string; manager: string; }

export const CLIENT_CATALOG: CatalogClient[] = [
  { id: "CLI-001", name: "Banco Azteca de Panamá", cell: "Célula 1", manager: "Daniela Espitia" },
  { id: "CLI-001", name: "Banco Azteca de Panamá", cell: "Cobro Digital", manager: "Martha Hoyos" },
  { id: "CLI-002", name: "Microserfin", cell: "Célula 1", manager: "Daniela Espitia" },
  { id: "CLI-003", name: "Confirmeza S.A.S.", cell: "Célula 1", manager: "Daniela Espitia" },
  { id: "CLI-004", name: "Promedico", cell: "Célula 2", manager: "William Vásquez" },
  { id: "CLI-005", name: "Kala Colombia S.A.S.", cell: "Célula 1", manager: "Harold Vargas" },
  { id: "CLI-006", name: "Banco Guayaquil S.A.", cell: "Célula 2", manager: "William Vásquez" },
  { id: "CLI-007", name: "Banco Guayaquil S.A. - Evabot", cell: "Cobro Digital", manager: "Martha Hoyos" },
  { id: "CLI-008", name: "Caja Trujillo", cell: "Célula 2", manager: "Roberto Bustamante" },
  { id: "CLI-009", name: "Redeban S.A.", cell: "Célula 2", manager: "Diana Uribe" },
  { id: "CLI-010", name: "Coop Médica del Valle (CoomevaMP)", cell: "Célula 2", manager: "Diana Uribe" },
  { id: "CLI-011", name: "Derconsult Cia Ltda. - Dialer", cell: "", manager: "" },
  { id: "CLI-012", name: "Derconsult Cia Ltda.", cell: "", manager: "" },
  { id: "CLI-013", name: "Banco Machala S.A. - Evabot", cell: "Cobro Digital", manager: "Martha Hoyos" },
  { id: "CLI-014", name: "Banco Machala S.A.", cell: "Célula 2", manager: "Diana Uribe" },
  { id: "CLI-015", name: "Cooprogreso", cell: "Célula 2", manager: "Diana Uribe" },
  { id: "CLI-016", name: "Banco General de Rumiñahui", cell: "Célula 1", manager: "Luis E. Osorio" },
  { id: "CLI-017", name: "Banco Coomeva S.A.", cell: "Célula 2", manager: "Diana Uribe" },
  { id: "CLI-018", name: "Banco Promerica El Salvador", cell: "Célula 1", manager: "Luis E. Osorio" },
  { id: "CLI-019", name: "Sudameris Bank S.A.", cell: "Célula 1", manager: "Daniela Espitia" },
  { id: "CLI-020", name: "Banco Santander S.A.", cell: "Célula 1", manager: "Harold Vargas" },
  { id: "CLI-021", name: "Banco Promerica GT", cell: "", manager: "" },
  { id: "CLI-022", name: "UT Icetex", cell: "Célula 2", manager: "Diana Uribe" },
  { id: "CLI-023", name: "Fecoomeva", cell: "Célula 2", manager: "Diana Uribe" },
  { id: "CLI-024", name: "Credibanco S.A.", cell: "Cobro Digital", manager: "Martha Hoyos" },
  { id: "CLI-025", name: "Ban100", cell: "Célula 2", manager: "William Vásquez" },
  { id: "CLI-026", name: "Adecco Colombia S.A.", cell: "Célula 2", manager: "Diana Uribe" },
  { id: "CLI-027", name: "Cooperativa Elga Limitada", cell: "Célula 1", manager: "Luis E. Osorio" },
  { id: "CLI-029", name: "Banco W - Soporte", cell: "Célula 1", manager: "Harold Vargas" },
  { id: "CLI-030", name: "Banco Improsa S.A.", cell: "Célula 1", manager: "Luis E. Osorio" },
  { id: "CLI-031", name: "Positiva Compañía de Seguros", cell: "Célula 1", manager: "Harold Vargas" },
  { id: "CLI-032", name: "Interdinco S.A.", cell: "Célula 1", manager: "Luis E. Osorio" },
  { id: "CLI-033", name: "Credivalores - Crediservicios S.A.", cell: "Célula 2", manager: "William Vásquez" },
  { id: "CLI-034", name: "Crezcamos S.A. Compañía de Financiamiento", cell: "Célula 1", manager: "Daniela Espitia" },
  { id: "CLI-035", name: "Banco Popular y de Desarrollo Comunal", cell: "Célula 2", manager: "William Vásquez" },
  { id: "CLI-036", name: "Coomeva Mp.", cell: "Célula 2", manager: "Diana Uribe" },
  { id: "CLI-037", name: "Teléfonos de Mexico S.A.B. de C.V.", cell: "Célula 1", manager: "Harold Vargas" },
  { id: "CLI-038", name: "Coprocenva Cooperativa de Ahorro y Crédito", cell: "Célula 2", manager: "Diana Uribe" },
  { id: "CLI-039", name: "Banco Abank  S.A.", cell: "Célula 1", manager: "Daniela Espitia" },
  { id: "CLI-041", name: "Banco Agromercantil de Guatemala S.A.", cell: "Célula 2", manager: "William Vásquez" },
  { id: "CLI-043", name: "Banco Bolivariano", cell: "Célula 1", manager: "Daniela Espitia" },
  { id: "CLI-044", name: "Banco Bolivariano - Cobro digital", cell: "Cobro Digital", manager: "Martha Hoyos" },
  { id: "CLI-045", name: "Banco Gnb Perú S.A.", cell: "Célula 2", manager: "Roberto Bustamante" },
  { id: "CLI-046", name: "Banco Hipotecario El SV", cell: "Célula 1", manager: "Luis E. Osorio" },
  { id: "CLI-047", name: "Banco Gnb Sudameris S.A.", cell: "Célula 1", manager: "Harold Vargas" },
  { id: "CLI-048", name: "Banco de Finanzas S.A.", cell: "Célula 2", manager: "William Vásquez" },
  { id: "CLI-049", name: "Banco G&T Continental", cell: "Célula 1", manager: "Gerencia de Proyectos" },
  { id: "CLI-050", name: "Banco de Los Trabajadores", cell: "Célula 1", manager: "Harold Vargas" },
  { id: "CLI-051", name: "Banco de Los Trabajadores - Evabot", cell: "Cobro Digital", manager: "Martha Hoyos" },
  { id: "CLI-052", name: "Data Tools S.A.S.", cell: "Proyectos", manager: "Gerencia de Proyectos" },
  { id: "CLI-053", name: "Data Tools S.A.S. - Evabot", cell: "Cobro Digital", manager: "Martha Hoyos" },
  { id: "CLI-054", name: "Financiera FDL S.A.", cell: "Célula 1", manager: "Harold Vargas" },
  { id: "CLI-055", name: "Recuperadora Invercom", cell: "Célula 1", manager: "Luis E. Osorio" },
  { id: "CLI-057", name: "Vision F Mexico S.A.", cell: "Célula 2", manager: "Diana Uribe" },
  { id: "CLI-059", name: "AlfinBanco", cell: "Célula 2", manager: "Roberto Bustamante" },
  { id: "CLI-060", name: "Banco de Comercio", cell: "Célula 2", manager: "Roberto Bustamante" },
  { id: "CLI-061", name: "Banco Pichincha", cell: "Célula 2", manager: "Roberto Bustamante" },
  { id: "CLI-062", name: "Caja Cusco", cell: "Célula 2", manager: "Roberto Bustamante" },
  { id: "CLI-063", name: "Compartamos Banco", cell: "Célula 2", manager: "Roberto Bustamante" },
  { id: "CLI-064", name: "Cooperativa Pacifico", cell: "Célula 2", manager: "Roberto Bustamante" },
  { id: "CLI-065", name: "Derrama Magisterial", cell: "Célula 2", manager: "Roberto Bustamante" },
  { id: "CLI-066", name: "Efectibank", cell: "Célula 2", manager: "Roberto Bustamante" },
  { id: "CLI-067", name: "Estudio Muñiz", cell: "Célula 2", manager: "Roberto Bustamante" },
  { id: "CLI-068", name: "Renaware", cell: "Célula 1", manager: "Luis E. Osorio" },
  { id: "CLI-069", name: "Coomeva mocir", cell: "Célula 1", manager: "Daniela Espitia" },
  { id: "CLI-070", name: "Vision F Mexico S.A. - Evabot", cell: "Cobro Digital", manager: "Martha Hoyos" },
  { id: "CLI-071", name: "GNB Paraguay", cell: "Célula 2", manager: "Roberto Bustamante" },
  { id: "CLI-072", name: "Banco Promerica El Salvador - Evabot", cell: "Cobro Digital", manager: "Martha Hoyos" },
  { id: "CLI-073", name: "Banco Promerica GT - Evabot", cell: "Cobro Digital", manager: "Martha Hoyos" },
];

// ---------------------------------------------------------------------------
// Emparejar la cuenta de Zoho con el cliente del catálogo
// ---------------------------------------------------------------------------
const STOP = new Set(["s", "a", "sa", "sas", "de", "del", "la", "las", "los", "y", "cia", "ltda", "limitada", "c", "v", "b", "cv", "sab", "the"]);
const SPECIAL = ["evabot", "dialer", "cobro digital"];

export function normName(s: string): string {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9&]+/g, " ").split(" ").filter(w => w && !STOP.has(w)).join(" ");
}
const specialOf = (s: string) => SPECIAL.find(k => s.toLowerCase().includes(k)) || "";

/** Devuelve el índice del catálogo para una cuenta de Zoho (o -1). Si hay varias filas
 *  del mismo cliente, prefiere la del gerente que es propietario del ticket. */
export function matchCatalog(account: string, owner = ""): number {
  const a = normName(account.replace(/\s*-\s*(soporte)$/i, ""));
  if (!a) return -1;
  const sp = specialOf(account);
  const a2 = normName(account.replace(/\s*-\s*(evabot|dialer|cobro digital|soporte)$/i, ""));
  const aWords = new Set(a2.split(" "));
  const scored: { i: number; score: number }[] = [];
  CLIENT_CATALOG.forEach((c, i) => {
    if (specialOf(c.name) !== sp) return;
    const n = normName(c.name.replace(/\s*-\s*(evabot|dialer|cobro digital|soporte)$/i, ""));
    const nWords = n.split(" ");
    let score = 0;
    if (n === a2) score = 1000;
    else if (n.length >= 4 && (a2.includes(n) || n.includes(a2))) score = 500 + n.length;
    // Todas las palabras del catálogo están en la cuenta (p. ej. "Caja Trujillo" ⊂ "Caja Municipal Trujillo")
    else if (nWords.length >= 2 && nWords.every(w => aWords.has(w))) score = 100 + nWords.length;
    if (score) scored.push({ i, score });
  });
  if (!scored.length) return -1;
  const best = Math.max(...scored.map(x => x.score));
  const candidates = scored.filter(x => x.score === best).map(x => x.i);
  const o = normName(owner);
  return candidates.find(i => o && normName(CLIENT_CATALOG[i].manager) === o) ?? candidates[0];
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------
export function mondayOf(d: Date): Date {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}
/** "2026-S41" (semana ISO, igual que la fórmula de la hoja) */
export function isoWeekLabel(monday: Date): string {
  const d = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = d.getUTCFullYear();
  const wk = Math.ceil(((d.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-S${String(wk).padStart(2, "0")}`;
}
/** Número de serie de Excel (para la columna Clave: CLI-001|46300) */
export const excelSerial = (d: Date) =>
  Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
/** Fecha sin hora para Excel (medianoche UTC = misma fecha en cualquier zona horaria). */
const xlDate = (d: Date | null) => (d ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) : null);

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ---------------------------------------------------------------------------
// Cálculo de las filas
// ---------------------------------------------------------------------------
/** Conteos de la semana que entrega /api/zoho-report?week= (incluye tickets ya cerrados). */
export interface WeekCount { account: string; owner: string; reported: number; closed: number; closedPrev?: number; }

export interface WeeklyRow {
  week: Date; weekLabel: string; id: string; client: string; cell: string; manager: string;
  criticality: string; justification: string; churn: string; satisfaction: number | null;
  lastReview: Date | null; nextReview: Date | null; accounts: number | null; users: number | null;
  reported: number | null; closed: number | null; open: number; pending: number; pendingOverdue: number;
  lastEvent: Date | null; oldestDays: number | null; delta: number | null; alert: string; notes: string; key: string;
}

const WAITING = ["pendiente", "esperando", "validación", "validacion"];
/** Pendiente = abierto y a la espera de una acción: de ECS (sin respuesta o el cliente escribió de último)
 *  o del cliente (estados «Esperando…», «Pendiente», «En validación cliente»). */
export const isPending = (t: TicketRecord) =>
  !isClosed(t) && (isUnanswered(t) || hoursAwaitingEcs(t) !== null || WAITING.some(w => statusOf(t).toLowerCase().includes(w)));
export const isPendingOverdue = (t: TicketRecord) => isPending(t) && (t["Vencido"] === true || hasSlaBreach(t));

export function buildWeeklyRows(tickets: TicketRecord[], monday: Date, weekCounts: WeekCount[] | null): WeeklyRow[] {
  const start = mondayOf(monday);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const label = isoWeekLabel(start);
  const serial = excelSerial(start);

  type Acc = {
    idx: number; account: string; names: Map<string, number>; owners: Map<string, number>; tickets: TicketRecord[];
    api: boolean; reported: number; closed: number; closedPrev: number;
  };
  const groups = new Map<string, Acc>();
  // Una sola fila por cliente («Nombre de Cuenta» de Zoho / del archivo cargado). Variantes del mismo
  // nombre (mayúsculas, acentos, espacios, "S.A." vs "SA") se unen en una fila.
  const get = (accountRaw: string, owner: string) => {
    const account = (accountRaw || "").replace(/\s+/g, " ").trim() || "Sin Cuenta";
    const key = normName(account) || account.toLowerCase();
    if (!groups.has(key)) groups.set(key, { idx: -1, account, names: new Map(), owners: new Map(), tickets: [], api: false, reported: 0, closed: 0, closedPrev: 0 });
    const g = groups.get(key)!;
    g.names.set(account, (g.names.get(account) || 0) + 1);
    if (owner) g.owners.set(owner, (g.owners.get(owner) || 0) + 1);
    return g;
  };

  tickets.forEach(t => get(t["Nombre de Cuenta"] || "Sin Cuenta", ownerOf(t)).tickets.push(t));
  if (weekCounts) {
    // Conteos de Zoho Desk para la semana (incluyen tickets ya cerrados)
    weekCounts.forEach(c => {
      const g = get(c.account || "Sin Cuenta", c.owner);
      g.api = true;
      g.reported += c.reported; g.closed += c.closed; g.closedPrev += c.closedPrev || 0;
    });
  }

  // Nombre mostrado = la forma más usada en Zoho para esa cuenta
  groups.forEach(g => { g.account = [...g.names.entries()].sort((a, b) => b[1] - a[1])[0][0]; });

  const rowFor = (g: Acc): WeeklyRow => {
    const topOwnerName = [...g.owners.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    const catIdx = matchCatalog(g.account, topOwnerName);
    const cat = catIdx >= 0 ? CLIENT_CATALOG[catIdx] : null;
    const list = g.tickets;
    const open = list.filter(t => !isClosed(t));
    const createdOf = (t: TicketRecord) => parseDate(t["Hora de creación (Ticket)"]);
    const inWeek = (d: Date | null) => !!d && d >= start && d < end;
    // Con los datos cargados (si traen tickets cerrados con su «Ticket Tiempo terminado»)
    const closedInWeek = list.filter(t => isClosed(t) && inWeek(parseDate(t["Ticket Tiempo terminado"]) || parseDate(t["Última actividad"])));
    const dataReported = list.filter(t => inWeek(createdOf(t))).length;
    const dataClosedPrev = closedInWeek.filter(t => { const c = createdOf(t); return !!c && c < start; }).length;
    const reported = g.api ? g.reported : dataReported;
    const closed = g.api ? g.closed : closedInWeek.length;
    const closedPrev = g.api ? g.closedPrev : dataClosedPrev;
    // Abiertos al cierre de la semana anterior = abiertos hoy creados antes del lunes + cerrados esta semana creados antes del lunes
    // ⇒ Δ = abiertos hoy − abiertos semana anterior = (abiertos creados esta semana) − (cerrados esta semana creados antes del lunes)
    const openCreatedThisWeek = open.filter(t => inWeek(createdOf(t))).length;
    const delta = openCreatedThisWeek - closedPrev;
    const pending = open.filter(isPending);
    const overdue = pending.filter(isPendingOverdue);
    const events = list.flatMap(t => [t["Última actividad"], t["Última respuesta del cliente"], t["Hora de creación (Ticket)"]])
      .map(s => parseDate(s || "")).filter((d): d is Date => !!d && d < end);
    const ages = open.map(t => ageDays(t)).filter((n): n is number => n !== null);
    const topOwner = topOwnerName;
    const id = cat?.id || "";
    return {
      week: start, weekLabel: label, id,
      client: g.account, // igual al «Nombre de Cuenta» de Zoho
      cell: cat?.cell || "", manager: cat?.manager || topOwner,
      criticality: "", justification: "", churn: "", satisfaction: null, lastReview: null, nextReview: null,
      accounts: null, users: null,
      reported,
      closed,
      open: open.length, pending: pending.length, pendingOverdue: overdue.length,
      lastEvent: events.length ? new Date(Math.max(...events.map(d => d.getTime()))) : null,
      oldestDays: ages.length ? Math.floor(Math.max(...ages)) : null,
      delta,
      alert: overdue.length > 0 ? "Tickets vencidos" : "OK",
      notes: cat ? "" : "Cuenta de Zoho sin ID en el catálogo de clientes",
      key: id ? `${id}|${serial}` : "",
    };
  };

  return [...groups.values()]
    .map(rowFor)
    .sort((a, b) => a.client.localeCompare(b.client, "es"));
}

// ---------------------------------------------------------------------------
// Exportación a Excel con la estructura de 'Registro Semanal'
// ---------------------------------------------------------------------------
export const HEADERS = [
  "Cliente", "Célula de soporte", "Gerente de cuenta",
  "Tickets reportados en la semana", "Tickets cerrados en la semana", "Tickets abiertos", "Tickets pendientes",
  "Tickets pendientes vencidos", "Fecha último evento registrado", "Días de atraso ticket más antiguo",
  "Δ Tickets abiertos vs. semana anterior",
];
const WIDTHS = [36, 15, 20, 13, 13, 11, 11, 13, 14, 13, 14];
/** Columnas de cálculo automático (gris): Cliente y Δ */
const CALC_COLS = new Set([1, 11]);

export async function exportWeeklyReport(rows: WeeklyRow[], fileName: string) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Dashboard de Monitoreo de Soporte - ECS";
  const ws = wb.addWorksheet("Registro Semanal", { views: [{ state: "frozen", xSplit: 1, ySplit: 5 }] });

  const NAVY = "FF1E3A5F", YELLOW = "FFFFF2CC", GRAY = "FFE7E6E6", BLUE_TXT = "FF0000FF";
  const thin = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const week = rows[0]?.week || mondayOf(new Date());
  const wy = week.getFullYear(), wm = week.getMonth() + 1, wd = week.getDate();
  const weekText = `${String(wd).padStart(2, "0")}/${String(wm).padStart(2, "0")}/${wy}`;

  ws.getCell("A1").value = `REGISTRO SEMANAL POR CLIENTE — Semana del ${weekText} (${isoWeekLabel(week)})`;
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: NAVY } };
  ws.getCell("A2").value = "Una fila por cliente. Amarillo/azul = diligenciar; gris = cálculo automático.";
  ws.getCell("A2").font = { italic: true, size: 9, color: { argb: "FF595959" } };
  ws.getCell("A3").value = "Cliente = «Nombre de Cuenta» en Zoho Desk. Tickets calculados con los datos de Zoho Desk / archivo cargado en el dashboard.";
  ws.getCell("A3").font = { italic: true, size: 9, color: { argb: "FF595959" } };
  ws.mergeCells("A1:K1"); ws.mergeCells("A2:K2"); ws.mergeCells("A3:K3");

  const header = ws.getRow(5);
  HEADERS.forEach((h, i) => {
    const c = header.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
    c.border = border;
  });
  header.height = 45;
  WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const first = 6, last = first + rows.length - 1;
  const num = '#,##0;-#,##0;"-"';
  rows.forEach((r, i) => {
    const n = first + i;
    const row = ws.getRow(n);
    const vals: any[] = [
      r.client || null, r.cell || null, r.manager || null,
      r.reported, r.closed, r.open, r.pending, r.pendingOverdue,
      xlDate(r.lastEvent), r.oldestDays,
      r.delta,
    ];
    vals.forEach((v, j) => {
      const c = row.getCell(j + 1);
      c.value = v;
      c.border = border;
      c.font = { size: 10, color: { argb: CALC_COLS.has(j + 1) ? "FF000000" : BLUE_TXT } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CALC_COLS.has(j + 1) ? GRAY : YELLOW } };
      c.alignment = { vertical: "top" };
    });
    row.getCell(9).numFmt = "dd/mm/yyyy";
    [4, 5, 6, 7, 8, 10].forEach(col => { row.getCell(col).numFmt = num; });
    // Δ: rojo = subió, verde = bajó (igual que la hoja original)
    row.getCell(11).numFmt = '+#,##0;-#,##0;0';
    if (r.delta) row.getCell(11).font = { size: 10, bold: true, color: { argb: r.delta > 0 ? "FFC00000" : "FF00B050" } };
  });

  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: Math.max(last, 5), column: HEADERS.length } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
