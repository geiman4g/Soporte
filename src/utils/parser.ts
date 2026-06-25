import * as XLSX from "xlsx";
import { TicketRecord } from "../types";

export function parseFile(file: File): Promise<TicketRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array of objects
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

        if (!rawRows || rawRows.length === 0) {
          throw new Error("El archivo cargado no contiene datos.");
        }

        // Exact list of columns required
        const requiredColumns = [
          "Nombre de Cuenta",
          "Clasificaciones",
          "Propietario de Ticket",
          "ID de Ticket",
          "Asunto",
          "Categoria (Ticket)",
          "Prioridad (Ticket)",
          "Estado (Ticket)",
          "Hora de creación (Ticket)",
          "Ticket Tiempo terminado",
          "Tiempo total empleado",
          "Ingeniero de soporte asignado",
          "Tipo de vulneración del SLA",
          "Tiempo de respuesta del agente",
          "Tiempo de primera respuesta en horario laboral",
          "Tiempo total de respuesta en horario laboral",
          "Número de respuestas",
          "Hora de responder"
        ];

        // Check columns of the first object to see if there is any overlap
        const firstRowKeys = Object.keys(rawRows[0]);
        const missingColumns = requiredColumns.filter(col => !firstRowKeys.includes(col));

        // Let's implement an intelligent fallback mapping in case column casing or spaces vary slightly,
        // but if they are completely missing we'll raise a warning or do our best to map them.
        const mappedRecords: TicketRecord[] = rawRows.map((row, index) => {
          // Helper to get value with exact match or intelligent synonym/partial fallbacks
          const getVal = (exactKey: string): any => {
            if (row[exactKey] !== undefined) return row[exactKey];
            
            const normalizedExact = exactKey.toLowerCase().replace(/[^a-z0-9]/g, "");
            
            // Try matching normalized
            let foundKey = Object.keys(row).find(k => {
              const normK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
              return normK === normalizedExact;
            });
            if (foundKey !== undefined) return row[foundKey];

            // Specific fallback mappings for common variants
            if (exactKey === "Prioridad (Ticket)") {
              foundKey = Object.keys(row).find(k => {
                const l = k.toLowerCase();
                return l === "prioridad" || l === "priority" || l === "prio" || l.includes("prioridad");
              });
              if (foundKey !== undefined) return row[foundKey];
            }

            if (exactKey === "Estado (Ticket)") {
              foundKey = Object.keys(row).find(k => {
                const l = k.toLowerCase();
                return l === "estado" || l === "status" || l === "state" || l.includes("estado");
              });
              if (foundKey !== undefined) return row[foundKey];
            }

            if (exactKey === "Categoria (Ticket)") {
              foundKey = Object.keys(row).find(k => {
                const l = k.toLowerCase();
                return l === "categoria" || l === "categoría" || l === "category" || l.includes("categor");
              });
              if (foundKey !== undefined) return row[foundKey];
            }

            if (exactKey === "ID de Ticket") {
              foundKey = Object.keys(row).find(k => {
                const l = k.toLowerCase();
                return l === "id" || l === "id ticket" || l === "id de ticket" || l === "ticket id" || l === "ticket_id" || l === "id_ticket";
              });
              if (foundKey !== undefined) return row[foundKey];
            }

            if (exactKey === "Nombre de Cuenta") {
              foundKey = Object.keys(row).find(k => {
                const l = k.toLowerCase();
                return l === "cuenta" || l === "cliente" || l === "account" || l === "account name" || l.includes("cuenta") || l.includes("cliente") || l.includes("account");
              });
              if (foundKey !== undefined) return row[foundKey];
            }

            if (exactKey === "Propietario de Ticket") {
              foundKey = Object.keys(row).find(k => {
                const l = k.toLowerCase();
                return l === "propietario" || l === "owner" || l.includes("propietario") || l.includes("owner");
              });
              if (foundKey !== undefined) return row[foundKey];
            }

            if (exactKey === "Asunto") {
              foundKey = Object.keys(row).find(k => {
                const l = k.toLowerCase();
                return l === "asunto" || l === "subject" || l === "title" || l.includes("asunto") || l.includes("subject");
              });
              if (foundKey !== undefined) return row[foundKey];
            }

            if (exactKey === "Hora de creación (Ticket)") {
              foundKey = Object.keys(row).find(k => {
                const l = k.toLowerCase();
                return l.includes("creac") || l.includes("cread") || l.includes("created") || l.includes("fecha");
              });
              if (foundKey !== undefined) return row[foundKey];
            }

            if (exactKey === "Hora de responder") {
              foundKey = Object.keys(row).find(k => {
                const l = k.toLowerCase();
                return l.includes("responder") || l.includes("respuesta") || l.includes("replied") || l.includes("respond");
              });
              if (foundKey !== undefined) return row[foundKey];
            }

            if (exactKey === "Número de respuestas") {
              foundKey = Object.keys(row).find(k => {
                const l = k.toLowerCase();
                return l.includes("respuestas") || l.includes("replies") || l.includes("interacciones") || l.includes("num");
              });
              if (foundKey !== undefined) return row[foundKey];
            }

            if (exactKey === "Ingeniero de soporte asignado") {
              foundKey = Object.keys(row).find(k => {
                const l = k.toLowerCase();
                return l === "asignado" || l === "assignee" || l.includes("ingeniero") || l.includes("asignado");
              });
              if (foundKey !== undefined) return row[foundKey];
            }

            // Try generic substring match
            foundKey = Object.keys(row).find(
              k => k.toLowerCase().includes(exactKey.toLowerCase()) || exactKey.toLowerCase().includes(k.toLowerCase())
            );
            return foundKey ? row[foundKey] : "";
          };

          return {
            "Nombre de Cuenta": String(getVal("Nombre de Cuenta") || "Sin Cuenta").trim(),
            "Clasificaciones": String(getVal("Clasificaciones") || "Cliente Estándar").trim(),
            "Propietario de Ticket": String(getVal("Propietario de Ticket") || "Soporte Nivel 1").trim(),
            "ID de Ticket": String(getVal("ID de Ticket") || `TKT-AUTO-${index + 1}`).trim(),
            "Asunto": String(getVal("Asunto") || "Sin Asunto").trim(),
            "Categoria (Ticket)": String(getVal("Categoria (Ticket)") || "Sin Categoría").trim(),
            "Prioridad (Ticket)": String(getVal("Prioridad (Ticket)") || "Media").trim(),
            "Estado (Ticket)": String(getVal("Estado (Ticket)") || "Abierto").trim(),
            "Hora de creación (Ticket)": String(getVal("Hora de creación (Ticket)") || "").trim(),
            "Ticket Tiempo terminado": String(getVal("Ticket Tiempo terminado") || "").trim(),
            "Tiempo total empleado": getVal("Tiempo total empleado") !== undefined ? getVal("Tiempo total empleado") : 0,
            "Ingeniero de soporte asignado": String(getVal("Ingeniero de soporte asignado") || "No Asignado").trim(),
            "Tipo de vulneración del SLA": String(getVal("Tipo de vulneración del SLA") || "Ninguna").trim(),
            "Tiempo de respuesta del agente": getVal("Tiempo de respuesta del agente") !== undefined ? getVal("Tiempo de respuesta del agente") : "",
            "Tiempo de primera respuesta en horario laboral": getVal("Tiempo de primera respuesta en horario laboral") !== undefined ? getVal("Tiempo de primera respuesta en horario laboral") : "",
            "Tiempo total de respuesta en horario laboral": getVal("Tiempo total de respuesta en horario laboral") !== undefined ? getVal("Tiempo total de respuesta en horario laboral") : "",
            "Número de respuestas": getVal("Número de respuestas") !== undefined ? getVal("Número de respuestas") : 0,
            "Hora de responder": String(getVal("Hora de responder") || "").trim()
          };
        });

        resolve(mappedRecords);
      } catch (err: any) {
        reject(err || new Error("Error desconocido al procesar el archivo."));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error de lectura del archivo."));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Downloads a sample CSV matching the required column names precisely to help users test the app.
 */
export function downloadSampleCSV() {
  const headers = [
    "Nombre de Cuenta",
    "Clasificaciones",
    "Propietario de Ticket",
    "ID de Ticket",
    "Asunto",
    "Categoria (Ticket)",
    "Prioridad (Ticket)",
    "Estado (Ticket)",
    "Hora de creación (Ticket)",
    "Ticket Tiempo terminado",
    "Tiempo total empleado",
    "Ingeniero de soporte asignado",
    "Tipo de vulneración del SLA",
    "Tiempo de respuesta del agente",
    "Tiempo de primera respuesta en horario laboral",
    "Tiempo total de respuesta en horario laboral",
    "Número de respuestas",
    "Hora de responder"
  ];

  const sampleRows = [
    [
      "Acme Corp", "Socio Oro", "Soporte Nivel 2", "TKT-20101", 
      "Lentitud en base de datos Oracle", "Base de Datos", "Crítica", "Abierto", 
      "2026-06-25 09:00:00", "", "0", "Ana Gómez", "Tiempo de Respuesta Excedido", 
      "", "350", "", "0", ""
    ],
    [
      "Starlight Industries", "Socio Plata", "Soporte Nivel 1", "TKT-20102", 
      "Error al configurar impresora multifuncional", "Hardware", "Baja", "Cerrado", 
      "2026-06-24 10:15:00", "2026-06-24 11:30:00", "1.25", "Carlos Ruiz", "Ninguna", 
      "15", "15", "75", "2", "2026-06-24 10:30:00"
    ],
    [
      "Global Finance Inc.", "Socio Oro", "Soporte Nivel 3", "TKT-20103", 
      "Fallo de conexión VPN IPsec principal", "Redes", "Alta", "En Progreso", 
      "2026-06-25 07:00:00", "", "2.0", "Luis Martínez", "Ninguna", 
      "30", "420", "420", "1", "2026-06-25 14:00:00"
    ]
  ];

  const csvContent = [
    headers.join(","),
    ...sampleRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "plantilla_soporte_ecs.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
