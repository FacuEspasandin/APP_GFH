#!/usr/bin/env bash
# Restaura un respaldo de GFH en una base VACÍA y muestra conteos para comparar.
#
#   RESTAURAR_EN=postgresql://... ./scripts/backup/restaurar.sh [clave-del-respaldo]
#
# Sin clave usa el más reciente. Un respaldo que nunca se restauró no es un
# respaldo: correr esto una vez antes del primer paciente real, y de vez en cuando.
#
# RESTAURAR_EN es una base DESCARTABLE (un proyecto de Supabase nuevo, o Postgres
# local con las extensiones `vector` y `pg_trgm`). El script se NIEGA a correr contra
# la base de producción si RESTAURAR_EN es igual a BACKUP_DATABASE_URL.
#
# Variables: RESTAURAR_EN, BACKUP_PASSPHRASE, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
# R2_SECRET_ACCESS_KEY, R2_BUCKET

set -euo pipefail

for v in RESTAURAR_EN BACKUP_PASSPHRASE R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET; do
  if [ -z "${!v:-}" ]; then
    echo "Falta la variable $v" >&2
    exit 1
  fi
done

if [ -n "${BACKUP_DATABASE_URL:-}" ] && [ "$RESTAURAR_EN" = "$BACKUP_DATABASE_URL" ]; then
  echo "RESTAURAR_EN es la base de producción. Usá una base descartable." >&2
  exit 1
fi

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

CLAVE="${1:-}"
if [ -z "$CLAVE" ]; then
  CLAVE="$(aws s3 ls "s3://${R2_BUCKET}/" --endpoint-url "$ENDPOINT" | awk '{print $4}' | grep '^gfh-.*\.dump\.enc$' | sort | tail -n 1)"
fi
[ -n "$CLAVE" ] || { echo "No hay respaldos en el bucket." >&2; exit 1; }
echo "Restaurando: $CLAVE"

CIFRADO="$(mktemp)"
CRUDO="$(mktemp)"
trap 'rm -f "$CIFRADO" "$CRUDO"' EXIT

aws s3 cp "s3://${R2_BUCKET}/${CLAVE}" "$CIFRADO" --endpoint-url "$ENDPOINT" --only-show-errors
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass env:BACKUP_PASSPHRASE -in "$CIFRADO" -out "$CRUDO"

# Las extensiones tienen que existir antes: el dump las referencia pero no las crea.
psql "$RESTAURAR_EN" -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS pgcrypto;'

# Sin `--exit-on-error`: el dump puede traer `CREATE EXTENSION` de algo que ya
# creamos arriba y eso da "already exists", que no es un fallo. Se juntan los
# errores y se ignoran sólo esos; cualquier otro corta la restauración.
ERRORES="$(mktemp)"
trap 'rm -f "$CIFRADO" "$CRUDO" "$ERRORES"' EXIT
pg_restore --dbname="$RESTAURAR_EN" --no-owner --no-privileges "$CRUDO" 2> "$ERRORES" || true
if grep -i "error" "$ERRORES" | grep -vi "already exists" > /dev/null; then
  echo "pg_restore reportó errores:" >&2
  grep -i "error" "$ERRORES" | grep -vi "already exists" | head -n 20 >&2
  exit 1
fi

echo "--- conteos en la base restaurada ---"
psql "$RESTAURAR_EN" -At -c "
  SELECT 'medico', count(*) FROM medico UNION ALL
  SELECT 'paciente', count(*) FROM paciente UNION ALL
  SELECT 'prescripcion', count(*) FROM prescripcion UNION ALL
  SELECT 'principio_activo', count(*) FROM principio_activo UNION ALL
  SELECT 'interaccion_curada', count(*) FROM interaccion_curada;"
echo "Compará estos números con la base de origen antes de dar el respaldo por bueno."
