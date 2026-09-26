import { TicketRecord } from "../types";
import {
  accountOf, ageBucketOf, classificationOf, inactivityBucketOf, isClosed, lastFromOf, isCriticalOrHigh, hasSlaBreach,
  isUnanswered, ownerOf, priorityOf, statusOf, weekOf,
} from "./ticketHelpers";

export type Dimension =
  | "status" | "owner" | "account" | "priority" | "classification" | "age" | "sla" | "week"
  | "engineer" | "inactivity" | "lastFrom" | "overdue" | "slaBreach" | "unanswered" | "criticalUnanswered" | "open" | "all";

export interface Criterion {
  dimension: Dimension;
  value?: string;
}

/** Una selección hecha al hacer clic en una gráfica. Se guarda el criterio (no la lista de tickets)
 *  para que el detalle se recalcule siempre sobre los datos filtrados por propietario. */
export interface Selection {
  title: string;
  subtitle?: string;
  criteria: Criterion[];
}

export const DIMENSION_LABEL: Record<Dimension, string> = {
  status: "Estado",
  owner: "Propietario",
  account: "Cliente",
  priority: "Prioridad",
  classification: "Clasificación",
  age: "Antigüedad",
  sla: "SLA",
  week: "Semana de creación",
  engineer: "Ingeniero asignado",
  inactivity: "Días sin actividad",
  lastFrom: "Último mensaje",
  overdue: "Vencidos",
  slaBreach: "Con vulneración de SLA",
  unanswered: "Sin primera respuesta",
  criticalUnanswered: "Críticos/altos sin respuesta",
  open: "Abiertos",
  all: "Todos",
};

function matches(t: TicketRecord, c: Criterion): boolean {
  switch (c.dimension) {
    case "status": return statusOf(t) === c.value;
    case "owner": return ownerOf(t) === c.value;
    case "account": return accountOf(t) === c.value;
    case "priority": return priorityOf(t) === c.value;
    case "classification": return classificationOf(t) === c.value;
    case "age": return !isClosed(t) && ageBucketOf(t) === c.value;
    case "sla": return (t["Tipo de vulneración del SLA"] || "Ninguna") === c.value;
    case "week": return weekOf(t) === c.value;
    case "engineer": return (t["Ingeniero de soporte asignado"] || "No Asignado") === c.value;
    case "inactivity": return !isClosed(t) && inactivityBucketOf(t) === c.value;
    case "lastFrom": return !isClosed(t) && lastFromOf(t) === c.value;
    case "slaBreach": return hasSlaBreach(t);
    case "overdue": return !isClosed(t) && t["Vencido"] === true;
    case "unanswered": return !isClosed(t) && isUnanswered(t);
    case "criticalUnanswered": return !isClosed(t) && isUnanswered(t) && isCriticalOrHigh(t);
    case "open": return !isClosed(t);
    case "all": return true;
    default: return true;
  }
}

export function applySelection(tickets: TicketRecord[], sel: Selection | null): TicketRecord[] {
  if (!sel) return [];
  return tickets.filter(t => sel.criteria.every(c => matches(t, c)));
}

