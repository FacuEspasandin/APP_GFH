-- Row Level Security en TODAS las tablas del esquema public, sin políticas.
--
-- Defensa en profundidad: hoy `anon` y `authenticated` (los roles de la Data API
-- de Supabase) no tienen privilegios sobre estas tablas, pero un GRANT olvidado
-- mañana las expondría enteras. Con RLS activo y sin ninguna política, esos roles
-- ven cero filas aunque alguien les dé permisos.
--
-- La app NO se ve afectada: se conecta como `postgres`, que tiene BYPASSRLS (se
-- verificó con pg_roles antes de aplicar esto). El aislamiento entre médicos sigue
-- siendo por `medicoId` en cada consulta — esto no lo reemplaza.
--
-- Una tabla NUEVA nace sin RLS: cada migración que cree una tiene que activarlo
-- (ver la nota en el esquema de Prisma).

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END
$$;
