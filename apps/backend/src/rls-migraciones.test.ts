import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Las migraciones no pueden dejar una tabla nueva sin RLS ni abrirla a la Data API.
 *
 * `test/rls.e2e.test.ts` verifica lo mismo contra la base real, pero corre a mano
 * porque necesita la base. Este corre en CI, sin base: lee los `.sql`.
 *
 * Contexto: la migración `rls_en_todas_las_tablas` activó RLS en las tablas que
 * existían en ese momento. Una tabla creada DESPUÉS nace sin RLS, y Supabase deja
 * de dar acceso automático a la Data API a las tablas nuevas el 30/10/2026: si
 * alguien «arregla» un error de permisos con un GRANT a `anon`/`authenticated`,
 * la tabla queda expuesta.
 */

const CARPETA = join(__dirname, '..', 'prisma', 'migrations');
const MIGRACION_RLS_GLOBAL = 'rls_en_todas_las_tablas';

const migraciones = readdirSync(CARPETA, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => ({ nombre: d.name, sql: readFileSync(join(CARPETA, d.name, 'migration.sql'), 'utf8') }))
  .sort((a, b) => a.nombre.localeCompare(b.nombre));

const desdeComentarios = (sql: string) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('migraciones y RLS', () => {
  it('existe la migración que activa RLS en todas las tablas', () => {
    expect(migraciones.some((m) => m.nombre.endsWith(MIGRACION_RLS_GLOBAL))).toBe(true);
  });

  it('toda tabla creada después de esa migración activa RLS', () => {
    const indice = migraciones.findIndex((m) => m.nombre.endsWith(MIGRACION_RLS_GLOBAL));
    const posteriores = migraciones.slice(indice + 1);

    const creadas = posteriores.flatMap((m) =>
      [...desdeComentarios(m.sql).matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:"?public"?\.)?"?(\w+)"?/gi)].map(
        (x) => ({ tabla: x[1]!, migracion: m.nombre }),
      ),
    );
    const conRls = new Set(
      posteriores.flatMap((m) =>
        [...desdeComentarios(m.sql).matchAll(/ALTER TABLE\s+(?:ONLY\s+)?(?:"?public"?\.)?"?(\w+)"?\s+ENABLE ROW LEVEL SECURITY/gi)].map(
          (x) => x[1]!,
        ),
      ),
    );

    const sinRls = creadas.filter((c) => !conRls.has(c.tabla)).map((c) => `${c.tabla} (${c.migracion})`);
    expect(
      sinRls,
      'Agregá `ALTER TABLE "<tabla>" ENABLE ROW LEVEL SECURITY;` en la misma migración que crea la tabla.',
    ).toEqual([]);
  });

  it('ninguna migración da privilegios a anon ni authenticated', () => {
    const abiertas = migraciones
      .filter((m) => /GRANT\s[\s\S]*?\sTO\s[^;]*\b(anon|authenticated)\b/i.test(desdeComentarios(m.sql)))
      .map((m) => m.nombre);
    expect(
      abiertas,
      'La app usa Prisma como `postgres`; esos roles son los de la Data API y no tienen que ver ninguna tabla.',
    ).toEqual([]);
  });
});
