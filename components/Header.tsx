import React from "react";
import { Clock, LogOut, Server, ShieldCheck, UserCheck } from "lucide-react";
import { useAuthUser } from "../auth/AuthGate";
import { SacLogo, EcsLogo } from "./CorporateLogos";

export function Header() {
  const [currentTime, setCurrentTime] = React.useState<string>("");
  const user = useAuthUser();

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return "AD";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logotipos Oficiales Adjuntos: ECS y SAC */}
          <div className="flex items-center space-x-3.5">
            {/* Logotipo Effective Computer Solutions */}
            <div className="flex items-center" title="Effective Computer Solutions">
              <EcsLogo height={36} />
            </div>

            <div className="hidden sm:block h-7 w-px bg-gray-200" />

            {/* Logotipo SAC: Sistema de administración de cobranzas */}
            <div className="hidden sm:flex items-center" title="SAC - Sistema de administración de cobranzas">
              <SacLogo height={42} />
            </div>

            <div className="hidden xl:block h-7 w-px bg-gray-200" />

            <div className="hidden xl:flex flex-col">
              <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-tight">
                Dashboard de Monitoreo de Soporte
              </h1>
              <span className="text-[10px] text-gray-500 font-medium">
                Consola Integral de Métricas & SLAs
              </span>
            </div>
          </div>

          {/* Menú de Usuario para Dispositivos Móviles */}
          {user && (
            <div className="flex md:hidden items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-[11px] font-semibold text-[#005bbf]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{user.name.split(" ")[0]}</span>
              </div>
              <button
                onClick={user.signOut}
                className="inline-flex items-center justify-center p-2 rounded-md border border-gray-200 text-gray-600 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                title="Cerrar sesión de Directorio Activo"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Estado del Sistema, Reloj y Perfil de Directorio Activo en Escritorio */}
          <div className="hidden md:flex items-center space-x-5 text-sm text-gray-500">
            {/* Indicador de Conexión a Directorio Activo */}
            <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200/80 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-[11px] tracking-tight flex items-center gap-1">
                <Server className="w-3 h-3 text-emerald-600" />
                AD Conectado
              </span>
            </div>

            {/* Reloj en Vivo */}
            <div className="flex items-center space-x-1.5 font-mono text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md text-xs">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>{currentTime || "00:00:00"}</span>
            </div>

            {/* Credencial del Usuario de Directorio Activo */}
            {user && (
              <>
                <div className="h-5 w-px bg-gray-200" />

                <div className="flex items-center gap-2.5">
                  {/* Avatar con Iniciales */}
                  <div
                    className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#005bbf] to-[#0d69af] text-white font-bold text-xs flex items-center justify-center shadow-xs border border-white"
                    title={user.email}
                  >
                    {getInitials(user.name)}
                  </div>

                  <div className="text-right leading-tight hidden lg:block">
                    <div className="text-xs font-bold text-gray-800 flex items-center justify-end gap-1">
                      {user.name}
                      <ShieldCheck className="w-3 h-3 text-[#005bbf]" />
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">{user.email}</div>
                  </div>

                  {/* Botón Cerrar Sesión */}
                  <button
                    onClick={user.signOut}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 cursor-pointer transition-all ml-1 shadow-2xs"
                    title="Cerrar sesión de Directorio Activo"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Salir</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
