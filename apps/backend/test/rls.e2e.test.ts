import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { levantarApp, type Contexto } from './ayuda';

/**
 * Toda tabla del esquema public tiene Row Level Security activo.
 *
 * La app se conecta como `postgres` (BYPASSRLS), así que RLS no la afecta: es la
 * red de seguridad por si un GRANT olvidado le abre una tabla a la Data API de
 * Supabase. Una tabla nueva nace SIN RLS; si este test falla, la migración que la
 * creó tiene que agregar `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
 */
describe('RLS en el esquema public', () => {
  let ctx: Contexto;

  beforeAll(async () => {
    ctx = await levantarApp();
  }, 60_000);

  afterAll(async () => {
    await ctx.cerrar();
  });

  it('ninguna tabla queda sin RLS', async () => {
    const sinRls = await ctx.prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT c.relname AS tablename
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity`;

    expect(sinRls.map((t) => t.tablename)).toEqual([]);
  });

  it('los roles de la Data API no tienen privilegios sobre ninguna tabla', async () => {
    const abiertas = await ctx.prisma.$queryRaw<Array<{ tablename: string; rol: string }>>`
      SELECT c.relname AS tablename, r.rolname AS rol
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      CROSS JOIN pg_roles r
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND r.rolname IN ('anon', 'authenticated')
        AND has_table_privilege(r.rolname, c.oid, 'SELECT,INSERT,UPDATE,DELETE')`;

    expect(abiertas).toEqual([]);
  });
});
