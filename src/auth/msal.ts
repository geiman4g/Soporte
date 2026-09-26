import {
  AccountInfo, InteractionRequiredAuthError, PublicClientApplication,
} from "@azure/msal-browser";

/** Inicio de sesión con Microsoft 365 (Microsoft Entra ID), limitado a la organización ecs-la.com. */

export interface AuthConfig {
  clientId: string;
  tenantId: string;
  allowedDomain: string;
  disabled: boolean;
}

const SCOPES = ["openid", "profile", "email"];
let pca: PublicClientApplication | null = null;
let config: AuthConfig | null = null;

const apiBase = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export async function loadAuthConfig(): Promise<AuthConfig | null> {
  if (config) return config;
  try {
    const r = await fetch(`${apiBase()}/api/auth-config`, { cache: "no-store" });
    if (!r.ok) return null;
    config = (await r.json()) as AuthConfig;
    return config;
  } catch {
    return null;
  }
}

export async function initMsal(cfg: AuthConfig): Promise<AccountInfo | null> {
  pca = new PublicClientApplication({
    auth: {
      clientId: cfg.clientId,
      authority: `https://login.microsoftonline.com/${cfg.tenantId}`,
      redirectUri: `${window.location.origin}${import.meta.env.BASE_URL}`,
      postLogoutRedirectUri: `${window.location.origin}${import.meta.env.BASE_URL}`,
    },
    cache: { cacheLocation: "localStorage" },
  });
  await pca.initialize();
  const result = await pca.handleRedirectPromise();
  const account = result?.account || pca.getActiveAccount() || pca.getAllAccounts()[0] || null;
  if (account) pca.setActiveAccount(account);
  return account;
}

export function isAllowedAccount(account: AccountInfo | null, cfg: AuthConfig): boolean {
  if (!account) return false;
  const email = (account.username || "").toLowerCase();
  return account.tenantId === cfg.tenantId && email.endsWith(`@${cfg.allowedDomain}`);
}

export async function login(domainHint?: string) {
  if (!pca) throw new Error("El inicio de sesión no está listo.");
  await pca.loginRedirect({ scopes: SCOPES, prompt: "select_account", domainHint });
}

export async function logout() {
  if (!pca) return;
  const account = pca.getActiveAccount();
  await pca.logoutRedirect({ account: account || undefined });
}

/** Token de identidad vigente para enviar a /api/zoho-report ("" si el inicio de sesión está desactivado). */
export async function getIdToken(): Promise<string> {
  if (!pca) return "";
  const account = pca.getActiveAccount();
  if (!account) return "";
  const exp = Number((account.idTokenClaims as any)?.exp || 0) * 1000;
  try {
    const r = await pca.acquireTokenSilent({
      scopes: SCOPES,
      account,
      forceRefresh: exp - Date.now() < 5 * 60 * 1000,
    });
    return r.idToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await pca.acquireTokenRedirect({ scopes: SCOPES, account });
    }
    throw e;
  }
}
