import React, { createContext, useContext, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { LoginPage } from "../components/LoginPage";
import {
  ActiveDirectoryUser,
  AuthConfig,
  authenticateActiveDirectory,
  authenticateMicrosoft365,
  clearActiveDirectorySession,
  getActiveDirectorySession,
  loadAuthConfig,
} from "./msal";

export interface AuthUser {
  name: string;
  email: string;
  username: string;
  department: string;
  title: string;
  domain: string;
  signOut: () => void;
}

const AuthContext = createContext<AuthUser | null>(null);
export const useAuthUser = () => useContext(AuthContext);

/**
 * Control de acceso: Muestra la pantalla de inicio de sesión con Directorio Activo
 * y restringe el acceso al dashboard hasta que el usuario se autentique con una cuenta de ecs-la.com.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [cfg, setCfg] = useState<AuthConfig | null>(null);
  const [currentUser, setCurrentUser] = useState<ActiveDirectoryUser | null>(null);
  const [status, setStatus] = useState<"loading" | "login" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      // 1. Cargar configuración de dominio
      const c = await loadAuthConfig();
      setCfg(c);

      // 2. Verificar si existe una sesión de Directorio Activo persistida
      const session = getActiveDirectorySession();
      if (session) {
        setCurrentUser(session);
        setStatus("ready");
        return;
      }

      setStatus("login");
    })();
  }, []);

  const handleLoginWithCredentials = async (identifier: string, password?: string) => {
    setBusy(true);
    setError(null);
    try {
      const user = await authenticateActiveDirectory(identifier, password);
      setCurrentUser(user);
      setStatus("ready");
    } catch (e: any) {
      setError(e?.message || "No se pudo autenticar en el Directorio Activo.");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const handleLoginWithM365 = async () => {
    setBusy(true);
    setError(null);
    try {
      const user = await authenticateMicrosoft365();
      setCurrentUser(user);
      setStatus("ready");
    } catch (e: any) {
      setError(e?.message || "No se pudo completar el inicio de sesión con Microsoft 365.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => {
    clearActiveDirectorySession();
    setCurrentUser(null);
    setStatus("login");
    setNotice("Has cerrado la sesión de Directorio Activo exitosamente.");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#071629] text-white text-sm gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#008be3]" />
        <span className="font-medium tracking-wide text-slate-300">
          Verificando credenciales de Directorio Activo...
        </span>
      </div>
    );
  }

  if (status === "login" || !currentUser) {
    return (
      <LoginPage
        allowedDomain={cfg?.allowedDomain || "ecs-la.com"}
        error={error}
        notice={notice}
        busy={busy}
        onLoginWithCredentials={handleLoginWithCredentials}
      />
    );
  }

  const authUserValue: AuthUser = {
    name: currentUser.name,
    email: currentUser.email,
    username: currentUser.username,
    department: currentUser.department,
    title: currentUser.title,
    domain: currentUser.domain,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={authUserValue}>{children}</AuthContext.Provider>;
}
