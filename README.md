# Dashboard de Monitoreo de Soporte – ECS

Dashboard de seguimiento de soporte alimentado por el informe de Zoho Desk
**"Reporte Semanal Soporte - Gerentes de cuenta"**
(https://desk.zoho.com/agent/ecsla/effective-computer-solutions/reports/details/601927000052419003).

## Qué hace

- **Actualizar desde Zoho Desk**: botón que trae el informe en vivo mediante la función `/api/zoho-report` (Vercel).
  Se usan los mismos criterios del informe (propietarios, últimos 12 meses, estado ≠ Cerrado / Cierre por Vencimiento).
  Además, la API de tickets de Zoho Desk completa cada caso con cuenta, contacto, canal, última actividad,
  quién escribió de último, vencimiento y estado actual.
- **Carga manual** de Excel/CSV (también acepta el archivo exportado directamente desde Zoho).
- **Filtro global por Propietario de Ticket**: afecta KPIs, todas las gráficas, los detalles y las tablas.
- **Gráficas con detalle al hacer clic**: Estado (Ticket), Propietario × Estado, Antigüedad, SLA, Prioridad,
  Semana de creación, Ingeniero asignado, Seguimiento de comunicación, Cliente y Clasificación.
- **Cada número de ticket abre el caso en Zoho Desk.**

## Inicio de sesión con Microsoft 365 (desactivado por ahora)

> Actualmente el dashboard abre sin inicio de sesión (ver `src/main.tsx`). Para proteger los datos de Zoho
> configura `DASHBOARD_ACCESS_KEY` en Vercel. Para reactivar Microsoft 365, envuelve `<App />` con
> `<AuthGate>` en `src/main.tsx` y sigue los pasos de abajo.

Con el inicio de sesión activo, el dashboard solo deja entrar a cuentas **@ecs-la.com**
(inquilino `afedf556-d8ff-48b9-875b-d191d77f4832`). La función `/api/zoho-report` también valida el
token de Microsoft, así que los datos de Zoho no se pueden consultar sin iniciar sesión.

1. En https://entra.microsoft.com → Identity → Applications → **App registrations** → **New registration**.
   - Nombre: `Dashboard Monitoreo Soporte`
   - Tipo de cuenta: **Accounts in this organizational directory only (ECS – Single tenant)**
   - Redirect URI: plataforma **Single-page application (SPA)** →
     `https://dashboard-de-monitoreo-de-soporte.vercel.app/`
2. Copia el **Application (client) ID**.
3. En Vercel agrega la variable `AZURE_CLIENT_ID` con ese valor y vuelve a publicar.
   (Con Microsoft 365 configurado, `DASHBOARD_ACCESS_KEY` ya no es necesaria.)

Para pruebas locales agrega también `http://localhost:3000/` como Redirect URI.

## Configuración en Vercel

1. En https://api-console.zoho.com crea un **Self Client** y genera un código con el alcance:
   `Desk.tickets.READ,Desk.search.READ,Desk.basic.READ,Desk.settings.READ`
2. Cambia ese código por un *refresh token*:
   ```bash
   curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
     -d grant_type=authorization_code -d client_id=TU_CLIENT_ID \
     -d client_secret=TU_CLIENT_SECRET -d code=EL_CODIGO
   ```
3. En Vercel → Project → Settings → Environment Variables agrega:
   - `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`
   - `DASHBOARD_ACCESS_KEY` (clave que pide el dashboard antes de consultar Zoho)
   - Opcionales: ver `.env.example`.
4. Despliega (Vercel detecta Vite; `vercel.json` ya configura la función).

La función intenta primero exportar el informe guardado; si la API de informes no está disponible para el token,
reconstruye el informe con la API de tickets y sus métricas (la respuesta indica `source: "tickets-api"`).

## Desarrollo local

```bash
npm install
npm run dev          # frontend
npx vercel dev       # frontend + /api/zoho-report con las variables de .env
```

Para publicar en IIS bajo `/soporte/`, `npm run build` genera `dist/` con `web.config`
(el botón de Zoho requiere la función de Vercel; en IIS se puede seguir usando la carga manual).
