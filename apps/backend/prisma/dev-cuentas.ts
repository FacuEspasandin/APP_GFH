/**
 * Dos cuentas de prueba para ver el freemium de los dos lados.
 *
 *   pnpm --filter @gfh/backend dev:cuentas
 *
 * Depende de `dev:datos`, que crea el médico `demo` con Ana María y sus siete
 * fármacos. Este script:
 *
 *   · le da suscripción vigente a `demo@gfh.app`  → experiencia PAGA
 *   · crea `gratis@gfh.app` SIN pacientes propios  → experiencia GRATIS
 *
 * La suscripción se escribe directo en la base. Es la única vía posible acá:
 * el camino real de escritura es el webhook de RevenueCat (regla no negociable
 * 6) y no existe ningún endpoint que la app pueda llamar para esto — si
 * existiera, cualquiera con un token se regalaría el plan pago.
 *
 * Para que la diferencia se note, el backend tiene que correr con
 * EXIGIR_SUSCRIPCION=1. Sin eso el guard deja pasar todo y las dos cuentas se
 * comportan igual.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PAGA = { email: 'demo@gfh.app', usuario: 'demo' };
const GRATIS = { email: 'gratis@gfh.app', usuario: 'gratis', password: 'GratisGFH2026!' };

async function main() {
  const { HashService } = await import('../src/aplicacion/auth/hash.service');
  const { calcularClcr, edadEnAnios } = await import('@gfh/shared-types');

  // ---- 1. la cuenta paga -----------------------------------------------
  const dePago = await prisma.medico.findUnique({ where: { nombreUsuario: PAGA.usuario } });
  if (!dePago) {
    throw new Error(`No existe el médico "${PAGA.usuario}". Corré primero: pnpm --filter @gfh/backend dev:datos`);
  }

  const dentroDeUnAnio = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const datosSuscripcion = {
    entitlementId: 'premium',
    productId: 'gfh.mensual',
    store: 'APP_STORE' as const,
    estado: 'ACTIVA' as const,
    periodoActualFin: dentroDeUnAnio,
    ultimoEventoId: `dev-${dePago.id}`,
    ultimoEventoTipo: 'INITIAL_PURCHASE',
  };

  await prisma.suscripcion.upsert({
    where: { medicoId: dePago.id },
    update: datosSuscripcion,
    create: { medicoId: dePago.id, ...datosSuscripcion },
  });

  const pacientesDePago = await prisma.paciente.count({ where: { medicoId: dePago.id } });

  // ---- 2. la cuenta gratis ---------------------------------------------
  const passwordHash = await new HashService().hashearPassword(GRATIS.password);

  const gratuito = await prisma.medico.upsert({
    where: { nombreUsuario: GRATIS.usuario },
    update: { passwordHash, email: GRATIS.email },
    create: {
      email: GRATIS.email,
      nombreUsuario: GRATIS.usuario,
      passwordHash,
      nombre: 'Médico',
      apellido: 'Sin Suscripción',
      disclaimerVersion: '1.0',
      disclaimerAceptadoAt: new Date(),
    },
  });

  // Sin fila de suscripción: es exactamente lo que tiene alguien que se acaba
  // de registrar y no pagó.
  await prisma.suscripcion.deleteMany({ where: { medicoId: gratuito.id } });

  /**
   * Sin pacientes propios. Cero, no uno.
   *
   * El plan gratis ya no incluye ninguno: lo que el médico ve al entrar es el
   * paciente de demostración, que no está en la base —lo arma `DemoService` en
   * memoria y lo pasa por el motor real— y es el mismo para todas las cuentas.
   * Sembrar uno propio acá dejaría en la base un paciente que `/inicio` no va a
   * mostrar, y depurar esa diferencia costaría más que el minuto que ahorra.
   */
  await prisma.paciente.deleteMany({ where: { medicoId: gratuito.id } });

  console.log('\n  CUENTA PAGA');
  console.log(`    ${PAGA.email}  ·  DemoGFH2026!`);
  console.log(`    suscripción ACTIVA hasta ${dentroDeUnAnio.toISOString().slice(0, 10)}`);
  console.log(`    ${pacientesDePago} pacientes — puede crear más`);

  console.log('\n  CUENTA GRATIS');
  console.log(`    ${GRATIS.email}  ·  ${GRATIS.password}`);
  console.log('    sin suscripción, sin pacientes propios');
  console.log('    ve el paciente de demostración con su cockpit completo, y no lo puede tocar');
  console.log('    10 consultas de restricción, contadas por (fármaco, herramienta)');
  console.log('    al crear un paciente → 403 LIMITE_PLAN_GRATIS y la app abre el paywall\n');

  console.log('  Para que el corte se note, el backend tiene que correr con EXIGIR_SUSCRIPCION=1.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
