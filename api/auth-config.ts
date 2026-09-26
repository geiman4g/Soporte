/**
 * Configuración pública del inicio de sesión con Microsoft 365 (no contiene secretos).
 * Variables en Vercel:
 *   AZURE_CLIENT_ID        ID de la aplicación registrada en Microsoft Entra ID (obligatoria)
 *   AZURE_TENANT_ID        Inquilino de ecs-la.com (por defecto afedf556-d8ff-48b9-875b-d191d77f4832)
 *   ALLOWED_EMAIL_DOMAIN   Dominio permitido (por defecto ecs-la.com)
 *   AUTH_DISABLED          "true" solo para pruebas locales: desactiva el inicio de sesión
 */
export default function handler(_req: any, res: any) {
  const env = (k: string, d = "") => (process.env[k] ?? d).trim();
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    clientId: env("AZURE_CLIENT_ID"),
    tenantId: env("AZURE_TENANT_ID", "afedf556-d8ff-48b9-875b-d191d77f4832"),
    allowedDomain: env("ALLOWED_EMAIL_DOMAIN", "ecs-la.com").toLowerCase(),
    disabled: env("AUTH_DISABLED").toLowerCase() === "true",
  });
}
