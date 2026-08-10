import type { ValidationError } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { mensajeDeValidacion } from './mensajes-validacion';

/** Un error como el que arma class-validator, sin depender de correr la app. */
function error(
  propiedad: string,
  constraints: Record<string, string>,
  contexts?: Record<string, Record<string, unknown>>,
): ValidationError {
  return { property: propiedad, constraints, contexts } as ValidationError;
}

describe('mensajes de validación', () => {
  it('usa tal cual el mensaje propio del DTO', () => {
    const m = mensajeDeValidacion([
      error(
        'password',
        { minLength: 'La contraseña necesita al menos 10 caracteres.' },
        { minLength: { propio: true } },
      ),
    ]);

    expect(m).toBe('La contraseña necesita al menos 10 caracteres.');
  });

  it('reemplaza el mensaje en inglés por el nombre del campo en español', () => {
    const m = mensajeDeValidacion([
      error('nombreUsuario', {
        isLength: 'nombreUsuario must be longer than or equal to 3 characters',
      }),
    ]);

    expect(m).toBe('Revisá el nombre de usuario.');
    expect(m).not.toContain('must be');
  });

  it('combina el mensaje propio con los campos genéricos', () => {
    const m = mensajeDeValidacion([
      error('email', { isEmail: 'El email no es válido.' }, { isEmail: { propio: true } }),
      error('nombreUsuario', { isLength: 'nombreUsuario must be longer...' }),
    ]);

    expect(m).toBe('El email no es válido. Revisá el nombre de usuario.');
  });

  it('enumera varios campos con "y" al final', () => {
    const m = mensajeDeValidacion([
      error('dosis', { isString: 'dosis must be a string' }),
      error('frecuencia', { isString: 'frecuencia must be a string' }),
      error('via', { isString: 'via must be a string' }),
    ]);

    expect(m).toBe('Revisá la dosis, la frecuencia y la vía.');
  });

  it('no repite un campo que falló por dos reglas a la vez', () => {
    const m = mensajeDeValidacion([
      error('pesoKg', { isNumber: 'pesoKg must be a number', min: 'pesoKg must not be less than 0.1' }),
    ]);

    expect(m).toBe('Revisá el peso.');
  });

  it('un campo de más no nombra el campo: es un error del cliente, no del médico', () => {
    const m = mensajeDeValidacion([
      error('rol', { whitelistValidation: 'property rol should not exist' }),
    ]);

    expect(m).toBe('Los datos enviados no son los que espera el servidor.');
    expect(m).not.toContain('rol');
  });

  it('baja a los objetos anidados, como el reemplazo de una alternativa', () => {
    const padre = error('reemplazo', {});
    (padre as { children: ValidationError[] }).children = [
      error('dosis', { isString: 'dosis must be a string' }),
    ];

    expect(mensajeDeValidacion([padre])).toBe('Revisá la dosis.');
  });

  it('un campo sin etiqueta cae en algo legible, no en un vacío', () => {
    const m = mensajeDeValidacion([error('campoNuevo', { isString: 'campoNuevo must be a string' })]);
    expect(m).toBe('Revisá el campo campoNuevo.');
  });

  it('nunca devuelve el string vacío', () => {
    expect(mensajeDeValidacion([])).toBe('Revisá los datos ingresados.');
  });
});
