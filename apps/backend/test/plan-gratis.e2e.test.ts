import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { borrarMedicos, cliente, crearMedico, darSuscripcion, levantarApp, type Contexto } from './ayuda';

/**
 * El muro del plan gratis.
 *
 * Lo que estos tests protegen es que el límite viva en el SERVIDOR. Esconder
 * botones en la app no alcanza: cualquiera con un token válido y `curl` tendría
 * el producto entero, y el primero que lo pruebe lo publica.
 */
describe('plan gratis', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  let gratis: { id: string; token: string };
  let pago: { id: string; token: string };

  const NUEVO = {
    nombre: 'Prueba',
    apellido: 'Plan',
    fechaNacimiento: '1960-01-01T00:00:00.000Z',
    sexo: 'M',
  };

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);

    gratis = await crearMedico(api);
    pago = await crearMedico(api);
    medicos.push(gratis.id, pago.id);
    await darSuscripcion(ctx.prisma, pago.id);
  }, 90_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  describe('pacientes', () => {
    it('sin suscripción NO se puede crear ninguno', async () => {
      const r = await api.post('/pacientes', NUEVO, gratis.token);
      expect(r.status).toBe(403);
      expect(r.cuerpo!.error?.code ?? (r.cuerpo as never as { codigo: string }).codigo).toBeTruthy();
    });

    it('con suscripción sí', async () => {
      const r = await api.post('/pacientes', NUEVO, pago.token);
      expect(r.status).toBe(201);
    });

    it('el inicio de una cuenta gratis trae SÓLO el de demostración', async () => {
      const r = await api.get('/inicio', gratis.token);
      expect(r.status).toBe(200);

      const d = r.cuerpo!.data as {
        pacientes: { id: string }[];
        grupos: { nombre: string }[];
        soloDemostracion?: boolean;
      };
      expect(d.soloDemostracion).toBe(true);
      expect(d.pacientes).toHaveLength(1);
      expect(d.pacientes[0]!.id.startsWith('demo-')).toBe(true);
      expect(d.grupos[0]!.nombre).toBe('Consultorio');
    });

    it('el paciente de demostración se puede mirar entero', async () => {
      const r = await api.get('/pacientes/demo-paciente-0000-0000-000000000001/cockpit', gratis.token);
      expect(r.status).toBe(200);

      const d = r.cuerpo!.data as {
        hallazgos: unknown[];
        prescripciones: unknown[];
        esDemostracion?: boolean;
      };
      expect(d.esDemostracion).toBe(true);
      // El escaparate no sirve vacío: tiene que traer tratamiento y hallazgos.
      expect(d.prescripciones.length).toBeGreaterThan(3);
      expect(d.hallazgos.length).toBeGreaterThan(5);
    });

    it('sobre el de demostración no se puede escribir', async () => {
      const r = await api.patch(
        '/pacientes/demo-paciente-0000-0000-000000000001',
        { apellido: 'Cambiado' },
        gratis.token,
      );
      expect(r.status).toBe(403);
    });
  });

  describe('herramientas', () => {
    it('las que CRUZAN piden suscripción', async () => {
      const r = await api.post('/herramientas/interacciones', { principioActivoIds: [] }, gratis.token);
      expect(r.status).toBe(403);
    });

    it('la calculadora de Child-Pugh es libre', async () => {
      // Es una fórmula publicada: cobrarla nos pondría a competir con
      // cualquier calculadora web.
      const r = await api.post(
        '/herramientas/ajuste-hepatico',
        { bilirrubinaMgDl: 1, albuminaGDl: 4, inr: 1.1, ascitis: 'AUSENTE', encefalopatia: 'AUSENTE' },
        gratis.token,
      );
      expect(r.status).toBe(200);
      expect(r.cuerpo!.data.clase).toBe('A');
    });
  });

  describe('las diez consultas', () => {
    let productos: string[] = [];

    beforeAll(async () => {
      const filas = await ctx.prisma.productoComercial.findMany({ take: 4, select: { id: true } });
      productos = filas.map((p) => p.id);
    });

    const consultar = (token: string, productoId: string, herramienta: string) =>
      api.post(`/catalogo/productos/${productoId}/restricciones/${herramienta}`, {}, token);

    it('la ficha se ve sin gastar cupo', async () => {
      const r = await api.get(`/catalogo/productos/${productos[0]}`, gratis.token);
      expect(r.status).toBe(200);
      expect(await ctx.prisma.consultaGratis.count({ where: { medicoId: gratis.id } })).toBe(0);
    });

    it('la ficha trae el ESTADO de cada restricción, no el detalle', async () => {
      // Es la costura por donde el muro se saltearía sin tocar la app: si la
      // ficha —que es libre— mandara las tablas y las alertas completas,
      // esconderlas en la pantalla sería maquillaje y un `curl` tendría las
      // cinco respuestas sin gastar una sola consulta.
      const r = await api.get(`/catalogo/productos/${productos[0]}`, gratis.token);
      const d = r.cuerpo!.data as Record<string, unknown>;

      const restricciones = d.restricciones as Array<{ clave: string; estado: string }>;
      expect(restricciones.map((x) => x.clave)).toEqual([
        'embarazo',
        'lactancia',
        'renal',
        'hepatico',
      ]);
      expect((d.interacciones as { total: number }).total).toBeGreaterThanOrEqual(0);

      for (const campo of [
        'tablasRenales',
        'embarazo',
        'lactancia',
        'gruposInteraccion',
        'interaccionesConocidas',
      ]) {
        expect(campo in d, `la ficha libre no debería traer «${campo}»`).toBe(false);
      }
    });

    it('entrar a una restricción gasta una', async () => {
      const r = await consultar(gratis.token, productos[0]!, 'renal');
      expect(r.status).toBe(200);
      expect(await ctx.prisma.consultaGratis.count({ where: { medicoId: gratis.id } })).toBe(1);
    });

    it('volver a la MISMA no gasta otra', async () => {
      await consultar(gratis.token, productos[0]!, 'renal');
      await consultar(gratis.token, productos[0]!, 'renal');
      expect(await ctx.prisma.consultaGratis.count({ where: { medicoId: gratis.id } })).toBe(1);
    });

    it('otra herramienta del mismo fármaco sí gasta', async () => {
      await consultar(gratis.token, productos[0]!, 'embarazo');
      expect(await ctx.prisma.consultaGratis.count({ where: { medicoId: gratis.id } })).toBe(2);
    });

    it('a la décima corta, y con su propio código', async () => {
      const herramientas = ['interacciones', 'renal', 'hepatico', 'embarazo', 'lactancia'];
      for (const p of productos) {
        for (const h of herramientas) {
          await consultar(gratis.token, p!, h);
        }
      }

      const usadas = await ctx.prisma.consultaGratis.count({ where: { medicoId: gratis.id } });
      expect(usadas).toBe(10);

      const r = await consultar(gratis.token, productos[3]!, 'lactancia');
      expect(r.status).toBe(403);
      // Veinte peticiones seguidas contra la base real: el tiempo por defecto
      // no alcanza y el corte es lo que se quiere probar, no la velocidad.
    }, 120_000);

    it('el suscriptor no gasta nada', async () => {
      for (const h of ['interacciones', 'renal', 'embarazo', 'lactancia', 'hepatico']) {
        const r = await consultar(pago.token, productos[0]!, h);
        expect(r.status).toBe(200);
      }
      expect(await ctx.prisma.consultaGratis.count({ where: { medicoId: pago.id } })).toBe(0);
    });

    it('el detalle trae sólo su herramienta, no las cinco', async () => {
      // Si viniera todo junto, una consulta pagaría por las otras cuatro.
      const r = await consultar(pago.token, productos[0]!, 'renal');
      const d = r.cuerpo!.data as Record<string, unknown>;
      expect(d.herramienta).toBe('RENAL');
      expect('tablasRenales' in d).toBe(true);
      expect('gruposInteraccion' in d).toBe(false);
      expect('alertas' in d).toBe(false);
    });
  });
});
