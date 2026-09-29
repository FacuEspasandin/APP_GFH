#!/usr/bin/env bash
# Respaldo de la base de GFH: pg_dump -> cifrado -> bucket privado de Cloudflare R2.
#
# Lo corre el workflow `.github/workflows/backup.yml` cada noche. También sirve a
# mano si están las variables de abajo en el entorno.
#
# Variables (todas obligatorias; el workflow las saca de los secretos del repo):
#   BACKUP_DATABASE_URL   conexión DIRECTA a Postgres (no el pooler): pg_dump necesita sesión completa
#   BACKUP_PASSPHRASE     frase con la que se cifra el archivo. Sin ella el respaldo no se puede abrir:
#                         guardala también FUERA de GitHub (gestor de contraseñas)
#   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
# Opcional:
#   BACKUP_RETENCION      cuántos respaldos se conservan (por defecto 30)
#
# El archivo tiene datos clínicos de pacientes: sale cifrado del runner y NUNCA se
# sube como artifact de GitHub (este repo es público). Los logs no imprimen ninguna
# de las variables.

set -euo pipefail

for v in BACKUP_DATABASE_URL BACKUP_PASSPHRASE R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET; do
  if [ -z "${!v:-}" ]; then
    echo "Falta la variable $v" >&2
    exit 1
  fi
done

RETENCION="${BACKUP_RETENCION:-30}"
SELLO="$(date -u +%Y%m%dT%H%M%SZ)"
CRUDO="$(mktemp)"
CIFRADO="$(mktemp)"
trap 'rm -f "$CRUDO" "$CIFRADO"' EXIT

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# Sólo el esquema `public`: los de Supabase (auth, storage…) no son nuestros y no
# se restauran en otra base. Formato custom (-Fc): comprimido y restaurable por partes.
pg_dump "$BACKUP_DATABASE_URL" --schema=public --no-owner --no-privileges --format=custom --file="$CRUDO"

openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass env:BACKUP_PASSPHRASE -in "$CRUDO" -out "$CIFRADO"

CLAVE="gfh-${SELLO}.dump.enc"
aws s3 cp "$CIFRADO" "s3://${R2_BUCKET}/${CLAVE}" --endpoint-url "$ENDPOINT" --only-show-errors
echo "Respaldo subido: ${CLAVE} ($(wc -c < "$CIFRADO") bytes cifrados)"

# Retención: se borran los más viejos, dejando los últimos $RETENCION. Los nombres
# llevan la fecha en orden alfabético, así que ordenar por nombre es ordenar por fecha.
aws s3 ls "s3://${R2_BUCKET}/" --endpoint-url "$ENDPOINT" \
  | awk '{print $4}' | grep '^gfh-.*\.dump\.enc$' | sort \
  | head -n "-${RETENCION}" \
  | while read -r viejo; do
      aws s3 rm "s3://${R2_BUCKET}/${viejo}" --endpoint-url "$ENDPOINT" --only-show-errors
      echo "Borrado por retención: ${viejo}"
    done
