#!/bin/bash
# Crea .env.vercel (ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN) a partir del
# self_client.json que descarga Zoho (Self Client → Generate Code → Download).
# Uso:  bash scripts/env-desde-self-client.sh ~/Downloads/self_client.json
# Luego en Vercel → Environment Variables → Add → "Import .env" y elige .env.vercel.
set -e
cd "$(dirname "$0")/.."
F="${1:-$HOME/Downloads/self_client.json}"
[ -f "$F" ] || { echo "No encuentro $F"; exit 1; }
get() { sed -n "s/.*\"$1\":\"\([^\"]*\)\".*/\1/p" "$F"; }
CID=$(get client_id); CSEC=$(get client_secret); CODE=$(get code)
RESP=$(curl -s -X POST "https://accounts.zoho.com/oauth/v2/token" \
  --data-urlencode "grant_type=authorization_code" --data-urlencode "client_id=$CID" \
  --data-urlencode "client_secret=$CSEC" --data-urlencode "code=$CODE")
RT=$(printf '%s' "$RESP" | sed -n 's/.*"refresh_token":"\([^"]*\)".*/\1/p')
if [ -z "$RT" ]; then
  echo "Zoho no devolvió refresh token: $(printf '%s' "$RESP" | sed 's/"access_token":"[^"]*"/(oculto)/')"
  echo "Si dice invalid_code: el código venció (10 min) o ya se usó. Genera uno nuevo, descarga el JSON y repite."
  exit 1
fi
printf 'ZOHO_CLIENT_ID=%s\nZOHO_CLIENT_SECRET=%s\nZOHO_REFRESH_TOKEN=%s\n' "$CID" "$CSEC" "$RT" > .env.vercel
cp .env.vercel .env   # para pruebas locales con npm run dev
echo "Listo: se creó .env.vercel en $(pwd)"
echo "En Vercel → Settings → Environment Variables → Add Environment Variable → 'Import .env' → elige .env.vercel → Production → Save → Redeploy."
