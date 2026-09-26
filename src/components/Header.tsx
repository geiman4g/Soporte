import React from "react";
import { Cpu, Activity, Clock, LogOut } from "lucide-react";
import { useAuthUser } from "../auth/AuthGate";

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
          hour12: false
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Corporate Brand */}
          <div className="flex items-center space-x-4">
            <img
              src={`${import.meta.env.BASE_URL}logos/ecs.png`}
              alt="Effective Computer Solutions"
              className="h-8 w-auto"
            />
            <div className="hidden sm:block h-8 w-px bg-gray-200"></div>
            <img
              src={`${import.meta.env.BASE_URL}logos/sac.png`}
              alt="SAC - Sistema de administración de cobranzas"
              className="h-9 w-auto hidden sm:block"
            />
            <div className="hidden lg:block h-8 w-px bg-gray-200"></div>
            <h1 className="text-sm md:text-base font-bold text-gray-800 tracking-tight">
              Dashboard de Monitoreo y Seguimiento de Soporte
            </h1>
          </div>

          {user && (
            <button
              onClick={user.signOut}
              className="md:hidden inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* System Status and Live Time */}
          <div className="hidden md:flex items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute"></span>
              <span className="font-medium text-gray-700">Sistema Activo</span>
            </div>
            <div className="h-4 w-px bg-gray-200"></div>
            <div className="flex items-center space-x-1.5 font-mono text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{currentTime || "00:00:00"}</span>
            </div>
            {user && (
              <>
                <div className="h-4 w-px bg-gray-200"></div>
                <div className="text-right leading-tight hidden lg:block">
                  <div className="text-xs font-semibold text-gray-800">{user.name}</div>
                  <div className="text-[10px] text-gray-400">{user.email}</div>
                </div>
                <button
                  onClick={user.signOut}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" /> Salir
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
