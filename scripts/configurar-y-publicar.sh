#!/bin/bash
# Configura las credenciales de Zoho en Vercel y publica el dashboard en un solo paso.
# Uso (Terminal, dentro de la carpeta soporte):   bash scripts/configurar-y-publicar.sh
# Los secretos se escriben aquí, no se muestran y no se guardan en ningún archivo.
set -e
cd "$(dirname "$0")/.."
PROJECT="soporte"
SCOPE="geiman4g-2728"
URL="https://soporte-murex.vercel.app"
VERCEL="npx --yes vercel@latest"

echo "== 1/5 Inicio de sesión en Vercel (se abre el navegador si hace falta) =="
$VERCEL whoami >/dev/null 2>&1 || $VERCEL login

echo "== 2/5 Vinculando la carpeta al proyecto '$PROJECT' =="
$VERCEL link --yes --project "$PROJECT" --scope "$SCOPE" >/dev/null

echo "== 3/5 Credenciales de Zoho (Self Client en api-console.zoho.com) =="
read -r  -p "Client ID: " CID
read -rs -p "Client Secret (no se muestra): " CSEC; echo
read -r  -p "¿Ya tienes el refresh token? (s/n): " HAS
if [[ "$HAS" =~ ^[sS] ]]; then
  read -rs -p "Refresh token (no se muestra): " RT; echo
else
  echo "Genera el código en Self Client → Generate Code (scope: Desk.tickets.READ,Desk.search.READ,Desk.basic.READ,Desk.settings.READ)."
  read -rs -p "Código generado (no se muestra): " CODE; echo
  RESP=$(curl -s -X POST "https://accounts.zoho.com/oauth/v2/token" \
    --data-urlencode "grant_type=authorization_code" --data-urlencode "client_id=$CID" \
    --data-urlencode "client_secret=$CSEC" --data-urlencode "code=$CODE")
  RT=$(printf '%s' "$RESP" | sed -n 's/.*"refresh_token":"\([^"]*\)".*/\1/p')
  if [ -z "$RT" ]; then
    echo "Zoho no devolvió refresh token: $(printf '%s' "$RESP" | sed 's/"access_token":"[^"]*"/"access_token":"(oculto)"/')"
    echo "Si dice invalid_code: el código venció (10 min) o ya se usó. Genera otro y vuelve a correr el script."
    exit 1
  fi
  echo "Refresh token obtenido."
fi

# Prueba las credenciales antes de guardarlas
TEST=$(curl -s -X POST "https://accounts.zoho.com/oauth/v2/token" \
  --data-urlencode "grant_type=refresh_token" --data-urlencode "client_id=$CID" \
  --data-urlencode "client_secret=$CSEC" --data-urlencode "refresh_token=$RT")
if ! printf '%s' "$TEST" | grep -q '"access_token"'; then
  echo "Las credenciales no funcionan en Zoho: $(printf '%s' "$TEST" | sed 's/"access_token":"[^"]*"/(oculto)/')"
  exit 1
fi
echo "Credenciales verificadas con Zoho."

echo "== 4/5 Guardando variables en Vercel (Production) =="
setvar() {
  $VERCEL env rm "$1" production --yes >/dev/null 2>&1 || true
  printf '%s' "$2" | $VERCEL env add "$1" production >/dev/null
  echo "  ✓ $1"
}
setvar ZOHO_CLIENT_ID "$CID"
setvar ZOHO_CLIENT_SECRET "$CSEC"
setvar ZOHO_REFRESH_TOKEN "$RT"
unset CSEC RT CODE

echo "== 5/5 Publicando en producción =="
$VERCEL deploy --prod --yes

echo
echo "Comprobando conexión con Zoho..."
sleep 5
curl -s "$URL/api/zoho-report?check=1"; echo
echo "Listo. Abre $URL"
