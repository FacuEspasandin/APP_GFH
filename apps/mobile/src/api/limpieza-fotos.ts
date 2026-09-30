import { File } from 'expo-file-system';

/**
 * Borra del caché del teléfono la copia de una foto de tratamiento.
 *
 * Regla no negociable 2: la foto nunca se persiste. El backend ya cumple esto
 * —no guarda el archivo ni el texto crudo, sólo un `AuditLog` con el
 * `pacienteId`—, pero hasta ahora la copia local (la que `ImagePicker` saca a
 * `cache/ImagePicker/…` y la que `ImageManipulator` deja en
 * `cache/ImageManipulator/…` tras comprimirla) quedaba viva en el disco del
 * teléfono para siempre. Se llama sobre las DOS uris, se haya subido la foto
 * con éxito o no: la regla es sobre la existencia del archivo, no sobre si el
 * backend la usó.
 *
 * Best-effort a propósito: si el borrado falla (el sistema operativo ya la
 * limpió, permisos raros) no tiene sentido que el flujo de carga de
 * tratamiento se caiga por un archivo temporal que de todos modos el sistema
 * puede reclamar solo por ser caché.
 */
export function borrarFotoLocal(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const archivo = new File(uri);
    if (archivo.exists) archivo.delete();
  } catch {
    // Best-effort: ver arriba.
  }
}
