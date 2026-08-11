/** SecureStore vive en el Keychain del teléfono: en tests, un Map. */
const memoria = new Map<string, string>();

export async function setItemAsync(clave: string, valor: string): Promise<void> {
  memoria.set(clave, valor);
}

export async function getItemAsync(clave: string): Promise<string | null> {
  return memoria.get(clave) ?? null;
}

export async function deleteItemAsync(clave: string): Promise<void> {
  memoria.delete(clave);
}
