/**
 * Lo legal que tiene que coincidir entre la app, el backend y la web pública:
 * versiones, contacto y los tres consentimientos que se guardan.
 *
 * Las versiones viven acá y no en cada pantalla por una razón: la app y el
 * backend tienen que estar de acuerdo en cuál es la vigente. Si el texto de un
 * consentimiento cambia, se sube su versión y el backend deja de aceptar la
 * anterior — el médico lo vuelve a ver. Subir una versión es la única forma de
 * volver a pedirlo, y queda probado qué texto aceptó cada uno.
 *
 * Los textos largos están en `legal-documentos.ts`.
 */

/** Los consentimientos que se guardan por médico, con versión y fecha. */
export const TIPOS_CONSENTIMIENTO = ['TERMINOS', 'VERA', 'FOTO'] as const;
export type TipoConsentimiento = (typeof TIPOS_CONSENTIMIENTO)[number];

/**
 * Versión vigente de cada uno. Cambiar el texto de un documento o de un
 * consentimiento sin subir su versión deja a todos con una aceptación que ya no
 * corresponde a lo que ven.
 */
export const VERSION_CONSENTIMIENTO: Record<TipoConsentimiento, string> = {
  /** Términos y condiciones + Política de privacidad, aceptados al crear la cuenta. */
  TERMINOS: '1.0',
  /** El primer mensaje a Vera: la pregunta sale hacia un proveedor de IA. */
  VERA: '1.0',
  /** La primera foto de una receta: la imagen sale hacia un proveedor de OCR. */
  FOTO: '1.0',
};

/** El «Antes de empezar» del primer ingreso. Se guarda al aceptarlo y en cada
 *  alternativa terapéutica documentada. */
export const VERSION_DISCLAIMER = '1.1';

/** Dónde se escribe para ejercer un derecho sobre los datos o pedir soporte. */
export const EMAIL_CONTACTO = 'info@gfh.com';

/** Dónde se presenta un reclamo si GFH no responde: la autoridad uruguaya. */
export const AUTORIDAD_DATOS = {
  nombre: 'Unidad Reguladora y de Control de Datos Personales (URCDP)',
  sitio: 'https://www.gub.uy/unidad-reguladora-control-datos-personales',
} as const;

/**
 * Quién es el responsable de los datos.
 *
 * `domicilio` y `identificacion` quedan en `null` hasta que se defina la
 * entidad que publica la app (cuenta de Apple Developer como organización): un
 * dato legal que no se conoce no se inventa, y el documento sólo lo muestra si
 * existe. Ver el checklist de pasaje a producción.
 */
export const RESPONSABLE = {
  nombre: 'GFH — Gestión Farmacológica Hospitalaria',
  domicilio: null as string | null,
  identificacion: null as string | null,
} as const;

/**
 * Dirección pública de los documentos, sin barra final. `null` hasta que exista
 * el dominio: mientras tanto la app muestra los textos completos adentro y los
 * enlaces externos no se dibujan. Es lo que se carga en App Store Connect como
 * «URL de la política de privacidad».
 */
export const URL_PUBLICA_BASE: string | null = null;

export const RUTAS_PUBLICAS = {
  privacidad: '/privacidad.html',
  terminos: '/terminos.html',
  metodologia: '/metodologia.html',
  soporte: '/soporte.html',
} as const;

/** La dirección completa de un documento público, o `null` si todavía no hay dominio. */
export function urlPublica(ruta: keyof typeof RUTAS_PUBLICAS): string | null {
  return URL_PUBLICA_BASE ? `${URL_PUBLICA_BASE}${RUTAS_PUBLICAS[ruta]}` : null;
}

/** Cuándo entró en vigencia la versión actual de los documentos. */
export const VIGENTE_DESDE = '29 de octubre de 2026';
