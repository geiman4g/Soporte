import React from "react";
import { Cpu, Activity, Clock } from "lucide-react";
import { Logo } from "./Logo";

export function Header() {
  const [currentTime, setCurrentTime] = React.useState<string>("");

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
            <Logo height={44} />
            <div className="hidden lg:block h-8 w-px bg-gray-200"></div>
            <h1 className="text-sm md:text-base font-bold text-gray-800 tracking-tight">
              Dashboard de Monitoreo y Seguimiento de Soporte
            </h1>
          </div>

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
          </div>
        </div>
      </div>
    </header>
  );
}
