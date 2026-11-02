import {
  AUTORIDAD_DATOS,
  EMAIL_CONTACTO,
  RESPONSABLE,
  VERSION_CONSENTIMIENTO,
  VIGENTE_DESDE,
} from './legal';
import { DIAS_DE_GRACIA_BAJA } from './enums';

/**
 * Los documentos legales de GFH, como datos.
 *
 * Una sola fuente para tres destinos: las pantallas de la app (Perfil →
 * Términos y privacidad, y los consentimientos), las páginas públicas que se
 * cargan en App Store Connect (`scripts/generar-legal.mjs`) y los tests. Escritos
 * a mano en cada lugar se despegaban en cuanto alguien tocaba uno.
 *
 * **Lo que dicen es una afirmación sobre el sistema.** Si el sistema cambia
 * (otro proveedor, otro plazo de borrado), el documento se actualiza en el mismo
 * cambio. La lista de qué revisar está en el checklist de pasaje a producción.
 *
 * Reglas de redacción:
 * - Nunca se nombra al proveedor del catálogo farmacéutico (regla no
 *   negociable 7). `legal-documentos.test.ts` lo verifica.
 * - Nada de «borrador», «preliminar» ni «pendiente de validación».
 */

export interface SeccionLegal {
  titulo: string;
  /** Párrafos de texto corrido, en orden. */
  parrafos?: string[];
  /** Lista con viñetas, después de los párrafos. */
  items?: string[];
  /** Párrafos que cierran la sección, después de la lista. */
  cierre?: string[];
}

export type ClaveDocumentoLegal = 'terminos' | 'privacidad' | 'metodologia' | 'soporte';

export interface DocumentoLegal {
  clave: ClaveDocumentoLegal;
  titulo: string;
  /** Una frase que dice de qué se trata, para el encabezado. */
  resumen: string;
  secciones: SeccionLegal[];
}

const DIAS = DIAS_DE_GRACIA_BAJA;

/** «GFH — … · domicilio · identificación», sólo con lo que se conoce. */
const QUIEN = [RESPONSABLE.nombre, RESPONSABLE.domicilio, RESPONSABLE.identificacion]
  .filter((x): x is string => Boolean(x))
  .join(' · ');

// ============================================================================
// TÉRMINOS Y CONDICIONES
// ============================================================================

export const TERMINOS: DocumentoLegal = {
  clave: 'terminos',
  titulo: 'Términos y condiciones',
  resumen: 'Las reglas de uso de GFH. Vigente desde ' + VIGENTE_DESDE + '.',
  secciones: [
    {
      titulo: '1. Quién ofrece GFH y qué es',
      parrafos: [
        `GFH (Gestión Farmacológica Hospitalaria) es una aplicación móvil operada por ${QUIEN}. En estos términos, «GFH» o «nosotros» somos quienes la operamos, y «vos» sos la persona que usa la aplicación.`,
        'GFH es una herramienta de consulta para profesionales de la salud. Responde una pregunta: dado un fármaco y un paciente cargado por vos, qué interacciones, ajustes por función renal o hepática y alertas por condición, alergia, embarazo o lactancia hay que tener en cuenta. Reúne también calculadoras y escalas clínicas de uso habitual, un buscador de fármacos y un asistente de consulta (Vera).',
      ],
    },
    {
      titulo: '2. Quién puede usarla',
      parrafos: [
        'GFH está dirigida a profesionales de la salud habilitados para ejercer, y a estudiantes avanzados de esas carreras bajo supervisión. Tenés que ser mayor de 18 años.',
        'Al crear la cuenta declarás que los datos que ingresás son verdaderos y que cumplís este requisito. No es una aplicación para pacientes ni para el público general.',
      ],
    },
    {
      titulo: '3. Lo que GFH hace y lo que no hace',
      parrafos: [
        'GFH es una herramienta de apoyo a la decisión. Calcula y muestra información a partir de tablas y reglas fijas, con la fuente a la vista. No diagnostica, no prescribe, no reemplaza la ficha técnica del medicamento ni sustituye el juicio clínico del profesional tratante.',
        'GFH no es una institución de salud, no presta atención médica y no establece una relación profesional con los pacientes cuyos datos cargues.',
      ],
      items: [
        'Severidad, ajuste de dosis e interacciones nunca los decide un modelo de lenguaje: salen de tablas y reglas deterministas, que se pueden rastrear hasta su fuente (ver «Metodología y fuentes»).',
        'Cuando falta un dato, GFH lo muestra como «sin dato» o en neutro. Nunca supone que algo es seguro ni que es peligroso.',
        'El resultado de una verificación depende de lo que cargaste. Si el dato es viejo, incompleto o incorrecto, el resultado también lo es.',
      ],
    },
    {
      titulo: '4. Tu responsabilidad profesional',
      parrafos: [
        'La decisión de prescribir, ajustar, suspender o cambiar un tratamiento es siempre tuya. Antes de actuar, verificá la dosis y las indicaciones contra la ficha técnica del medicamento y considerá las características del paciente: edad, función renal y hepática, comorbilidades, embarazo o lactancia y terapia concomitante.',
        'Una alerta ausente no significa que no exista riesgo. Una alerta presente no obliga a nada: es información para tu criterio.',
      ],
    },
    {
      titulo: '5. Contenido clínico y fuentes',
      parrafos: [
        'El contenido clínico proviene de las fuentes descriptas en «Metodología y fuentes»: fichas técnicas y monografías de medicamentos, tablas publicadas por sociedades científicas y las fórmulas y escalas originales de cada calculadora. Ponemos cuidado en cargarlo y mantenerlo al día, pero la medicina cambia: puede haber demoras entre una actualización de una fuente y su reflejo en GFH.',
      ],
    },
    {
      titulo: '6. Vera, el asistente de consulta',
      parrafos: [
        'Vera responde preguntas generales sobre fármacos apoyándose en la base de GFH. Usa un proveedor externo de inteligencia artificial: lo que le escribís se envía a ese proveedor para generar la respuesta (ver la Política de privacidad). La primera vez te pedimos tu permiso expreso, y podés retirarlo cuando quieras.',
      ],
      items: [
        'Vera no decide nada sobre un paciente y no tiene acceso a los pacientes que cargaste.',
        'No escribas datos que identifiquen a un paciente (nombre, documento, dirección).',
        'Una respuesta de Vera que no cite datos de GFH no es un dato clínico: tomala como orientación y verificala.',
        'Hay un tope diario de consultas a Vera.',
      ],
    },
    {
      titulo: '7. Carga de tratamiento por foto',
      parrafos: [
        'Podés fotografiar una receta o un listado de medicación para que GFH lea el texto. La imagen se envía a un proveedor externo de reconocimiento de texto, se procesa y se descarta: GFH no la guarda. La primera vez te pedimos tu permiso expreso.',
        'La lectura puede equivocarse. Por eso nada se agrega al tratamiento de un paciente sin que revises y confirmes cada línea.',
      ],
    },
    {
      titulo: '8. Datos de pacientes',
      parrafos: [
        'Los pacientes que cargás son tuyos: ningún otro profesional ni nosotros los usamos para otra cosa que prestarte el servicio. Cada consulta a la base se limita a tu cuenta.',
        'Vos sos quien decide qué datos de un paciente cargar y tenés la responsabilidad de contar con el fundamento legal para hacerlo, según las normas de tu país y de tu institución sobre historia clínica y datos de salud. Cargá solo lo necesario para la verificación: el documento de identidad es opcional y, en general, no hace falta.',
        'El detalle de cómo tratamos esos datos está en la Política de privacidad.',
      ],
    },
    {
      titulo: '9. Tu cuenta',
      items: [
        'Tenés que mantener la confidencialidad de tu contraseña y no compartir tu cuenta. Todo lo que se haga desde ella se considera hecho por vos.',
        'Podés ver y cerrar tus sesiones activas, cambiar la contraseña y activar un bloqueo con huella o rostro desde Perfil.',
        'Avisanos de inmediato a ' + EMAIL_CONTACTO + ' si sospechás un acceso que no fue tuyo.',
        `Podés eliminar tu cuenta desde Perfil. Tenés ${DIAS} días para arrepentirte entrando de nuevo; pasado ese plazo se borra todo de forma definitiva.`,
      ],
    },
    {
      titulo: '10. Planes, suscripciones y pagos',
      parrafos: [
        'GFH tiene un plan gratuito, con límites que se muestran en la aplicación, y un plan de suscripción que habilita cargar pacientes y las demás funciones completas. El precio y el período de cada plan se muestran en la pantalla de compra antes de que confirmes.',
        'La suscripción se compra y se cobra a través de tu cuenta de Apple (App Store) o de Google (Google Play); nosotros no recibimos ni guardamos los datos de tu tarjeta.',
      ],
      items: [
        'El pago se carga a tu cuenta de la tienda al confirmar la compra.',
        'La suscripción se renueva automáticamente por el mismo período, salvo que la canceles al menos 24 horas antes de que termine el período en curso.',
        'La renovación se cobra dentro de las 24 horas previas al fin del período en curso, al precio vigente que figura en la tienda.',
        'Podés administrar o cancelar la suscripción en cualquier momento desde los ajustes de tu cuenta en la tienda. Cancelar detiene la renovación; conservás el acceso hasta el final del período ya pagado.',
        'Si se ofrece una prueba gratuita, la parte no usada se pierde al contratar una suscripción pagada.',
        'Los reembolsos los gestiona la tienda según sus propias políticas; nosotros no podemos emitirlos.',
        'Eliminar la cuenta no cancela la suscripción: tenés que cancelarla en la tienda para que no se siga cobrando.',
        'Si la suscripción vence, el acceso a las funciones de pago se bloquea. Tus datos se conservan mientras la cuenta exista.',
      ],
      cierre: [
        'Para Apple, estos términos se suman al Acuerdo de Licencia de Usuario Final estándar de Apple para aplicaciones con licencia («Licensed Application End User License Agreement»), vigente en la App Store.',
      ],
    },
    {
      titulo: '11. Uso aceptable',
      parrafos: ['No podés:'],
      items: [
        'usar GFH para fines distintos de la práctica o el estudio profesional de la salud;',
        'intentar acceder a cuentas o datos de otras personas, ni eludir los límites de la aplicación;',
        'copiar, extraer de forma masiva, revender o redistribuir el contenido clínico de GFH;',
        'hacer ingeniería inversa de la aplicación, salvo lo que la ley permita expresamente;',
        'cargar contenido ilícito, o programas que dañen el servicio.',
      ],
    },
    {
      titulo: '12. Propiedad intelectual',
      parrafos: [
        'La aplicación, su diseño, su código y su contenido pertenecen a GFH o a quienes nos lo licenciaron, y están protegidos por las leyes de propiedad intelectual. Te damos una licencia personal, limitada, revocable y no transferible para usar GFH según estos términos.',
        'Los datos que cargás siguen siendo tuyos.',
      ],
    },
    {
      titulo: '13. Disponibilidad y cambios del servicio',
      parrafos: [
        'Procuramos que GFH esté disponible, pero no garantizamos un servicio ininterrumpido: puede haber mantenimientos, fallas o interrupciones de terceros. Sin conexión, la aplicación puede mostrar una copia guardada en tu teléfono, marcada como tal.',
        'Podemos modificar o discontinuar funciones. Si el cambio te afecta de forma sustancial, te lo avisaremos en la aplicación.',
      ],
    },
    {
      titulo: '14. Limitación de responsabilidad',
      parrafos: [
        'GFH se ofrece «tal cual» como herramienta de apoyo. En la medida que la ley lo permita, no respondemos por decisiones clínicas tomadas con apoyo de la aplicación, ni por daños indirectos, pérdida de datos o lucro cesante derivados de su uso.',
        'Esto no limita la responsabilidad que no se puede excluir por ley, ni los derechos que te correspondan como consumidor.',
      ],
    },
    {
      titulo: '15. Suspensión y baja',
      parrafos: [
        'Podemos suspender o cerrar una cuenta que incumpla estos términos o ponga en riesgo la seguridad del servicio o de otras personas. Cuando sea posible, te avisaremos antes.',
      ],
    },
    {
      titulo: '16. Cambios en estos términos',
      parrafos: [
        'Si cambiamos estos términos, publicaremos la nueva versión con su fecha y, si el cambio es sustancial, te pediremos que la aceptes de nuevo. Seguir usando GFH después de un cambio no sustancial implica que lo aceptás.',
      ],
    },
    {
      titulo: '17. Ley aplicable y jurisdicción',
      parrafos: [
        'Estos términos se rigen por las leyes de la República Oriental del Uruguay. Para cualquier controversia, serán competentes los tribunales de Montevideo, sin perjuicio de los derechos que la ley te reconozca como consumidor.',
      ],
    },
    {
      titulo: '18. Contacto',
      parrafos: [`Escribinos a ${EMAIL_CONTACTO} por cualquier duda sobre estos términos.`],
    },
  ],
};

// ============================================================================
// POLÍTICA DE PRIVACIDAD
// ============================================================================

export const PRIVACIDAD: DocumentoLegal = {
  clave: 'privacidad',
  titulo: 'Política de privacidad',
  resumen: 'Qué datos tratamos, para qué, con quién los compartimos y cuánto los conservamos. Vigente desde ' + VIGENTE_DESDE + '.',
  secciones: [
    {
      titulo: '1. Quién es responsable',
      parrafos: [
        `El responsable de los datos de tu cuenta es ${QUIEN}. Para cualquier consulta sobre privacidad, escribinos a ${EMAIL_CONTACTO}.`,
        'Esta política cumple la Ley 18.331 de protección de datos personales de Uruguay y su Decreto reglamentario 414/009. Tratamos los datos de salud como datos sensibles.',
      ],
    },
    {
      titulo: '2. Qué datos tratamos',
      parrafos: ['Según lo que uses, tratamos estas categorías:'],
      items: [
        'Tu cuenta: nombre, apellido, email, nombre de usuario, contraseña (guardada sólo como una huella irreversible, nunca en texto), especialidad si la indicás, y el identificador de Google si entrás con Google.',
        'Seguridad y sesiones: modelo y sistema operativo de tus dispositivos, fechas de uso de cada sesión, intentos fallidos de ingreso, códigos de recuperación de contraseña (guardados como huella y con vencimiento) y un registro de acciones relevantes de la cuenta.',
        'Datos de pacientes que cargás vos: nombre, apellido, documento (opcional), fecha de nacimiento, sexo, altura, peso, creatinina y función renal, datos de función hepática, embarazo o lactancia, condiciones, alergias, medicación, resultados de las verificaciones y el historial de cambios del paciente. Son datos de salud.',
        'Consultas a Vera: el texto de tus preguntas y las respuestas, con las herramientas de GFH que se usaron.',
        'Fotos de tratamiento: la imagen que fotografiás, sólo mientras se procesa. No se guarda.',
        'Suscripción: qué plan tenés, de qué tienda, y hasta cuándo. No recibimos ni guardamos datos de tarjeta.',
        'Notificaciones: un identificador de tu dispositivo, solo si las activás.',
        'Soporte: lo que escribas en el formulario de ayuda (nombre, apellido, teléfono, correo y descripción).',
        'Errores técnicos: reportes de fallas de la aplicación, configurados para no incluir datos personales ni clínicos; sólo se identifica tu cuenta con un código interno.',
      ],
      cierre: [
        'No usamos publicidad, no vendemos datos, no hacemos seguimiento entre aplicaciones y no incluimos herramientas de rastreo de terceros con fines de marketing.',
      ],
    },
    {
      titulo: '3. Para qué los usamos',
      items: [
        'Prestarte el servicio: crear tu cuenta, identificarte, calcular las verificaciones de tus pacientes, mostrarte el historial y sincronizar tu suscripción.',
        'Mantener la seguridad: detectar accesos indebidos, limitar abusos y proteger tu cuenta.',
        'Responderte cuando nos escribís y mejorar el servicio a partir de los errores que se reportan.',
        'Enviarte notificaciones, solo si las activás en Perfil → Notificaciones: avisos de tu cuenta y tu suscripción, y recordatorios de uso. Nunca llevan datos de pacientes y podés desactivarlas cuando quieras.',
        'Cumplir obligaciones legales.',
      ],
      cierre: [
        'La base para tratar los datos de tu cuenta es la ejecución del servicio que pediste y tu consentimiento. Para enviar datos a los proveedores de inteligencia artificial y de lectura de fotos (secciones 5 y 6), la base es tu permiso expreso, que pedimos antes del primer uso y podés retirar.',
      ],
    },
    {
      titulo: '4. Datos de pacientes: tu rol y el nuestro',
      parrafos: [
        'Respecto de los pacientes que cargás, vos decidís qué datos ingresar y con qué finalidad: sos quien los trata y responde por tener el fundamento legal para hacerlo. GFH actúa como encargado: los guarda y los procesa únicamente para darte el servicio y siguiendo tus instrucciones, sin usarlos para otra cosa.',
        'Por eso te recomendamos cargar solo lo necesario. El documento de identidad es opcional, y las verificaciones funcionan sin él.',
        'Ningún otro profesional ve tus pacientes: el aislamiento se aplica en cada consulta a la base, por cuenta. No compartimos pacientes entre cuentas.',
      ],
    },
    {
      titulo: '5. Vera y la inteligencia artificial',
      parrafos: [
        'Vera responde con ayuda de un modelo de lenguaje de un proveedor externo: Anthropic, PBC (Estados Unidos). Cuando le preguntás algo, se envía a ese proveedor el texto de tu pregunta y el contexto de la conversación, para generar la respuesta.',
      ],
      items: [
        'No se envían tus pacientes ni tu cuenta: Vera no tiene acceso a ellos.',
        'Por eso te pedimos que no escribas nombres, documentos ni otros datos que identifiquen a un paciente.',
        'El proveedor es un encargado: lo contratamos bajo condiciones comerciales que, según declara, no usan lo enviado para entrenar sus modelos.',
        'Antes del primer mensaje te pedimos tu permiso expreso. Si no lo das, Vera no se usa. Podés retirarlo en Perfil → Privacidad.',
        'La severidad, las dosis y las interacciones nunca las decide la inteligencia artificial: salen de tablas y reglas de GFH.',
      ],
    },
    {
      titulo: '6. Fotos de tratamiento',
      parrafos: [
        'Si cargás un tratamiento por foto, la imagen se envía a Google Cloud Vision (Google LLC, Estados Unidos) para leer el texto. GFH procesa el resultado en memoria y descarta la imagen y el texto: no los guardamos. También borramos las copias temporales de la foto de tu teléfono.',
        'La foto puede mostrar datos de un paciente. Enfocá solo la medicación y tapá lo que identifique a la persona. Antes de la primera foto te pedimos tu permiso expreso; podés retirarlo en Perfil → Privacidad.',
        'Nada se agrega al tratamiento sin que revises y confirmes cada línea.',
      ],
    },
    {
      titulo: '7. Con quién compartimos datos',
      parrafos: [
        'Usamos proveedores para operar el servicio. Cada uno recibe solo lo que necesita para su función, como encargado, y no puede usarlo para fines propios de marketing.',
      ],
      items: [
        'Proveedor de base de datos en la nube (Supabase): guarda la información de tu cuenta y de tus pacientes.',
        'Proveedor de servidores en la nube: aloja la API de GFH, que procesa tus pedidos.',
        'Almacenamiento de copias de seguridad cifradas (Cloudflare R2): guarda copias de la base de datos, cifradas antes de salir de nuestro entorno.',
        'Anthropic: recibe las preguntas que le hacés a Vera (sección 5), solo si diste tu permiso.',
        'Google Cloud Vision: recibe la foto de una receta (sección 6), solo si diste tu permiso.',
        'Google: verifica tu identidad si elegís «Continuar con Google».',
        'RevenueCat, Apple y Google (App Store y Google Play): gestionan la compra y el estado de la suscripción.',
        'Expo: entrega las notificaciones push a tu dispositivo, si las activás.',
        'Resend: envía los correos de la aplicación, como el código de recuperación de contraseña y tus reportes a soporte.',
        'Sentry: recibe los reportes técnicos de fallas, sin datos personales ni clínicos.',
      ],
      cierre: [
        'También podemos comunicar datos si una autoridad competente lo exige por ley, o para proteger derechos y la seguridad de las personas.',
      ],
    },
    {
      titulo: '8. Dónde se guardan y transferencias internacionales',
      parrafos: [
        'Nuestros proveedores operan servidores en distintos países, incluidos Estados Unidos y otros fuera de Uruguay. Al aceptar esta política autorizás esas transferencias, que hacemos solo a proveedores que ofrecen garantías contractuales y técnicas razonables de protección, conforme al artículo 23 de la Ley 18.331.',
      ],
    },
    {
      titulo: '9. Cuánto tiempo los conservamos',
      items: [
        'Cuenta, pacientes, medicación, historial y conversaciones con Vera: mientras tu cuenta exista. Podés editar o borrar cada paciente en cualquier momento.',
        `Eliminación de la cuenta: queda inhabilitada y tenés ${DIAS} días para arrepentirte entrando de nuevo. Pasado ese plazo se borran de forma definitiva tu cuenta y todos sus datos: pacientes, tratamientos, historial y conversaciones.`,
        'Copias de seguridad: son cifradas y se conservan 30 días antes de reemplazarse. Un dato borrado desaparece de las copias al vencer ese ciclo.',
        'Fotos de tratamiento y el texto leído de ellas: no se guardan. Se procesan en memoria y se descartan.',
        'Sesiones: se conservan hasta 30 días después de que se cierran o vencen, para poder detectar el uso de un acceso robado; luego se borran.',
        'Códigos de recuperación de contraseña: vencen a los 15 minutos.',
        'Reportes de soporte: el tiempo necesario para atenderlos.',
        'Reportes técnicos de fallas: el que defina el proveedor, normalmente unos meses.',
        'Copia sin conexión en tu teléfono: se guarda cifrada y se borra al cerrar sesión o desinstalar la aplicación.',
      ],
      cierre: [
        'Podemos conservar un dato más tiempo solo si una ley nos obliga, y solo por ese plazo.',
      ],
    },
    {
      titulo: '10. Cómo protegemos los datos',
      items: [
        'Toda la comunicación entre la aplicación y el servidor viaja cifrada (HTTPS).',
        'Las contraseñas se guardan con el algoritmo Argon2id, nunca en texto. Las sesiones usan tokens que rotan en cada renovación y se pueden cerrar desde Perfil.',
        'Cada consulta a la base está limitada a la cuenta que la pide; la base tiene además seguridad a nivel de fila activada.',
        'Los datos se guardan cifrados en reposo en la infraestructura de nuestros proveedores, y las copias de seguridad se cifran antes de subirse.',
        'En tu teléfono: la copia sin conexión se cifra con una clave guardada en el llavero seguro del sistema; podés activar un bloqueo con huella o rostro, y la aplicación bloquea las capturas de pantalla y oculta su contenido en el selector de aplicaciones.',
        'Si hay un incidente de seguridad que afecte tus datos, te lo informaremos y lo comunicaremos a la autoridad cuando corresponda.',
      ],
      cierre: [
        'Ningún sistema es invulnerable. Si encontrás un problema de seguridad, escribinos a ' + EMAIL_CONTACTO + '.',
      ],
    },
    {
      titulo: '11. Tus derechos',
      parrafos: [
        'Tenés derecho a acceder a tus datos, rectificarlos, actualizarlos, pedir su inclusión o supresión, y a oponerte a su tratamiento, en los términos de la Ley 18.331.',
      ],
      items: [
        'Desde la aplicación: editás tu perfil y tus pacientes, cerrás sesiones, retirás los permisos de Vera y de fotos en Perfil → Privacidad, y eliminás tu cuenta en Perfil → Eliminar cuenta.',
        `Por escrito: pedinos una copia o la corrección de tus datos en ${EMAIL_CONTACTO}. Respondemos dentro del plazo legal (cinco días hábiles para acceso y rectificación).`,
        `Si no estás conforme con la respuesta, podés presentar un reclamo ante la ${AUTORIDAD_DATOS.nombre} (${AUTORIDAD_DATOS.sitio}).`,
      ],
      cierre: [
        'Si un paciente quiere ejercer sus derechos sobre los datos que cargaste, el responsable es el profesional o la institución que lo atiende; podemos ayudarte a darle curso.',
      ],
    },
    {
      titulo: '12. Retirar un permiso',
      parrafos: [
        'Los permisos para usar Vera y para cargar por foto son independientes y se pueden retirar cuando quieras en Perfil → Privacidad. Al retirarlos, dejamos de enviar datos a ese proveedor de inmediato y, para usar la función de nuevo, te lo volvemos a pedir.',
        'Retirar un permiso no afecta lo ya procesado. Las conversaciones con Vera que ya existen siguen en tu cuenta hasta que la elimines.',
      ],
    },
    {
      titulo: '13. Menores de edad',
      parrafos: [
        'GFH es para profesionales y estudiantes avanzados mayores de 18 años. No recopilamos datos de menores a sabiendas; si creés que alguno nos dio los suyos, escribinos y los borramos.',
      ],
    },
    {
      titulo: '14. Cambios en esta política',
      parrafos: [
        'Si cambiamos esta política, publicaremos la versión nueva con su fecha. Si el cambio altera el uso de tus datos de forma sustancial, te lo avisaremos en la aplicación y te pediremos que lo aceptes de nuevo.',
      ],
    },
    {
      titulo: '15. Contacto',
      parrafos: [`Escribinos a ${EMAIL_CONTACTO} por cualquier consulta sobre privacidad.`],
    },
  ],
};

// ============================================================================
// METODOLOGÍA Y FUENTES
// ============================================================================

export const METODOLOGIA: DocumentoLegal = {
  clave: 'metodologia',
  titulo: 'Metodología y fuentes',
  resumen: 'Cómo GFH llega a cada resultado y de dónde sale cada dato.',
  secciones: [
    {
      titulo: 'Qué hace GFH',
      parrafos: [
        'GFH responde una sola pregunta: ¿este fármaco es seguro para este paciente, hoy? Lo calcula en el momento, sobre lo que cargaste, y muestra cada resultado con su motivo. Es una herramienta de apoyo a la decisión clínica; no reemplaza la ficha técnica ni el criterio del profesional.',
      ],
    },
    {
      titulo: 'Cómo se calcula',
      parrafos: [
        'La severidad, el ajuste de dosis y las interacciones no los decide la inteligencia artificial. Cada resultado sale de una tabla o regla fija que se puede rastrear hasta su fuente: dos veces el mismo dato dan el mismo resultado.',
        'Cuando falta un dato (por ejemplo, el paciente no tiene función renal cargada), GFH lo muestra en neutro y lo dice. Nunca supone que algo es seguro ni que es peligroso.',
      ],
    },
    {
      titulo: 'Las cinco verificaciones',
      items: [
        'Interacciones: cruza todos los fármacos del tratamiento de a pares y muestra la severidad y el motivo de cada cruce. Un producto comercial se resuelve a sus principios activos, así que una combinación fija se evalúa por cada componente.',
        'Ajuste renal: usa el clearance de creatinina del paciente (Cockcroft-Gault, o el valor que cargues) y lo ubica en la banda de la tabla de ajuste del fármaco, según la vía de administración.',
        'Ajuste hepático: usa la clase Child-Pugh del paciente (A, B o C) y la ubica en la tabla del fármaco.',
        'Condiciones y alergias: compara el fármaco con las condiciones clínicas y las alergias cargadas. Solo la coincidencia exacta con una alergia grave se marca como bloqueante; un cruce por familia pide confirmación y nunca bloquea.',
        'Embarazo y lactancia: muestra la categoría del fármaco para la situación del paciente.',
      ],
    },
    {
      titulo: 'Fuentes del contenido clínico',
      items: [
        'Fichas técnicas y monografías de medicamentos: tomadas de bases de datos farmacéuticas profesionales y de las fichas técnicas oficiales de cada producto.',
        'Ajuste por función renal: tablas de «Nefrología al día», de la Sociedad Española de Nefrología (mayo de 2025).',
        'Ajuste por función hepática: clasificación Child-Pugh y tablas de ajuste por clase.',
        'Interacciones, alertas por condición y alternativas terapéuticas: reglas con severidad y motivo, organizadas por principio activo.',
        'Riesgo cardiovascular a 10 años: tablas de predicción de riesgo OMS/ISH, subregión AMR B (OMS/OPS), las que cita la guía uruguaya de dislipemias.',
        'Las calculadoras y escalas usan la fórmula o puntuación original publicada de cada una (listadas abajo).',
      ],
      cierre: [
        'Si encontrás un error, avisanos desde Perfil → Ayuda y soporte.',
      ],
    },
    {
      titulo: 'Calculadoras y escalas',
      parrafos: [
        'Sirven sobre datos sueltos: no se cruzan con tus pacientes ni se guardan. Cada una implementa la fórmula o la puntuación publicada por sus autores o por la sociedad que la mantiene:',
      ],
      items: [
        'Clearance de creatinina: Cockcroft-Gault. Función renal: grados KDIGO.',
        'Child-Pugh (Pugh y col.), MELD-Na (UNOS/OPTN), función discriminante de Maddrey, FIB-4, APRI.',
        'CHA₂DS₂-VASc (Lip y col.), HAS-BLED (Pisters y col.), HEART, Índice de Riesgo Cardíaco Revisado (Lee), riesgo cardiovascular OMS/ISH.',
        'qSOFA y SOFA (consenso Sepsis-3), CURB-65, Wells para tromboembolismo pulmonar, Centor/McIsaac, Glasgow-Blatchford, ABCD₂, NIHSS, Escala de Glasgow.',
        'Índice de Charlson, índice de masa corporal (clasificación OMS), superficie corporal (Mosteller), peso ideal (Devine).',
        'HbA1c a glucemia promedio (estudio ADAG), HOMA-IR, LDL por Friedewald, QTc por Bazett y Fridericia.',
        'Anion gap, gap osmolar, calcio corregido por albúmina, sodio corregido por glucemia, FENa.',
        'Fecha probable de parto: regla de Naegele.',
      ],
      cierre: [
        'Si falta un dato obligatorio, el resultado se muestra incompleto y lo dice.',
      ],
    },
    {
      titulo: 'Qué no hace',
      items: [
        'No diagnostica ni indica tratamientos.',
        'No reemplaza la ficha técnica del medicamento.',
        'No decide por el profesional: toda carga de tratamiento, incluida la que sale de una foto, la revisás y la confirmás vos, línea por línea.',
        'Vera, el asistente de consulta, responde apoyándose en esta misma base y nunca decide nada sobre un paciente.',
      ],
    },
    {
      titulo: 'Errores y actualizaciones',
      parrafos: [
        'Si ves un dato o un resultado que no coincide con la ficha técnica o con una fuente, escribinos a ' + EMAIL_CONTACTO + ' o usá Perfil → Ayuda y soporte. Corregimos el contenido en el servidor, así que la corrección llega sin que tengas que actualizar la aplicación.',
      ],
    },
  ],
};

// ============================================================================
// SOPORTE
// ============================================================================

/**
 * La página de soporte pública: es la «URL de soporte» que App Store Connect
 * pide (guideline 1.5). No forma parte de `DOCUMENTOS_LEGALES` —no es un
 * documento legal— pero se publica con la misma maquinaria.
 */
export const SOPORTE: DocumentoLegal = {
  clave: 'soporte',
  titulo: 'Soporte',
  resumen: 'Cómo pedir ayuda con GFH, reportar un error o ejercer tus derechos sobre tus datos.',
  secciones: [
    {
      titulo: 'Escribinos',
      parrafos: [
        `Para cualquier consulta, error o sugerencia, escribí a ${EMAIL_CONTACTO}. Respondemos lo antes posible.`,
        'También podés reportar un problema desde la propia aplicación: Perfil → Ayuda y soporte.',
      ],
      items: [
        'Contanos qué estabas haciendo y qué esperabas que pasara.',
        'Indicá el modelo de tu teléfono y la versión de GFH (Perfil → Acerca de GFH).',
        'No incluyas nombres, documentos ni otros datos de pacientes en el mensaje.',
      ],
    },
    {
      titulo: 'Tu cuenta',
      items: [
        'Olvidé mi contraseña: en la pantalla de ingreso, «¿Olvidé mi contraseña?». Te llega un código por email.',
        'Cerrar sesiones en otros dispositivos: Perfil → Sesiones activas.',
        `Eliminar mi cuenta y mis datos: Perfil → Privacidad y datos → Eliminar mi cuenta. Tenés ${DIAS} días para arrepentirte.`,
        'Retirar el permiso de Vera o de la carga por foto: Perfil → Privacidad y datos.',
      ],
    },
    {
      titulo: 'Suscripción',
      parrafos: [
        'La suscripción se compra y se gestiona a través de la tienda de tu teléfono (App Store o Google Play). Para cancelarla, cambiar de plan o pedir un reembolso, usá los ajustes de tu cuenta en la tienda, o Perfil → Suscripción → Gestionar suscripción dentro de GFH.',
        'Eliminar la cuenta no cancela la suscripción: cancelala en la tienda para que no se siga cobrando.',
      ],
    },
    {
      titulo: 'Un dato clínico que no coincide',
      parrafos: [
        'Si un resultado, una dosis o una ficha no coincide con la ficha técnica o con una fuente, avisanos con el nombre del fármaco y qué viste. Corregimos el contenido en el servidor y la corrección llega sin que tengas que actualizar la aplicación.',
      ],
    },
    {
      titulo: 'Tus datos',
      parrafos: [
        `Para pedir una copia de tus datos, corregirlos o que los borremos, escribí a ${EMAIL_CONTACTO}. El detalle está en la Política de privacidad.`,
      ],
    },
  ],
};

export const DOCUMENTOS_LEGALES: readonly DocumentoLegal[] = [TERMINOS, PRIVACIDAD, METODOLOGIA];

// ============================================================================
// CONSENTIMIENTOS
// ============================================================================

export interface TextoConsentimiento {
  tipo: 'VERA' | 'FOTO';
  version: string;
  titulo: string;
  /** Lo que se le dice antes de pedir el permiso. */
  puntos: string[];
  /** La casilla que tiene que marcar. */
  aceptacion: string;
  /** Lo que pasa si no acepta. */
  siNoAcepta: string;
}

export const CONSENTIMIENTO_VERA: TextoConsentimiento = {
  tipo: 'VERA',
  version: VERSION_CONSENTIMIENTO.VERA,
  titulo: 'Antes de preguntarle a Vera',
  puntos: [
    'Vera es un asistente con inteligencia artificial. Para responder, tu pregunta se envía a Anthropic, un proveedor externo (Estados Unidos).',
    'Se envía solo el texto que escribís y el contexto de la conversación. Vera no tiene acceso a tus pacientes.',
    'No escribas nombres, documentos ni otros datos que identifiquen a un paciente.',
    'Vera no decide dosis, severidad ni interacciones: eso sale de las tablas y reglas de GFH. Verificá siempre.',
    'Tus conversaciones se guardan en tu cuenta para que las retomes. Podés retirar este permiso cuando quieras en Perfil → Privacidad.',
  ],
  aceptacion: 'Entiendo y acepto que mis preguntas a Vera se envíen a Anthropic para generar la respuesta.',
  siNoAcepta: 'Sin este permiso no podés usar Vera. El resto de la aplicación funciona igual.',
};

export const CONSENTIMIENTO_FOTO: TextoConsentimiento = {
  tipo: 'FOTO',
  version: VERSION_CONSENTIMIENTO.FOTO,
  titulo: 'Antes de cargar una foto',
  puntos: [
    'Para leer la foto, la imagen se envía a Google Cloud Vision (Google), un servicio externo de reconocimiento de texto (Estados Unidos).',
    'GFH procesa el resultado y descarta la imagen y el texto: no los guarda. También se borran las copias temporales de tu teléfono.',
    'La foto puede mostrar datos de un paciente. Enfocá solo la medicación, o tapá nombre y documento.',
    'Nada se agrega al tratamiento sin que revises y confirmes cada línea.',
    'Podés retirar este permiso cuando quieras en Perfil → Privacidad.',
  ],
  aceptacion: 'Entiendo y acepto que la foto se envíe a Google Cloud Vision para leer el texto.',
  siNoAcepta: 'Sin este permiso no podés cargar por foto. Podés pegar la lista o cargar el tratamiento a mano.',
};

/** La frase del registro. Las dos palabras enlazadas las resuelve la pantalla. */
export const ACEPTACION_TERMINOS = {
  antes: 'Acepto los ',
  terminos: 'Términos y condiciones',
  medio: ' y la ',
  privacidad: 'Política de privacidad',
  despues: ', y confirmo que soy profesional de la salud mayor de 18 años.',
} as const;
