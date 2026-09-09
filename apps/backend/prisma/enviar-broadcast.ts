/**
 * Anuncio de producto a todos los médicos — herramienta nueva, catálogo
 * actualizado. Es la única notificación de esta lista que no dispara sola:
 * no hay pantalla de administración en v1 (fuera de alcance, ver CLAUDE.md),
 * así que el envío es este script a mano.
 *
 *   pnpm --filter @gfh/backend enviar-broadcast "Título" "Cuerpo del mensaje"
 *
 * No manda nada clínico ni menciona pacientes — mismo criterio que el resto
 * de las push, ver `push.service.ts`.
 */
import { PrismaService } from '../src/infraestructura/prisma/prisma.service';
import { PushService } from '../src/aplicacion/notificaciones/push.service';

async function main() {
  const [titulo, cuerpo] = process.argv.slice(2);
  if (!titulo || !cuerpo) {
    console.error('Uso: enviar-broadcast "Título" "Cuerpo del mensaje"');
    process.exit(1);
  }

  const prisma = new PrismaService();
  const push = new PushService(prisma);

  const cuantos = await push.enviarATodos({ titulo, cuerpo });
  console.log(`Enviado a ${cuantos} dispositivo(s).`);

  await prisma.$disconnect();
}

void main();
