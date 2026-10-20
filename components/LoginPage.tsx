import React, { useState } from "react";
import {
  AlertCircle,
  Loader2,
  ShieldCheck,
  KeyRound,
  User,
  Lock,
  Eye,
  EyeOff,
  Server,
  Building2,
  ArrowRight,
} from "lucide-react";
import { SacLogo, EcsLogo } from "./CorporateLogos";

interface Props {
  onLoginWithCredentials: (username: string, password: string) => Promise<void>;
  onLoginWithM365?: () => Promise<void>;
  busy?: boolean;
  error?: string | null;
  notice?: string | null;
  allowedDomain: string;
}

export function LoginPage({
  onLoginWithCredentials,
  busy = false,
  error = null,
  notice = null,
  allowedDomain,
}: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setLocalError("Por favor ingresa tu usuario o correo institucional de Directorio Activo.");
      return;
    }

    if (!trimmedPass) {
      setLocalError("Por favor ingresa tu contraseña de Directorio Activo.");
      return;
    }

    try {
      await onLoginWithCredentials(trimmedUser, trimmedPass);
    } catch (err: any) {
      setLocalError(
        err?.message || "Credenciales inválidas: No se pudo verificar el usuario y contraseña en el Directorio Activo."
      );
    }
  };

  const displayError = error || localError;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-x-hidden bg-[#09182d]">
      {/* Fondo: Degradado corporativo y patrones de iluminación */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#071527] via-[#0e2c52] to-[#071629]" />
      <div className="absolute -top-32 -left-28 w-[540px] h-[540px] rounded-full bg-[#0066cc]/25 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-28 w-[580px] h-[580px] rounded-full bg-[#f2994a]/15 blur-[130px] pointer-events-none" />

      {/* Trama sutil de cuadrícula corporativa */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Contenedor Principal de la Tarjeta */}
      <div className="relative w-full max-w-[460px] my-6">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100/90 overflow-hidden">
          
          {/* Cabecera con Logotipos Corporativos Oficiales: SAC + ECS */}
          <div className="bg-gradient-to-b from-[#ffffff] via-[#fbfcfd] to-[#f2f5f9] border-b border-gray-200/80 px-6 py-6 text-center space-y-4">
            <div className="flex flex-col items-center justify-center gap-3">
              {/* Logotipo SAC: sac. con punto naranja y subtítulo */}
              <div className="py-1">
                <SacLogo height={52} className="mx-auto" />
              </div>

              {/* Divisor corporativo */}
              <div className="w-full flex items-center justify-center gap-3 py-0.5">
                <div className="h-px bg-gray-200 flex-1 max-w-[90px]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100/90 px-2.5 py-0.5 rounded-full border border-gray-200">
                  Operado Por
                </span>
                <div className="h-px bg-gray-200 flex-1 max-w-[90px]" />
              </div>

              {/* Logotipo ECS: Effective Computer Solutions */}
              <div className="py-1">
                <EcsLogo height={42} className="mx-auto" />
              </div>
            </div>

            {/* Subtítulo de Directorio Activo */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-[#005bbf] text-[11px] font-semibold">
                <Server className="w-3.5 h-3.5 text-[#005bbf]" />
                Directorio Activo Corporativo
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
              </div>
            </div>
          </div>

          {/* Cuerpo del Formulario de Inicio de Sesión */}
          <div className="p-6 sm:p-8 space-y-5">
            
            {/* Título de acceso */}
            <div className="text-center space-y-1">
              <h1 className="text-lg font-bold text-gray-900 tracking-tight flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 text-[#005bbf]" />
                Autenticación de Dominio
              </h1>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Ingresa tus credenciales autorizadas en{" "}
                <strong className="text-gray-800 font-semibold">@{allowedDomain}</strong>
              </p>
            </div>

            {/* Mensajes de Notificación */}
            {notice && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span className="leading-relaxed">{notice}</span>
              </div>
            )}

            {/* Mensaje de Error en Validación */}
            {displayError && (
              <div
                className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-shake"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed font-medium">{displayError}</span>
              </div>
            )}

            {/* Formulario de Validación de Usuario y Contraseña */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo Usuario / Correo */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Usuario o Correo Institucional
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder={`usuario@${allowedDomain} o nombre.apellido`}
                    disabled={busy}
                    autoComplete="username"
                    className="w-full pl-10 pr-24 py-2.5 bg-gray-50/80 hover:bg-gray-50 focus:bg-white border border-gray-300 focus:border-[#005bbf] focus:ring-2 focus:ring-[#005bbf]/20 rounded-lg text-xs text-gray-900 transition-all outline-none font-medium"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-[10px] font-mono font-semibold text-gray-400 bg-gray-200/70 px-1.5 py-0.5 rounded">
                      ECS-LA
                    </span>
                  </div>
                </div>
              </div>

              {/* Campo Contraseña */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-700">
                    Contraseña de Directorio Activo
                  </label>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> Cifrado SSL
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    placeholder="Contraseña de red corporativa"
                    disabled={busy}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50/80 hover:bg-gray-50 focus:bg-white border border-gray-300 focus:border-[#005bbf] focus:ring-2 focus:ring-[#005bbf]/20 rounded-lg text-xs text-gray-900 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Opciones de Recordar */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 text-[#005bbf] rounded border-gray-300 focus:ring-[#005bbf] cursor-pointer"
                  />
                  <span className="text-[11px] text-gray-600 font-medium">Recordar sesión en este equipo</span>
                </label>
                <div className="text-[11px] text-[#005bbf] font-medium">
                  Dominio: {allowedDomain}
                </div>
              </div>

              {/* Botón Principal: Iniciar Sesión con Directorio Activo */}
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#005bbf] to-[#0d69af] hover:from-[#0051a8] hover:to-[#0a5c9b] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#005bbf]/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center gap-2 mt-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validando en Directorio Activo...
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    Iniciar Sesión con Directorio Activo
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Pie de Página con Garantía de Seguridad */}
            <div className="pt-2 text-center">
              <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Acceso exclusivo para el personal de Effective Computer Solutions & SAC</span>
              </p>
            </div>

          </div>
        </div>

        {/* Información Técnica de la Conexión al pie */}
        <div className="text-center mt-4 text-[11px] text-slate-400 font-mono flex items-center justify-center gap-3">
          <span>Controlador: DC01.ECS-LA.COM</span>
          <span>•</span>
          <span>Protocolo: LDAP/TLS</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">Estado: Operativo</span>
        </div>
      </div>
    </div>
  );
}
