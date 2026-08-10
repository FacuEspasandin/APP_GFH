import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { argon2id, argon2Verify } from 'hash-wasm';

/**
 * Hashing de credenciales.
 *
 * Dos mecanismos distintos a propósito, porque protegen cosas distintas:
 *
 * · CONTRASEÑAS → Argon2id. Son de baja entropía y elegidas por humanos, así
 *   que hace falta una función deliberadamente lenta y con costo de memoria
 *   para que un atacante con la base robada no pueda probar millones por
 *   segundo. Nunca SHA, nunca MD5.
 *
 * · REFRESH TOKENS → SHA-256. Son 32 bytes aleatorios: no hay nada que
 *   adivinar, el espacio de búsqueda ya es inatacable. Un KDF lento acá no
 *   agrega seguridad y sí agregaría ~100 ms a cada refresh. Además permite
 *   buscar la sesión por hash con un índice único, que es lo que hace barata
 *   la detección de reuso.
 *
 * NOTA: se usa la implementación WASM de Argon2 (`hash-wasm`) y no una nativa.
 * Es interoperable con el formato estándar `$argon2id$...`, así que cambiar a
 * una nativa más adelante no invalida los hashes ya guardados.
 */
@Injectable()
export class HashService {
  /** Parámetros recomendados por OWASP para Argon2id (m=19 MiB, t=2, p=1). */
  private readonly memoriaKiB = 19_456;
  private readonly iteraciones = 2;
  private readonly paralelismo = 1;

  async hashearPassword(password: string): Promise<string> {
    return argon2id({
      password,
      salt: randomBytes(16),
      parallelism: this.paralelismo,
      iterations: this.iteraciones,
      memorySize: this.memoriaKiB,
      hashLength: 32,
      outputType: 'encoded',
    });
  }

  async verificarPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2Verify({ password, hash });
    } catch {
      // Hash con formato inválido o corrupto: se trata como credencial
      // incorrecta, no como error del servidor.
      return false;
    }
  }

  /** Token opaco de 32 bytes. Se devuelve UNA vez y no se vuelve a poder leer. */
  generarTokenOpaco(): string {
    return randomBytes(32).toString('base64url');
  }

  hashearToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
