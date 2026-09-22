// Antes que cualquier import de un Dto: sus decoradores corren al cargar el
// módulo, no al validar una instancia — sin esto explota acá, no en un test.
import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { HerramientaRenalDto } from '../../../presentacion/dto/tratamiento.dto';
import { validarEntradaTool } from './validar';

const ID_VALIDO = '11111111-1111-4111-8111-111111111111';

describe('validarEntradaTool', () => {
  it('acepta un input válido y devuelve una instancia del Dto', async () => {
    const resultado = await validarEntradaTool(HerramientaRenalDto, { principioActivoIds: [ID_VALIDO] });
    expect(resultado).toBeInstanceOf(HerramientaRenalDto);
    expect(resultado.principioActivoIds).toEqual([ID_VALIDO]);
  });

  it('rechaza un campo faltante con un mensaje legible, no un error crudo de Prisma', async () => {
    await expect(validarEntradaTool(HerramientaRenalDto, {})).rejects.toThrow(/Entrada inválida/);
  });

  it('rechaza un uuid mal formado', async () => {
    await expect(
      validarEntradaTool(HerramientaRenalDto, { principioActivoIds: ['no-es-un-uuid'] }),
    ).rejects.toThrow(/Entrada inválida/);
  });

  it('rechaza un campo que el Dto no declara (posible alucinación del modelo)', async () => {
    await expect(
      validarEntradaTool(HerramientaRenalDto, { principioActivoIds: [ID_VALIDO], campoInventado: true }),
    ).rejects.toThrow(/Entrada inválida/);
  });
});
