import React from "react";
import { ExternalLink } from "lucide-react";
import { TicketRecord } from "../types";
import { zohoTicketUrl } from "../utils/zoho";

interface TicketLinkProps {
  ticket: Pick<TicketRecord, "ID de Ticket" | "zohoId">;
  className?: string;
  children?: React.ReactNode;
}

/** Número de ticket clicable que abre el caso en Zoho Desk en una pestaña nueva. */
export function TicketLink({ ticket, className = "", children }: TicketLinkProps) {
  return (
    <a
      href={zohoTicketUrl(ticket)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      title={`Abrir el ticket ${ticket["ID de Ticket"]} en Zoho Desk`}
      className={`inline-flex items-center gap-1 font-mono font-bold hover:underline underline-offset-2 ${className}`}
    >
      {children ?? ticket["ID de Ticket"]}
      <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
    </a>
  );
}
