import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AuthGate } from "./auth/AuthGate.tsx";
import "./index.css";

// Inicio de sesión corporativo integrado con Directorio Activo (Active Directory / Microsoft Entra ID)
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>,
);
