-- Orden de los eventos del webhook de RevenueCat: no llegan garantizados en
-- orden, y un RENEWAL viejo que llega tarde no debe pisar un EXPIRATION nuevo.
-- Sólo agrega una columna; las filas existentes quedan en null (cualquier evento
-- nuevo se acepta).

-- AlterTable
ALTER TABLE "suscripcion" ADD COLUMN     "ultimoEventoAt" TIMESTAMP(3);
