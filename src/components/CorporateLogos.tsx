import React from "react";
import sacLogo from "../assets/sac-logo.png";
import sacLogoMark from "../assets/sac-logo-mark.png";
import ecsLogo from "../assets/ecs-logo.png";

/**
 * Logotipo oficial de SAC (Sistema de administración de cobranzas).
 * Usa la imagen oficial: "sac." con punto naranja y el subtítulo.
 */
export function SacLogo({
  className = "",
  height = 48,
  variant = "full", // "full" con subtítulo, "mark" solo sac.
}: {
  className?: string;
  height?: number;
  variant?: "full" | "mark";
}) {
  return (
    <div className={`inline-flex items-center select-none ${className}`} style={{ height: `${height}px` }}>
      <img
        src={variant === "mark" ? sacLogoMark : sacLogo}
        alt="SAC - Sistema de administración de cobranzas"
        className="h-full w-auto object-contain"
        draggable={false}
      />
    </div>
  );
}

/**
 * Logotipo oficial de Effective Computer Solutions (imagen oficial).
 * En fondos oscuros (textColor="white") se muestra sobre una placa blanca para que se lea bien.
 */
export function EcsLogo({
  className = "",
  height = 40,
  textColor = "blue", // "blue" para fondos claros, "white" para fondos oscuros
}: {
  className?: string;
  height?: number;
  textColor?: "blue" | "white";
}) {
  const onDark = textColor === "white";
  return (
    <div
      className={`inline-flex items-center select-none ${onDark ? "bg-white rounded-lg px-2" : ""} ${className}`}
      style={{ height: `${height}px` }}
    >
      <img
        src={ecsLogo}
        alt="Effective Computer Solutions"
        className="h-full w-auto object-contain"
        draggable={false}
      />
    </div>
  );
}

/**
 * Encabezado de marcas combinadas (SAC + ECS) con divisor corporativo
 */
export function CorporateBrandHeader({
  height = 36,
  className = "",
  showTagline = true,
}: {
  height?: number;
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <div className={`inline-flex items-center gap-3.5 ${className}`}>
      <EcsLogo height={height} />
      <div className="h-6 w-px bg-gray-200 hidden sm:block" />
      <SacLogo height={height + 6} className="hidden sm:inline-flex" />
      {showTagline && (
        <>
          <div className="h-6 w-px bg-gray-200 hidden lg:block" />
          <div className="hidden lg:flex flex-col">
            <span className="text-xs font-bold text-gray-800 leading-tight">
              Dashboard de Monitoreo y Seguimiento
            </span>
            <span className="text-[10px] text-gray-500 font-medium">
              Soporte Técnico Especializado SAC
            </span>
          </div>
        </>
      )}
    </div>
  );
}
