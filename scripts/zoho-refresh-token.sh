#!/bin/bash
# Cambia el código del Self Client de Zoho por un refresh token.
# Uso (en Terminal, dentro de la carpeta soporte):  bash scripts/zoho-refresh-token.sh
# Los valores se escriben aquí y no se guardan en ningún archivo.
set -e
read -r  -p "Client ID: " CID
read -rs -p "Client Secret (no se muestra): " CSEC; echo
read -rs -p "Código generado en 'Generate Code' (no se muestra): " CODE; echo
RESP=$(curl -s -X POST "https://accounts.zoho.com/oauth/v2/token" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "client_id=$CID" \
  --data-urlencode "client_secret=$CSEC" \
  --data-urlencode "code=$CODE")
RT=$(printf '%s' "$RESP" | sed -n 's/.*"refresh_token":"\([^"]*\)".*/\1/p')
if [ -n "$RT" ]; then
  echo
  echo "ZOHO_REFRESH_TOKEN (cópialo en Vercel):"
  echo "$RT"
else
  echo
  echo "Zoho no devolvió refresh token. Respuesta:"
  printf '%s\n' "$RESP" | sed 's/"access_token":"[^"]*"/"access_token":"(oculto)"/'
  echo "Si dice invalid_code: el código venció (dura 10 min) o ya se usó; genera otro."
fi
