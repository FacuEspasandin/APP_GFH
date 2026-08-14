import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

import { esDelDemo } from '../../aplicacion/demo/paciente-demo';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Un id de paciente: un uuid, o uno de los ids reservados del paciente de
 * demostración.
 *
 * Existe porque el de demostración no está en la base y su id no es un uuid, así
 * que `ParseUUIDPipe` lo rechazaría. Sin esta pieza la alternativa era sacar la
 * validación —y ahí `/pacientes/no-es-uuid` deja de dar 400 y llega hasta
 * Prisma, que responde con otro código y otro mensaje.
 */
@Injectable()
export class IdPacientePipe implements PipeTransform<string, string> {
  transform(valor: string): string {
    if (esDelDemo(valor) || UUID.test(valor)) return valor;
    throw new BadRequestException('Validation failed (uuid is expected)');
  }
}
