export interface TicketRecord {
  "Nombre de Cuenta": string;
  "Clasificaciones": string;
  "Propietario de Ticket": string;
  "ID de Ticket": string;
  "Asunto": string;
  "Categoria (Ticket)": string;
  "Prioridad (Ticket)": string; // Crítica, Alta, Media, Baja
  "Estado (Ticket)": string; // Abierto, En Progreso, Pendiente, Cerrado
  "Hora de creación (Ticket)": string; // ISO string or human-readable date
  "Ticket Tiempo terminado": string; // ISO string or human-readable date, or empty/null
  "Tiempo total empleado": string | number; // Total time spent (e.g. in hours or minutes)
  "Ingeniero de soporte asignado": string;
  "Tipo de vulneración del SLA": string; // Ninguna, Tiempo de Respuesta Excedido, etc.
  "Tiempo de respuesta del agente": string | number; // in minutes
  "Tiempo de primera respuesta en horario laboral": string | number; // in minutes (CRITICAL column for ordering!)
  "Tiempo total de respuesta en horario laboral": string | number; // in minutes
  "Número de respuestas": string | number;
  "Hora de responder": string;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  subText: string;
  trend?: {
    type: 'up' | 'down' | 'neutral';
    text: string;
  };
  colorClass: string;
}
