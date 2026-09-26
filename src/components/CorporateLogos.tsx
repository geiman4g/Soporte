import React from "react";

/**
 * Logotipo oficial de SAC (Sistema de administración de cobranzas)
 * Renderizado vectorial nítido con tipografía corporativa y punto naranja.
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
  if (variant === "mark") {
    return (
      <div className={`inline-flex items-center select-none ${className}`} style={{ height: `${height}px` }}>
        <svg viewBox="0 0 220 80" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
          <text
            x="95"
            y="62"
            textAnchor="middle"
            fill="#1055a4"
            fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="800"
            fontSize="72"
            letterSpacing="-1.5px"
          >
            sac
          </text>
          <circle cx="178" cy="50" r="11" fill="#f2994a" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center select-none ${className}`} style={{ height: `${height}px` }}>
      <svg viewBox="0 0 420 120" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* sac. */}
        <text
          x="195"
          y="68"
          textAnchor="middle"
          fill="#1055a4"
          fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="800"
          fontSize="68"
          letterSpacing="-1.5px"
        >
          sac
        </text>
        <circle cx="270" cy="56" r="10.5" fill="#f2994a" />

        {/* Subtítulo: Sistema de administración de cobranzas */}
        <text
          x="210"
          y="104"
          textAnchor="middle"
          fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="700"
          fontSize="14.5"
          letterSpacing="1.2px"
        >
          <tspan fill="#1e548f">Sistema de administración de </tspan>
          <tspan fill="#f2994a">cobranzas</tspan>
        </text>
      </svg>
    </div>
  );
}

/**
 * Logotipo oficial de Effective Computer Solutions
 * Ícono de espiral con olas azul/celeste/naranja y tipografía corporativa.
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
  const isWhite = textColor === "white";

  return (
    <div className={`inline-flex items-center select-none ${className}`} style={{ height: `${height}px` }}>
      <svg viewBox="0 0 380 90" className="h-full w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ecsBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0094e8" />
            <stop offset="45%" stopColor="#0263cc" />
            <stop offset="100%" stopColor="#0b387e" />
          </linearGradient>
          <linearGradient id="ecsOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffb03a" />
            <stop offset="100%" stopColor="#f28500" />
          </linearGradient>
          <filter id="ecsShadow" x="-10%" y="-10%" width="125%" height="125%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Ícono de Espiral ECS */}
        <g transform="translate(10, 8)">
          {/* Fondo blanco circular para destacar sobre cualquier superficie */}
          <circle cx="37" cy="37" r="34" fill="white" filter="url(#ecsShadow)" />

          {/* Ola azul exterior */}
          <path
            d="M 37,7 A 30,30 0 0,0 11,54 C 14,43 23,36 34,36 C 45,36 53,44 51,55 C 49,61 41,66 35,65 A 30,30 0 0,0 67,37 C 67,20 54,7 37,7 Z"
            fill="url(#ecsBlueGrad)"
          />

          {/* Espiral naranja interior */}
          <path
            d="M 53,27 C 56,32 57,39 55,45 C 53,51 47,55 42,56 C 43,48 39,42 33,39 C 27,37 20,39 17,44 C 19,31 27,21 39,19 C 45,18 50,22 53,27 Z"
            fill="url(#ecsOrangeGrad)"
          />

          {/* Punto naranja inferior derecho */}
          <circle cx="55" cy="60" r="4.5" fill="#f2994a" stroke="white" strokeWidth="1.5" />
        </g>

        {/* Texto: Effective Computer Solutions */}
        <g transform="translate(95, 20)">
          <text
            x="0"
            y="30"
            fill={isWhite ? "#ffffff" : "#0e4f94"}
            fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="800"
            fontSize="32"
            letterSpacing="-0.3px"
          >
            Effective
          </text>
          <text
            x="1"
            y="52"
            fill={isWhite ? "#cbd5e1" : "#1a5fa6"}
            fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="600"
            fontSize="18"
            letterSpacing="0.4px"
          >
            Computer Solutions
          </text>
        </g>
      </svg>
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
