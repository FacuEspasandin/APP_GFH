import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';

import { borrar, guardar, leer } from './almacen';

/**
 * Cifra lo que se guarda en disco sin conexión.
 *
 * `offline-cockpit.ts` persiste el contexto de un paciente —nombre, fecha de
 * nacimiento, medicación, alergias— en `AsyncStorage`, que en el teléfono es
 * texto plano en un archivo del sandbox de la app. Cualquiera con acceso al
 * dispositivo o a un backup no cifrado del sistema lo lee tal cual.
 *
 * La clave vive en `SecureStore` (Keystore en Android, Keychain en iOS) — ahí
 * sí hay cifrado de hardware — y nunca en el JSON que se guarda ni en un
 * archivo. Se genera una sola vez, al primer uso, y sobrevive mientras dure
 * la sesión offline guardada; `limpiarOffline()` la borra junto con los datos.
 *
 * AES-256-CBC vía `aes-js` (JS puro, sin módulo nativo adicional) y no
 * `expo-crypto` solo: ese paquete da hashing y bytes al azar, pero no cifra ni
 * descifra — es justo lo que se usa acá para la clave y el IV.
 */

const CLAVE_DE_CIFRADO = 'gfh.claveOfflineV1';
const BYTES_CLAVE = 32; // AES-256
const BYTES_IV = 16; // tamaño de bloque de AES

/**
 * `aes-js` trae `utils.utf8`, pero es un codificador roto para caracteres
 * fuera del plano básico (emoji, algunos símbolos): itera `charCodeAt` en vez
 * de puntos de código completos y parte el par subrogado en dos — detectado
 * con un test ("💊" viajaba como dos caracteres sueltos).
 *
 * No se usa `TextEncoder`/`TextDecoder` porque no está confirmado que Hermes
 * los dé siempre sin un polyfill aparte. Esto es UTF-8 escrito a mano, sin más
 * dependencia que iterar la cadena por punto de código (`for...of`, que sí
 * junta un par subrogado en uno solo).
 */
function utf8ABytes(texto: string): Uint8Array {
  const bytes: number[] = [];
  for (const caracter of texto) {
    const punto = caracter.codePointAt(0)!;
    if (punto < 0x80) {
      bytes.push(punto);
    } else if (punto < 0x800) {
      bytes.push(0xc0 | (punto >> 6), 0x80 | (punto & 0x3f));
    } else if (punto < 0x10000) {
      bytes.push(0xe0 | (punto >> 12), 0x80 | ((punto >> 6) & 0x3f), 0x80 | (punto & 0x3f));
    } else {
      bytes.push(
        0xf0 | (punto >> 18),
        0x80 | ((punto >> 12) & 0x3f),
        0x80 | ((punto >> 6) & 0x3f),
        0x80 | (punto & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

function bytesAUtf8(bytes: Uint8Array): string {
  let resultado = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i]!;
    let punto: number;
    let largo: number;
    if (b0 < 0x80) {
      punto = b0;
      largo = 1;
    } else if ((b0 & 0xe0) === 0xc0) {
      punto = b0 & 0x1f;
      largo = 2;
    } else if ((b0 & 0xf0) === 0xe0) {
      punto = b0 & 0x0f;
      largo = 3;
    } else {
      punto = b0 & 0x07;
      largo = 4;
    }
    for (let j = 1; j < largo; j++) punto = (punto << 6) | (bytes[i + j]! & 0x3f);
    resultado += String.fromCodePoint(punto);
    i += largo;
  }
  return resultado;
}

async function obtenerOCrearClave(): Promise<Uint8Array> {
  const existente = await leer(CLAVE_DE_CIFRADO);
  if (existente) return aesjs.utils.hex.toBytes(existente);

  const nueva = await Crypto.getRandomBytesAsync(BYTES_CLAVE);
  await guardar(CLAVE_DE_CIFRADO, aesjs.utils.hex.fromBytes(nueva));
  return nueva;
}

/** Borra la clave: sin ella, cualquier copia offline que hubiera en disco
 *  queda indescifrable — mismo efecto práctico que borrarla. */
export async function borrarClaveDeCifrado(): Promise<void> {
  await borrar(CLAVE_DE_CIFRADO);
}

/** Texto → hex cifrado, con el IV al principio (no es secreto, sólo no se repite). */
export async function cifrar(textoPlano: string): Promise<string> {
  const clave = await obtenerOCrearClave();
  const iv = await Crypto.getRandomBytesAsync(BYTES_IV);

  // CBC necesita el texto acolchado a múltiplos de 16 bytes.
  const bytesPlanos = aesjs.padding.pkcs7.pad(utf8ABytes(textoPlano));
  const cifrador = new aesjs.ModeOfOperation.cbc(clave, iv);
  const bytesCifrados = cifrador.encrypt(bytesPlanos);

  return aesjs.utils.hex.fromBytes(iv) + aesjs.utils.hex.fromBytes(bytesCifrados);
}

/** Inverso de `cifrar`. `null` si el texto no tiene la forma esperada (clave
 *  vieja, dato corrupto): quien llama lo trata como «no hay copia offline». */
export async function descifrar(textoCifrado: string): Promise<string | null> {
  try {
    const clave = await obtenerOCrearClave();
    const ivHex = textoCifrado.slice(0, BYTES_IV * 2);
    const cuerpoHex = textoCifrado.slice(BYTES_IV * 2);
    const iv = aesjs.utils.hex.toBytes(ivHex);
    const bytesCifrados = aesjs.utils.hex.toBytes(cuerpoHex);

    const descifrador = new aesjs.ModeOfOperation.cbc(clave, iv);
    const bytesPlanos = aesjs.padding.pkcs7.strip(descifrador.decrypt(bytesCifrados));
    return bytesAUtf8(bytesPlanos);
  } catch {
    return null;
  }
}
