import React, { createContext, useContext, useEffect, useState } from "react";
import { AccountInfo } from "@azure/msal-browser";
import { Loader2 } from "lucide-react";
import { LoginPage } from "../components/LoginPage";
import { AuthConfig, initMsal, isAllowedAccount, loadAuthConfig, login, logout } from "./msal";

interface AuthUser {
  name: string;
  email: string;
  signOut: () => void;
}

const AuthContext = createContext<AuthUser | null>(null);
export const useAuthUser = () => useContext(AuthContext);

const clearLocalData = () => {
  try {
    localStorage.removeItem("ecs_support_tickets");
    localStorage.removeItem("ecs_zoho_last_sync");
  } catch { /* sin almacenamiento */ }
};

/** Muestra la página de inicio de sesión hasta que el usuario entre con una cuenta @ecs-la.com. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [cfg, setCfg] = useState<AuthConfig | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "login" | "ready" | "open">("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await loadAuthConfig();
      if (!c) {
        setNotice("No se pudo cargar la configuración de inicio de sesión. Intenta de nuevo en unos minutos.");
        setStatus("login");
        return;
      }
      setCfg(c);
      if (c.disabled) { setStatus("open"); return; }
      if (!c.clientId) {
        setNotice("El inicio de sesión con Microsoft 365 aún no está configurado (falta AZURE_CLIENT_ID en Vercel).");
        setStatus("login");
        return;
      }
      try {
        const acc = await initMsal(c);
        if (acc && !isAllowedAccount(acc, c)) {
          setError(`La cuenta ${acc.username} no pertenece a ${c.allowedDomain}. Entra con tu cuenta corporativa.`);
          clearLocalData();
          setStatus("login");
          return;
        }
        setAccount(acc);
        setStatus(acc ? "ready" : "login");
      } catch (e: any) {
        setError(e?.errorMessage || e?.message || "No se pudo completar el inicio de sesión.");
        setStatus("login");
      }
    })();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1f3a] text-white text-sm gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Verificando sesión...
      </div>
    );
  }

  if (status === "open") return <>{children}</>;

  if (status === "login" || !account || !cfg) {
    return (
      <LoginPage
        allowedDomain={cfg?.allowedDomain || "ecs-la.com"}
        error={error}
        notice={notice}
        busy={busy}
        disabled={!cfg?.clientId}
        onLogin={async () => {
          setBusy(true);
          setError(null);
          try {
            await login(cfg?.allowedDomain);
          } catch (e: any) {
            setError(e?.errorMessage || e?.message || "No se pudo iniciar sesión.");
            setBusy(false);
          }
        }}
      />
    );
  }

  const user: AuthUser = {
    name: account.name || account.username,
    email: account.username,
    signOut: () => {
      clearLocalData();
      logout();
    },
  };
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}
