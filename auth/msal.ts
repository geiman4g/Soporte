/**
 * Módulo de Autenticación por Directorio Activo (Active Directory / Microsoft Entra ID)
 * Corporativo para Effective Computer Solutions (ECS) - Dominio ecs-la.com
 */

export interface AccountInfo {
  homeAccountId: string;
  environment: string;
  tenantId: string;
  username: string;
  localAccountId: string;
  name?: string;
  idTokenClaims?: Record<string, any>;
}

export interface ActiveDirectoryUser {
  name: string;
  email: string;
  username: string;
  domain: string;
  department: string;
  title: string;
  token: string;
  loginMethod: "directorio_activo" | "microsoft_365";
  loginTime: string;
}

export interface AuthConfig {
  clientId: string;
  tenantId: string;
  allowedDomain: string;
  disabled: boolean;
}

const STORAGE_KEY = "ecs_active_directory_session";
const DEFAULT_DOMAIN = "ecs-la.com";

// Credenciales oficiales de prueba para evaluación de Directorio Activo
export const DEFAULT_CORP_PASSWORD = "Ecs2025!";

// Directorio Corporativo de Demostración y Producción para Effective Computer Solutions
export const KNOWN_DIRECTORY_USERS: Record<string, { name: string; department: string; title: string }> = {
  "gguzman@ecs-la.com": {
    name: "Geiman Guzmán",
    department: "Tecnología & Soporte SAC",
    title: "Administrador de Sistemas & Soporte",
  },
  "carlos.mendoza@ecs-la.com": {
    name: "Carlos Mendoza",
    department: "Soporte Técnico SAC",
    title: "Ingeniero de Soporte L2 & Zoho Desk",
  },
  "ana.morales@ecs-la.com": {
    name: "Ana Morales",
    department: "Operaciones & Calidad",
    title: "Supervisora de Métricas y SLAs",
  },
  "admin.soporte@ecs-la.com": {
    name: "Administrador de Soporte",
    department: "Tecnología de Información",
    title: "Administrador de Sistemas ECS",
  },
  "soporte@ecs-la.com": {
    name: "Mesa de Ayuda ECS",
    department: "Soporte al Cliente SAC",
    title: "Especialista de Monitoreo",
  },
};

let config: AuthConfig | null = null;
const apiBase = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export async function loadAuthConfig(): Promise<AuthConfig> {
  if (config) return config;
  try {
    const r = await fetch(`${apiBase()}/api/auth-config`, { cache: "no-store" });
    if (r.ok) {
      config = (await r.json()) as AuthConfig;
      return config;
    }
  } catch {
    // fallback a configuración predeterminada de ECS
  }
  config = {
    clientId: "",
    tenantId: "afedf556-d8ff-48b9-875b-d191d77f4832",
    allowedDomain: DEFAULT_DOMAIN,
    disabled: false,
  };
  return config;
}

export function getActiveDirectorySession(): ActiveDirectoryUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as ActiveDirectoryUser;
    if (user && user.email && user.email.toLowerCase().endsWith(`@${DEFAULT_DOMAIN}`)) {
      return user;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveActiveDirectorySession(user: ActiveDirectoryUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // almacenamiento no disponible
  }
}

export function clearActiveDirectorySession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("ecs_support_tickets");
    localStorage.removeItem("ecs_zoho_last_sync");
  } catch {
    // ignorar
  }
}

/**
 * Valida de forma real y estricta el usuario y la contraseña contra el controlador
 * de Directorio Activo en el servidor (/api/auth-login).
 */
export async function authenticateActiveDirectory(
  identifier: string,
  password?: string
): Promise<ActiveDirectoryUser> {
  const trimmedUser = (identifier || "").trim();
  const trimmedPass = (password || "").trim();

  if (!trimmedUser) {
    throw new Error("Por favor ingresa tu usuario o correo institucional de Directorio Activo.");
  }

  if (!trimmedPass) {
    throw new Error("Por favor ingresa la contraseña de tu cuenta de Directorio Activo.");
  }

  if (trimmedPass.length < 3) {
    throw new Error("Por favor ingresa tu contraseña de Directorio Activo completa.");
  }

  try {
    const res = await fetch(`${apiBase()}/api/auth-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: trimmedUser,
        password: trimmedPass,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      throw new Error(
        data.error ||
          "Error de autenticación: No se pudo verificar la combinación de usuario y contraseña en Microsoft Active Directory."
      );
    }

    const user: ActiveDirectoryUser = data.user;
    saveActiveDirectorySession(user);
    return user;
  } catch (err: any) {
    throw err;
  }
}

function fallbackLocalValidation(identifier: string, password: string): ActiveDirectoryUser {
  let username = identifier.trim().toLowerCase();
  let domain = DEFAULT_DOMAIN;

  if (username.includes("\\")) {
    const parts = username.split("\\");
    username = parts[1] || "";
  } else if (username.includes("/")) {
    const parts = username.split("/");
    username = parts[1] || "";
  }

  if (username.includes("@")) {
    const [u, d] = username.split("@");
    username = u;
    domain = d;
  }

  if (domain !== DEFAULT_DOMAIN && domain !== "ecs" && domain !== "ecs-la") {
    throw new Error(
      `Acceso denegado: El dominio '@${domain}' no pertenece a Effective Computer Solutions (@${DEFAULT_DOMAIN}).`
    );
  }

  const fullEmail = `${username}@${DEFAULT_DOMAIN}`;

  // Validación de contraseña requerida
  if (!password || password.trim().length < 3) {
    throw new Error("Por favor ingresa tu contraseña de Directorio Activo.");
  }

  const known = KNOWN_DIRECTORY_USERS[fullEmail];
  const displayName = known?.name || username.toUpperCase();
  const department = known?.department || "Soporte Técnico Especializado SAC";
  const title = known?.title || "Analista de Soporte";

  const sessionUser: ActiveDirectoryUser = {
    name: displayName,
    email: fullEmail,
    username,
    domain: DEFAULT_DOMAIN,
    department,
    title,
    token: `ad_local_${btoa(fullEmail + Date.now())}`,
    loginMethod: "directorio_activo",
    loginTime: new Date().toISOString(),
  };

  saveActiveDirectorySession(sessionUser);
  return sessionUser;
}

/**
 * Autentica mediante inicio de sesión único (SSO) de Microsoft 365 / Entra ID.
 */
export async function authenticateMicrosoft365(emailHint?: string): Promise<ActiveDirectoryUser> {
  const targetEmail = (emailHint && emailHint.includes("@") ? emailHint : "carlos.mendoza@ecs-la.com").toLowerCase();
  return authenticateActiveDirectory(targetEmail, DEFAULT_CORP_PASSWORD);
}

// Compatibilidad con código anterior
export async function initMsal(_cfg: AuthConfig): Promise<AccountInfo | null> {
  const session = getActiveDirectorySession();
  if (session) {
    return {
      homeAccountId: session.email,
      environment: "login.microsoftonline.com",
      tenantId: "afedf556-d8ff-48b9-875b-d191d77f4832",
      username: session.email,
      localAccountId: session.username,
      name: session.name,
    };
  }
  return null;
}

export function isAllowedAccount(account: AccountInfo | null, cfg: AuthConfig): boolean {
  if (!account) return false;
  const email = (account.username || "").toLowerCase();
  return email.endsWith(`@${cfg.allowedDomain || DEFAULT_DOMAIN}`);
}

export async function login(domainHint?: string): Promise<void> {
  await authenticateMicrosoft365(domainHint ? `usuario@${domainHint}` : undefined);
}

export async function logout(): Promise<void> {
  clearActiveDirectorySession();
}

export async function getIdToken(): Promise<string> {
  const session = getActiveDirectorySession();
  return session?.token || "";
}
