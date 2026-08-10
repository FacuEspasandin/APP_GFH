import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  borrarMedicos,
  buscarPrincipioActivo,
  buscarProducto,
  cliente,
  crearMedico,
  crearPaciente,
  levantarApp,
  type Contexto,
} from './ayuda';

/**
 * La capa HTTP: filtros, códigos de error, parseo del cuerpo, validación.
 *
 * Cada test de acá corresponde a un error que ya se escapó a producción de
 * desarrollo. No son hipotéticos.
 */
describe('contrato HTTP', () => {
  let ctx: Contexto;
  let api: ReturnType<typeof cliente>;
  const medicos: string[] = [];
  let medico: { id: string; email: string; token: string; refresh: string };

  beforeAll(async () => {
    ctx = await levantarApp();
    api = cliente(ctx.app);
    medico = await crearMedico(api);
    medicos.push(medico.id);
  }, 60_000);

  afterAll(async () => {
    await borrarMedicos(ctx.prisma, medicos);
    await ctx.cerrar();
  });

  describe('DELETE sin cuerpo', () => {
    /**
     * El cliente mandaba `content-type: application/json` en todos los
     * requests. Fastify rechaza con 400 uno que declara JSON y viene vacío, así
     * que TODOS los borrados de la app estaban rotos: eliminar paciente, quitar
     * alergia, cerrar sesión. Las pruebas con curl no lo veían porque curl no
     * manda ese header.
     */
    it('funciona sin content-type, como lo manda la app', async () => {
      const grupo = await api.post('/grupos', { nombre: 'Para borrar' }, medico.token);
      const r = await api.delete(`/grupos/${grupo.cuerpo!.data.id}`, medico.token);
      expect(r.status).toBe(204);
    });

    it('con content-type: application/json y sin cuerpo, Fastify lo rechaza', async () => {
      const grupo = await api.post('/grupos', { nombre: 'Para borrar 2' }, medico.token);
      const r = await api.deleteConContentType(`/grupos/${grupo.cuerpo!.data.id}`, medico.token);

      // Se documenta el comportamiento del servidor: es correcto que falle. Lo
      // que estaba mal era que el cliente mandara ese header sin cuerpo.
      expect(r.status).toBe(400);

      // Y el grupo NO se borró, que es lo que hacía que la app pareciera muda.
      const quedo = await api.get('/inicio', medico.token);
      expect(
        quedo.cuerpo!.data.grupos.some((g: { nombre: string }) => g.nombre === 'Para borrar 2'),
      ).toBe(true);
    });
  });

  describe('códigos de error propios', () => {
    /**
     * El filtro de excepciones descartaba el `codigo` de la excepción y
     * devolvía el genérico del status. Resultado: la app no podía distinguir un
     * 409 que se puede confirmar de uno que no, y ofrecía "confirmar igual"
     * ante una alergia grave.
     */
    it('un 409 con código propio no se aplasta al genérico', async () => {
      const paciente = await crearPaciente(api, medico.token);
      const amoxi = await buscarPrincipioActivo(api, medico.token, 'Amoxicilina');

      await api.post(
        `/pacientes/${paciente}/alergias`,
        { tipo: 'FARMACOLOGICA', severidad: 'GRAVE', principioActivoId: amoxi.id },
        medico.token,
      );

      const producto = await buscarProducto(api, medico.token, 'Amoxicilina');
      const r = await api.post(
        `/pacientes/${paciente}/prescripciones`,
        { productoComercialId: producto.id, dosis: '500 mg', frecuencia: 'cada 8 h', via: 'ORAL' },
        medico.token,
      );

      expect(r.status).toBe(409);
      expect(r.cuerpo!.error!.code).toBe('ALERGIA_BLOQUEA');
      expect(r.cuerpo!.error!.code).not.toBe('CONFLICTO');
    });

    it('una alergia grave exacta BLOQUEA y no se puede forzar', async () => {
      const paciente = await crearPaciente(api, medico.token);
      const amoxi = await buscarPrincipioActivo(api, medico.token, 'Amoxicilina');
      await api.post(
        `/pacientes/${paciente}/alergias`,
        { tipo: 'FARMACOLOGICA', severidad: 'GRAVE', principioActivoId: amoxi.id },
        medico.token,
      );

      const producto = await buscarProducto(api, medico.token, 'Amoxicilina');
      // Reintentar con la confirmación NO tiene que alcanzar: sólo el cruce de
      // familia se confirma, la coincidencia exacta y grave no.
      const forzado = await api.post(
        `/pacientes/${paciente}/prescripciones`,
        {
          productoComercialId: producto.id,
          dosis: '500 mg',
          frecuencia: 'cada 8 h',
          via: 'ORAL',
          confirmarAlergiaCruzada: true,
        },
        medico.token,
      );

      expect(forzado.status).toBe(409);
      expect(forzado.cuerpo!.error!.code).toBe('ALERGIA_BLOQUEA');

      const cockpit = await api.get(`/pacientes/${paciente}/cockpit`, medico.token);
      expect(cockpit.cuerpo!.data.prescripciones).toHaveLength(0);
    });

    it('un choque de restricción única devuelve 409 y no 500', async () => {
      await api.post('/grupos', { nombre: 'Duplicado' }, medico.token);
      const r = await api.post('/grupos', { nombre: 'Duplicado' }, medico.token);

      expect(r.status).toBe(409);
      expect(r.cuerpo!.error!.code).toBe('YA_EXISTE');
      expect(r.cuerpo!.error!.message).not.toContain('inesperado');
    });
  });

  describe('validación de entrada', () => {
    it('rechaza un campo que el DTO no declara', async () => {
      const r = await api.post('/grupos', { nombre: 'X', rol: 'ADMIN' }, medico.token);
      expect(r.status).toBe(400);
    });

    it('rechaza un id que no es UUID', async () => {
      expect((await api.get('/pacientes/no-es-uuid', medico.token)).status).toBe(400);
    });

    it('rechaza una contraseña corta al registrarse', async () => {
      const r = await api.post('/auth/registro', {
        email: 'corta@gfh.test',
        nombreUsuario: 'corta',
        password: 'abc',
        nombre: 'A',
        apellido: 'B',
      });
      expect(r.status).toBe(400);
    });
  });

  describe('envoltura de respuesta', () => {
    it('el éxito viene con success/data/message', async () => {
      const r = await api.get('/inicio', medico.token);
      expect(r.cuerpo).toMatchObject({ success: true, message: '' });
      expect(r.cuerpo!.data).toBeDefined();
    });

    it('el error viene con success/error/code/message', async () => {
      const r = await api.get('/pacientes/00000000-0000-4000-8000-000000000000', medico.token);
      expect(r.cuerpo!.success).toBe(false);
      expect(r.cuerpo!.error).toMatchObject({ code: expect.any(String), message: expect.any(String) });
    });

    it('un error interno no filtra el stack', async () => {
      const r = await api.get('/pacientes/00000000-0000-4000-8000-000000000000', medico.token);
      expect(JSON.stringify(r.cuerpo)).not.toContain('at ');
      expect(JSON.stringify(r.cuerpo)).not.toContain('node_modules');
    });
  });
});
