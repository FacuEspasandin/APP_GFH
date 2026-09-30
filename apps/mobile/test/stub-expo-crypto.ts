/** expo-crypto fuera del teléfono: Node ya trae un generador criptográfico. */
import { randomBytes } from 'node:crypto';

export async function getRandomBytesAsync(tamano: number): Promise<Uint8Array> {
  return new Uint8Array(randomBytes(tamano));
}
