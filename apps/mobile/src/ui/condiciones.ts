/**
 * Nombres legibles de las condiciones clínicas.
 *
 * El backend manda códigos (`ADULTO_MAYOR`, `ULCERA`) porque son la clave con
 * la que el motor razona, y la app los estaba pintando tal cual. Un chip que
 * dice `ADULTO_MAYOR` delata que se está mostrando una fila de la base, no un
 * dato pensado para leerse.
 *
 * Las siglas médicas se dejan como están: `HTA`, `EPOC`, `ERC` e `IAM` son
 * cómo el médico las escribe y las lee. "Hipertensión arterial" en un chip
 * ocupa el ancho de la pantalla y no comunica más rápido.
 */

const EXPLICITAS: Record<string, string> = {
  HTA: 'HTA',
  EPOC: 'EPOC',
  ERC: 'ERC',
  IAM: 'IAM',
  ICC: 'ICC',
  FA: 'FA',
  DM: 'Diabetes',
  DM2: 'Diabetes tipo 2',
  ULCERA: 'Úlcera',
  ULCERA_PEPTICA: 'Úlcera péptica',
  ADULTO_MAYOR: 'Adulto mayor',
  EMBARAZO: 'Embarazo',
  LACTANCIA: 'Lactancia',
  INSUFICIENCIA_RENAL: 'Insuficiencia renal',
  INSUFICIENCIA_HEPATICA: 'Insuficiencia hepática',
  ASMA: 'Asma',
  EPILEPSIA: 'Epilepsia',
  GLAUCOMA: 'Glaucoma',
  OSTEOPOROSIS: 'Osteoporosis',
  DEPRESION: 'Depresión',
  HIPOTIROIDISMO: 'Hipotiroidismo',
  HIPERTIROIDISMO: 'Hipertiroidismo',
};

/**
 * Para un código sin entrada propia: `MI_CONDICION` → `Mi condicion`. No
 * inventa tildes —no hay forma de saberlas— pero deja algo legible en vez de
 * mayúsculas con guiones bajos.
 */
function prettificar(codigo: string): string {
  const palabras = codigo.toLowerCase().split('_').join(' ');
  return palabras.charAt(0).toUpperCase() + palabras.slice(1);
}

export function nombreCondicion(codigo: string): string {
  return EXPLICITAS[codigo] ?? prettificar(codigo);
}

/** Las que el motor deriva solo, sin que nadie las cargue (motor §6.2). */
const SINTETICAS = new Set(['ADULTO_MAYOR', 'EMBARAZO', 'LACTANCIA']);

export function esSintetica(codigo: string): boolean {
  return SINTETICAS.has(codigo);
}
