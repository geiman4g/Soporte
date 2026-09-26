import React from "react";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";

interface Props {
  onLogin: () => void;
  busy?: boolean;
  error?: string | null;
  notice?: string | null;
  allowedDomain: string;
  disabled?: boolean;
}

export function LoginPage({ onLogin, busy, error, notice, allowedDomain, disabled }: Props) {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#0b1f3a]">
      {/* Fondo: degradado corporativo con luces difuminadas */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b1f3a] via-[#123a6b] to-[#0b1f3a]" />
      <div className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-[#005bbf]/40 blur-3xl" />
      <div className="absolute -bottom-40 -right-24 w-[560px] h-[560px] rounded-full bg-[#f2994a]/15 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Tarjeta de acceso */}
      <div className="relative w-full max-w-[400px] bg-white rounded-lg shadow-2xl pb-10">
        {/* Encabezado con marca */}
        <div className="-mt-5 mx-4 rounded-md bg-gradient-to-b from-white to-[#f1f3f6] border border-gray-200 shadow-md px-6 pt-7 pb-6 text-center">
          <img
            src={`${import.meta.env.BASE_URL}logos/sac.png`}
            alt="SAC - Sistema de administración de cobranzas"
            className="mx-auto h-auto w-full max-w-[250px]"
          />
          <div className="my-5 h-px bg-gray-300" />
          <img
            src={`${import.meta.env.BASE_URL}logos/ecs.png`}
            alt="Effective Computer Solutions"
            className="mx-auto h-9 w-auto"
          />
        </div>

        {/* Cuerpo */}
        <div className="px-7 pt-9 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-base font-bold text-gray-900">Iniciar sesión</h1>
            <p className="text-xs text-gray-500">
              Usa tu cuenta corporativa de Microsoft 365 <strong className="text-gray-700 whitespace-nowrap">@{allowedDomain}</strong>
            </p>
          </div>

          {notice && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{notice}</span>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <button
              onClick={onLogin}
              disabled={busy || disabled}
              className="inline-flex items-center justify-center gap-2.5 w-full max-w-[220px] px-4 py-3 rounded-md bg-[#1f3f9f] hover:bg-[#19347f] text-white text-[12px] whitespace-nowrap font-semibold tracking-wide uppercase shadow-lg shadow-[#1f3f9f]/30 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Conectando..." : "Iniciar sesión"}
            </button>
          </div>

          <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Acceso exclusivo para la organización {allowedDomain}
          </p>
        </div>
      </div>
    </div>
  );
}
