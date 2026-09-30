import { beforeEach, describe, expect, it } from 'vitest';

import { borrar, leer } from './almacen';
import { borrarClaveDeCifrado, cifrar, descifrar } from './cifrado-offline';

const CLAVE_DE_CIFRADO = 'gfh.claveOfflineV1';

describe('cifrado de la copia offline', () => {
  beforeEach(async () => {
    await borrar(CLAVE_DE_CIFRADO);
  });

  it('cifra y descifra el mismo texto', async () => {
    const original = JSON.stringify({ nombre: 'Ana', condiciones: ['diabetes'] });
    const cifrado = await cifrar(original);

    expect(cifrado).not.toContain('Ana');
    expect(await descifrar(cifrado)).toBe(original);
  });

  it('la clave se genera una sola vez y queda en el almacén seguro', async () => {
    await cifrar('primero');
    const claveTrasElPrimero = await leer(CLAVE_DE_CIFRADO);
    expect(claveTrasElPrimero).not.toBeNull();

    await cifrar('segundo');
    expect(await leer(CLAVE_DE_CIFRADO)).toBe(claveTrasElPrimero);
  });

  it('dos cifrados del mismo texto no son iguales (el IV cambia)', async () => {
    const a = await cifrar('mismo texto');
    const b = await cifrar('mismo texto');
    expect(a).not.toBe(b);
  });

  it('sin la clave (se borró, ej. al cerrar sesión) ya no se puede descifrar', async () => {
    const cifrado = await cifrar('dato de un paciente');
    await borrarClaveDeCifrado();

    expect(await descifrar(cifrado)).toBeNull();
  });

  it('un texto que no es un cifrado válido da null y no tira', async () => {
    await cifrar('para que exista una clave');
    expect(await descifrar('no es hex cifrado')).toBeNull();
    expect(await descifrar('')).toBeNull();
  });

  it('texto con acentos y emoji viaja entero (UTF-8, no sólo ASCII)', async () => {
    const original = 'María José — alergia a peñicilina 💊';
    expect(await descifrar(await cifrar(original))).toBe(original);
  });
});
