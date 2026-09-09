import type { TipoNotificacionPush } from '@prisma/client';

import type { ContenidoPush } from './push.service';

/**
 * El texto de cada notificación de escaneo periódico, en un solo lugar — así
 * cambiar una palabra no obliga a buscarla adentro del cron. Las
 * event-driven (nuevo dispositivo, contraseña cambiada, problema de cobro) no
 * están acá: se arman en el punto donde ocurre el evento, porque necesitan un
 * dato del momento (la fecha, el motivo) que esta tabla no tiene.
 */
export const MENSAJES_NOTIFICACION: Record<TipoNotificacionPush, ContenidoPush> = {
  ACTIVACION_D1: {
    titulo: '¿Con qué te trabaste?',
    cuerpo: 'Probá el buscador o cargá tu primer paciente.',
  },
  TRIAL_2_DIAS: {
    titulo: 'Te quedan 2 días de prueba gratis',
    cuerpo: 'Después seguís con el plan gratis, sin perder nada de lo cargado.',
  },
  TRIAL_ULTIMO_DIA: {
    titulo: 'Tu prueba termina hoy',
    cuerpo: 'Después volvés al plan gratis — tus pacientes cargados no se pierden.',
  },
  TRIAL_VENCIDO_WINBACK: {
    titulo: '¿Viste todo lo que podés hacer con GFH?',
    cuerpo: 'Pacientes ilimitados, sin límite de consultas, y carga de tratamiento por foto.',
  },
  CANCELACION_WINBACK: {
    titulo: '¿Cambiaste de idea?',
    cuerpo: 'Tu plan sigue activo hasta el fin del período. Podés reactivar la renovación cuando quieras.',
  },
  CUPO_8_DE_10: {
    titulo: 'Te quedan 2 consultas gratis',
    cuerpo: 'De las 10 de restricción que trae la cuenta.',
  },
  CUPO_AGOTADO: {
    titulo: 'Se acabaron tus consultas gratis',
    cuerpo: 'Con la suscripción no se cuentan más.',
  },
  INACTIVO_7D: {
    titulo: 'Volvé a GFH',
    cuerpo: 'Tu cuenta y tus pacientes siguen ahí.',
  },
  INACTIVO_30D: {
    titulo: 'Hace un mes que no entrás',
    cuerpo: 'Tu cuenta sigue activa cuando quieras volver.',
  },
  CUENTA_GRACIA_AVISO: {
    titulo: 'Tu cuenta se elimina en 2 días',
    cuerpo: 'Entrá con tu contraseña para cancelarlo.',
  },
};
