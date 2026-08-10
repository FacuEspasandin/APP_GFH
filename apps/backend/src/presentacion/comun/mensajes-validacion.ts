import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/**
 * Arma el mensaje de "datos inválidos" que ve el médico.
 *
 * class-validator escribe en inglés y nombrando la propiedad tal cual está en
 * el código: "nombreUsuario must be longer than or equal to 3 characters". Eso
 * nunca se mostró porque la validación no corría; ahora que corre, es lo que
 * llegaría a la pantalla.
 *
 * En vez de traducir 174 decoradores uno por uno, se arma el mensaje acá:
 *
 * - Si el DTO trae un mensaje propio (marcado con `context: { propio: true }`),
 *   se usa tal cual. Son los casos donde el detalle importa —"la contraseña
 *   necesita al menos 10 caracteres" le dice al usuario qué hacer.
 * - Para el resto alcanza con nombrar los campos: el formulario ya muestra
 *   dónde está cada uno, y el detalle de por qué falló la regla suele ser
 *   ruido para quien la está completando.
 *
 * La marca `propio` es explícita a propósito. Se podría adivinar mirando si el
 * mensaje empieza con el nombre de la propiedad, pero eso se rompe solo el día
 * que alguien escriba un mensaje que arranque distinto.
 */

/** Nombre de la propiedad → cómo se llama en la pantalla. */
const ETIQUETAS: Record<string, string> = {
  actual: 'la contraseña actual',
  alturaCm: 'la altura',
  apellido: 'el apellido',
  clcrMlMin: 'el clearance de creatinina',
  condicionClinicaId: 'la condición',
  condicionIds: 'las condiciones',
  creatininaMgDl: 'la creatinina',
  descripcion: 'la descripción',
  disclaimerVersion: 'la versión del descargo',
  documento: 'el documento',
  dosis: 'la dosis',
  edadAnios: 'la edad',
  email: 'el email',
  estado: 'el estado',
  estaLactando: 'la lactancia',
  fechaNacimiento: 'la fecha de nacimiento',
  frecuencia: 'la frecuencia',
  grupoAlergenicoIds: 'los grupos alergénicos',
  grupoId: 'el grupo',
  identificador: 'el email o nombre de usuario',
  imagenBase64: 'la imagen',
  indicacion: 'la indicación',
  nombre: 'el nombre',
  nombreLibre: 'el nombre del fármaco',
  nombreUsuario: 'el nombre de usuario',
  nota: 'la nota',
  nueva: 'la contraseña nueva',
  observaciones: 'las observaciones',
  paAlternativaId: 'la alternativa',
  paOrigenId: 'el fármaco a reemplazar',
  password: 'la contraseña',
  pesoKg: 'el peso',
  prescripcionOrigenId: 'la prescripción a reemplazar',
  principioActivoId: 'el principio activo',
  principioActivoIds: 'los principios activos',
  productoComercialId: 'el fármaco',
  refreshToken: 'la sesión',
  reemplazo: 'el reemplazo',
  semanaGestacion: 'la semana de gestación',
  severidad: 'la severidad',
  severidadAlergia: 'la severidad de la alergia',
  sexo: 'el sexo',
  textos: 'las líneas del tratamiento',
  tipo: 'el tipo',
  version: 'la versión',
  via: 'la vía',
};

function etiqueta(propiedad: string): string {
  return ETIQUETAS[propiedad] ?? `el campo ${propiedad}`;
}

interface Recolectado {
  propios: string[];
  campos: string[];
  sobrantes: boolean;
}

function recolectar(errores: ValidationError[], acumulado: Recolectado): void {
  for (const error of errores) {
    const claves = Object.keys(error.constraints ?? {});

    // Campo que el DTO no declara. No es un error del médico sino del cliente,
    // así que no se nombra el campo: no significa nada para quien lo lee.
    if (claves.includes('whitelistValidation')) {
      acumulado.sobrantes = true;
      continue;
    }

    for (const clave of claves) {
      const mensaje = error.constraints?.[clave];
      if (!mensaje) continue;

      if (error.contexts?.[clave]?.['propio'] === true) {
        acumulado.propios.push(mensaje);
      } else {
        const nombre = etiqueta(error.property);
        if (!acumulado.campos.includes(nombre)) acumulado.campos.push(nombre);
      }
    }

    // Objetos anidados, como `reemplazo` al aceptar una alternativa.
    if (error.children && error.children.length > 0) {
      recolectar(error.children, acumulado);
    }
  }
}

export function mensajeDeValidacion(errores: ValidationError[]): string {
  const acumulado: Recolectado = { propios: [], campos: [], sobrantes: false };
  recolectar(errores, acumulado);

  const partes = [...acumulado.propios];

  if (acumulado.campos.length === 1) {
    partes.push(`Revisá ${acumulado.campos[0]}.`);
  } else if (acumulado.campos.length > 1) {
    const ultimo = acumulado.campos[acumulado.campos.length - 1];
    partes.push(`Revisá ${acumulado.campos.slice(0, -1).join(', ')} y ${ultimo}.`);
  }

  if (acumulado.sobrantes && partes.length === 0) {
    partes.push('Los datos enviados no son los que espera el servidor.');
  }

  return partes.length > 0 ? partes.join(' ') : 'Revisá los datos ingresados.';
}

export function fabricaDeErroresDeValidacion(errores: ValidationError[]): BadRequestException {
  return new BadRequestException(mensajeDeValidacion(errores));
}
