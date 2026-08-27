import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { PerfilService } from '../../aplicacion/perfil/perfil.service';

const UNA_HORA = 60 * 60 * 1000;

/**
 * Purga periódica de sesiones vencidas.
 *
 * La rotación de refresh crea una fila por cada renovación, así que sin esto la
 * tabla crece sin techo: un médico activo genera decenas de filas por mes y
 * ninguna se borra sola.
 *
 * Corre al arrancar y después cada hora. Es un `setInterval` y no un cron
 * porque no hace falta precisión horaria — sólo que ocurra.
 *
 * OJO si algún día hay más de una instancia del backend: las dos van a purgar.
 * No rompe nada (el `deleteMany` es idempotente) pero conviene moverlo a un
 * job único cuando se escale horizontalmente.
 */
@Injectable()
export class PurgaSesionesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PurgaSesionesService.name);
  private temporizador: NodeJS.Timeout | null = null;

  constructor(@Inject(PerfilService) private readonly perfil: PerfilService) {}

  onModuleInit(): void {
    void this.purgar();
    this.temporizador = setInterval(() => void this.purgar(), UNA_HORA);
    // Sin unref, el proceso no termina nunca: el intervalo lo mantiene vivo y
    // el contenedor no responde a un SIGTERM.
    this.temporizador.unref();
  }

  onModuleDestroy(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  private async purgar(): Promise<void> {
    try {
      const borradas = await this.perfil.purgarSesiones();
      if (borradas > 0) this.logger.log(`Sesiones purgadas: ${borradas}`);
    } catch (e) {
      // Que falle la purga no puede tumbar la app: es mantenimiento.
      this.logger.error(`No se pudo purgar sesiones: ${String(e)}`);
    }

    /*
     * Las cuentas dadas de baja cuyos siete días vencieron.
     *
     * Va en su propio `try`: si falla la purga de sesiones, las cuentas se
     * purgan igual, y al revés. Son dos mantenimientos independientes, y
     * encadenarlos haría que un error en el barato frene al caro.
     *
     * Se loguea como advertencia y no como info, aunque borre una sola: es la
     * única operación de la app que destruye historia clínica, y tiene que
     * dejar rastro en el log además del `AuditLog`.
     */
    try {
      const cuentas = await this.perfil.purgarCuentasVencidas();
      if (cuentas > 0) this.logger.warn(`Cuentas purgadas definitivamente: ${cuentas}`);
    } catch (e) {
      this.logger.error(`No se pudieron purgar cuentas vencidas: ${String(e)}`);
    }
  }
}
