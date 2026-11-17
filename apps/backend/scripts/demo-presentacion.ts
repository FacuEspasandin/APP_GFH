/**
 * ============================================================================
 * CUENTA DE PRESENTACIÓN — datos ficticios para una demo en vivo
 * ============================================================================
 *
 *   pnpm --filter @gfh/backend demo:presentacion              # SIMULACRO (no escribe)
 *   pnpm --filter @gfh/backend demo:presentacion -- --aplicar # escribe
 *
 * Variables de entorno (en apps/backend/.env o en la terminal; NUNCA en el código):
 *
 *   GFH_PRESENTACION_EMAIL      email de la cuenta de presentación        (obligatoria)
 *   GFH_PRESENTACION_PASSWORD   su contraseña, 10 a 128 caracteres        (obligatoria)
 *   GFH_PRESENTACION_USUARIO    nombre de usuario si la cuenta es nueva   (opcional)
 *   GFH_PRESENTACION_NOMBRE     \
 *   GFH_PRESENTACION_APELLIDO   / nombre a mostrar si la cuenta es nueva  (opcional)
 *
 * Qué hace, sobre ESA cuenta y nada más:
 *
 *   1. La crea, o la actualiza si el email ya existe (contraseña con el mismo
 *      Argon2id que el registro real).
 *   2. Le deja la suscripción ACTIVA con fin lejano, el disclaimer y los tres
 *      consentimientos con las versiones vigentes, tema CLARO y sin bloqueo.
 *      La suscripción se escribe directo en la base, igual que `dev:cuentas`:
 *      el camino real es el webhook de RevenueCat (regla 6) y no existe
 *      endpoint que la app pueda llamar para esto.
 *   3. Carga siete pacientes ficticios (grupos «Consultorio» y «CTI»), cada uno
 *      armado para mostrar algo distinto del motor. Todos llevan
 *      `documento = DEMO-PRES-NN`: es la marca con la que se los reconoce.
 *
 * Idempotente y acotado: al volver a correr borra SÓLO los pacientes de ESA
 * cuenta con documento `DEMO-PRES-*` y los recrea. Los demás pacientes de la
 * cuenta, los de cualquier otra cuenta y el catálogo no se tocan jamás.
 *
 * Antes de escribir (y también en el simulacro) corre el motor clínico real,
 * en memoria, sobre cada paciente tal como quedaría y comprueba que produzca el
 * hallazgo para el que se lo diseñó. Si alguno no coincide, `--aplicar` se
 * niega a escribir. El simulacro SÓLO lee la base.
 *
 * La contraseña nunca se imprime ni se guarda en ningún archivo.
 */
import { PrismaClient, type Prisma, type ViaAdministracion } from '@prisma/client';
import {
  construirCatalogo,
  CODIGO_ADULTO_MAYOR,
  CODIGO_EMBARAZO,
  CODIGO_LACTANCIA,
  evaluarAlergias,
  evaluarCockpit,
  mapearTextoLibreAGrupo,
  type AjusteHepaticoDeFarmaco,
  type AjusteRenalDeFarmaco,
  type AlergiaPaciente,
  type AlertaDeCatalogo,
  type CatalogoInteracciones,
  type ContextoCockpit,
  type GrupoAlergenico,
  type PrescripcionActiva,
  type ResultadoCockpit,
} from '@gfh/motor-clinico';
import {
  calcularClcr,
  childPughDePuntos,
  edadEnAnios,
  GLOSA_CLASE,
  normalizar,
  puntosAlbumina,
  puntosBilirrubina,
  puntosInr,
  RANGO_ETIQUETA,
  VERSION_CONSENTIMIENTO,
  VERSION_DISCLAIMER,
  type Ascitis,
  type CategoriaHallazgo,
  type ChildPughClase,
  type Encefalopatia,
} from '@gfh/shared-types';

const prisma = new PrismaClient();

/*
 * Mismas defensas que `dev:datos` / `dev:cuentas`: estas cuentas viven en la
 * base REAL (dev y producción comparten Supabase) y este repo es público.
 */
if (process.env.NODE_ENV === 'production') {
  throw new Error('demo:presentacion crea una cuenta de prueba: no se corre con NODE_ENV=production.');
}
try {
  process.loadEnvFile();
} catch {
  /* sin .env local: se usa lo que ya haya en el entorno */
}

const APLICAR = process.argv.includes('--aplicar');
const PREFIJO_DEMO = 'DEMO-PRES-';
const EMAIL = (process.env.GFH_PRESENTACION_EMAIL ?? '').trim().toLowerCase();
const PASSWORD = process.env.GFH_PRESENTACION_PASSWORD ?? '';
const CUENTAS_DE_DESARROLLO = ['demo@gfh.app', 'gratis@gfh.app'];

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(EMAIL)) {
  throw new Error('Falta GFH_PRESENTACION_EMAIL (un email válido) en el entorno o en apps/backend/.env.');
}
if (PASSWORD.length < 10 || PASSWORD.length > 128) {
  throw new Error('Falta GFH_PRESENTACION_PASSWORD (de 10 a 128 caracteres) en el entorno o en apps/backend/.env.');
}
if (CUENTAS_DE_DESARROLLO.includes(EMAIL)) {
  throw new Error(`${EMAIL} es una cuenta de desarrollo (dev:datos / dev:cuentas): usá otro email para presentar.`);
}

// ---------------------------------------------------------------------------
// Lo que se carga
// ---------------------------------------------------------------------------

type Grupo = 'Consultorio' | 'CTI';

interface FarmacoSpec {
  /** Nombre del principio activo, tal cual está en el catálogo. */
  pa: string;
  dosis: string;
  frecuencia: string;
  indicacion?: string;
}

interface AlergiaSpec {
  tipo: 'FARMACOLOGICA' | 'GENERAL';
  /** FARMACOLOGICA: principio activo exacto. */
  pa?: string;
  /** GENERAL: el alérgeno como lo escribiría el médico. */
  descripcion?: string;
  severidad: 'LEVE' | 'MODERADA' | 'GRAVE';
}

interface HepaticoSpec {
  bilirrubinaMgDl: number;
  albuminaGDl: number;
  inr: number;
  ascitis: Ascitis;
  encefalopatia: Encefalopatia;
}

interface Esperado {
  categoria: CategoriaHallazgo;
  /** Fragmentos (normalizados) que tienen que aparecer en título + detalle del hallazgo. */
  incluye: string[];
  /** Rango exacto (0 contraindicada … 5 informativa), si importa. */
  rango?: number;
}

interface PacienteSpec {
  numero: number;
  etiqueta: string;
  nombre: string;
  apellido: string;
  grupo: Grupo;
  edad: number;
  sexo: 'M' | 'F';
  alturaCm?: number;
  pesoKg?: number;
  creatininaMgDl?: number;
  hepatico?: HepaticoSpec;
  semanaGestacion?: number;
  condiciones: string[];
  alergias: AlergiaSpec[];
  farmacos: FarmacoSpec[];
  libres?: Array<{ nombre: string; dosis: string; frecuencia: string }>;
  /** Qué muestra, en una línea, para el que presenta. */
  muestra: string;
  /** Lo que el motor TIENE que producir. */
  esperados: Esperado[];
  /** Sin ningún hallazgo. */
  sinHallazgos?: boolean;
  /** Avisos de falta de dato que TIENEN que aparecer. */
  avisos?: string[];
  /** Avisos que NO pueden aparecer. */
  sinAvisos?: string[];
  /** Fármacos que se intentarían agregar y qué debería pasar. */
  intentos?: Array<{ pa: string; resultado: 'BLOQUEA' | 'CONFIRMA' | 'LIBRE' }>;
}

const PACIENTES: PacienteSpec[] = [
  {
    numero: 1,
    etiqueta: 'LIMPIO',
    nombre: 'Marta',
    apellido: 'Delgado',
    grupo: 'Consultorio',
    edad: 41,
    sexo: 'F',
    alturaCm: 164,
    pesoKg: 64,
    creatininaMgDl: 0.8,
    hepatico: { bilirrubinaMgDl: 1.0, albuminaGDl: 4.0, inr: 1.1, ascitis: 'AUSENTE', encefalopatia: 'AUSENTE' },
    condiciones: [],
    alergias: [],
    farmacos: [
      { pa: 'Amlodipino', dosis: '5 mg', frecuencia: 'cada 24 h', indicacion: 'Hipertensión arterial leve' },
      { pa: 'Omeprazol', dosis: '20 mg', frecuencia: 'cada 24 h', indicacion: 'Protección gástrica' },
      { pa: 'Sertralina', dosis: '50 mg', frecuencia: 'cada 24 h', indicacion: 'Ansiedad' },
    ],
    muestra: 'Paciente sin hallazgos: función renal normal, Child-Pugh A y ninguna interacción ni alerta. Es el «verde».',
    esperados: [],
    sinHallazgos: true,
  },
  {
    numero: 2,
    etiqueta: 'INTERACCION GRAVE',
    nombre: 'Hugo',
    apellido: 'Pereyra',
    grupo: 'CTI',
    edad: 58,
    sexo: 'M',
    alturaCm: 175,
    pesoKg: 82,
    creatininaMgDl: 1.0,
    condiciones: ['FA'],
    alergias: [],
    farmacos: [
      { pa: 'Warfarina', dosis: '5 mg', frecuencia: 'cada 24 h', indicacion: 'Anticoagulación por fibrilación auricular' },
      { pa: 'Claritromicina', dosis: '500 mg', frecuencia: 'cada 12 h', indicacion: 'Neumonía' },
      { pa: 'Simvastatina', dosis: '20 mg', frecuencia: 'cada 24 h', indicacion: 'Dislipemia' },
      { pa: 'Amiodarona', dosis: '200 mg', frecuencia: 'cada 24 h', indicacion: 'Control de ritmo en fibrilación auricular' },
    ],
    muestra:
      'Interacciones AGRUPADAS por mecanismo: «Sangrado» (Warfarina + Claritromicina, Warfarina + Amiodarona) y «Miopatía / rabdomiólisis» (Claritromicina + Simvastatina, contraindicada; Simvastatina + Amiodarona). Más Amiodarona + Claritromicina (QT), suelta.',
    esperados: [
      { categoria: 'INTERACCION', incluye: ['warfarina', 'claritromicina'], rango: 2 },
      { categoria: 'INTERACCION', incluye: ['claritromicina', 'simvastatina'], rango: 0 },
      { categoria: 'INTERACCION', incluye: ['warfarina', 'amiodarona'], rango: 2 },
      { categoria: 'INTERACCION', incluye: ['simvastatina', 'amiodarona'], rango: 2 },
      { categoria: 'INTERACCION', incluye: ['amiodarona', 'claritromicina'], rango: 2 },
    ],
  },
  {
    numero: 3,
    etiqueta: 'RENAL + HEPATICO',
    nombre: 'Roberto',
    apellido: 'Silva',
    grupo: 'CTI',
    edad: 62,
    sexo: 'M',
    alturaCm: 170,
    pesoKg: 76,
    creatininaMgDl: 3.0,
    // Bilirrubina 2,4 (2 pts) + albúmina 3,0 (2) + INR 1,9 (2) + ascitis leve (2)
    // + sin encefalopatía (1) = 9 puntos → Child-Pugh B.
    hepatico: { bilirrubinaMgDl: 2.4, albuminaGDl: 3.0, inr: 1.9, ascitis: 'LEVE', encefalopatia: 'AUSENTE' },
    condiciones: [],
    alergias: [],
    farmacos: [
      { pa: 'Enalapril', dosis: '10 mg', frecuencia: 'cada 12 h', indicacion: 'Hipertensión arterial' },
      { pa: 'Digoxina', dosis: '0,25 mg', frecuencia: 'cada 24 h', indicacion: 'Fibrilación auricular' },
      { pa: 'Warfarina', dosis: '5 mg', frecuencia: 'cada 24 h', indicacion: 'Anticoagulación' },
      { pa: 'Atorvastatina', dosis: '20 mg', frecuencia: 'cada 24 h', indicacion: 'Dislipemia' },
    ],
    muestra:
      'Clcr ~27 mL/min: Enalapril y Digoxina piden reducir la dosis. Child-Pugh B: Warfarina (reducir) y Atorvastatina (precaución).',
    esperados: [
      { categoria: 'AJUSTE_RENAL', incluye: ['enalapril'] },
      { categoria: 'AJUSTE_RENAL', incluye: ['digoxina'] },
      { categoria: 'AJUSTE_HEPATICO', incluye: ['warfarina'] },
      { categoria: 'AJUSTE_HEPATICO', incluye: ['atorvastatina'] },
    ],
    avisos: [],
    sinAvisos: ['SIN_CLCR', 'SIN_CHILD_PUGH', 'SIN_TABLA_HEPATICA'],
  },
  {
    numero: 4,
    etiqueta: 'ALERGIA EXACTA GRAVE',
    nombre: 'Lucía',
    apellido: 'Fernández',
    grupo: 'Consultorio',
    edad: 52,
    sexo: 'F',
    alturaCm: 160,
    pesoKg: 70,
    creatininaMgDl: 0.9,
    hepatico: { bilirrubinaMgDl: 1.0, albuminaGDl: 4.0, inr: 1.1, ascitis: 'AUSENTE', encefalopatia: 'AUSENTE' },
    condiciones: [],
    alergias: [
      { tipo: 'FARMACOLOGICA', pa: 'Amoxicilina', severidad: 'GRAVE' },
      { tipo: 'GENERAL', descripcion: 'Sulfas', severidad: 'MODERADA' },
    ],
    farmacos: [
      { pa: 'Azitromicina', dosis: '500 mg', frecuencia: 'cada 24 h', indicacion: 'Faringitis (alérgica a penicilinas)' },
      { pa: 'Amlodipino', dosis: '5 mg', frecuencia: 'cada 24 h', indicacion: 'Hipertensión arterial' },
    ],
    muestra:
      'Alergia GRAVE exacta a Amoxicilina: al agregarla, el sistema la BLOQUEA. Ampicilina (misma familia) y Sulfametoxazol (sulfas) piden confirmación.',
    esperados: [],
    sinHallazgos: true,
    intentos: [
      { pa: 'Amoxicilina', resultado: 'BLOQUEA' },
      { pa: 'Ampicilina', resultado: 'CONFIRMA' },
      { pa: 'Sulfametoxazol', resultado: 'CONFIRMA' },
      { pa: 'Ceftriaxona', resultado: 'CONFIRMA' },
      { pa: 'Omeprazol', resultado: 'LIBRE' },
    ],
  },
  {
    numero: 5,
    etiqueta: 'EMBARAZO',
    nombre: 'Valentina',
    apellido: 'Rojas',
    grupo: 'Consultorio',
    edad: 29,
    sexo: 'F',
    alturaCm: 165,
    pesoKg: 71,
    // Sin creatinina a propósito: el Naproxeno tiene tabla renal que marca
    // «reducir dosis» aun con función normal, y este caso es para mostrar sólo
    // la alerta de embarazo.
    semanaGestacion: 32,
    condiciones: [],
    alergias: [],
    farmacos: [
      { pa: 'Naproxeno', dosis: '500 mg', frecuencia: 'cada 12 h', indicacion: 'Lumbalgia' },
      { pa: 'Omeprazol', dosis: '20 mg', frecuencia: 'cada 24 h' },
    ],
    muestra: 'Embarazo de 32 semanas con Naproxeno: contraindicado en el tercer trimestre (antes de la semana 28 sería «evitar»).',
    esperados: [{ categoria: 'CONDICION', incluye: ['naproxeno', 'embarazo'], rango: 0 }],
  },
  {
    numero: 6,
    etiqueta: 'SIN DATOS (NEUTRO)',
    nombre: 'Tomás',
    apellido: 'Acosta',
    grupo: 'Consultorio',
    edad: 58,
    sexo: 'M',
    condiciones: [],
    alergias: [],
    farmacos: [
      { pa: 'Enalapril', dosis: '10 mg', frecuencia: 'cada 12 h', indicacion: 'Hipertensión arterial' },
      { pa: 'Atorvastatina', dosis: '20 mg', frecuencia: 'cada 24 h', indicacion: 'Dislipemia' },
    ],
    libres: [{ nombre: 'Infusión de hierbas (sin identificar)', dosis: '1 taza', frecuencia: 'cada 24 h' }],
    muestra:
      'Sin peso ni creatinina ni Child-Pugh: el ajuste renal y el hepático quedan en NEUTRO (no se evalúa, no se tranquiliza). El fármaco libre no se verifica.',
    esperados: [],
    sinHallazgos: true,
    avisos: ['SIN_CLCR', 'SIN_CHILD_PUGH'],
  },
  {
    numero: 7,
    etiqueta: 'ADULTO MAYOR',
    nombre: 'Carmen',
    apellido: 'Techera',
    grupo: 'CTI',
    edad: 84,
    sexo: 'F',
    alturaCm: 152,
    pesoKg: 58,
    creatininaMgDl: 1.1,
    condiciones: ['ICC', 'DM2', 'HTA'],
    alergias: [],
    farmacos: [
      { pa: 'Diltiazem', dosis: '60 mg', frecuencia: 'cada 8 h', indicacion: 'Hipertensión arterial' },
      { pa: 'Diclofenaco', dosis: '50 mg', frecuencia: 'cada 12 h', indicacion: 'Artrosis' },
      { pa: 'Glibenclamida', dosis: '5 mg', frecuencia: 'cada 24 h', indicacion: 'Diabetes tipo 2' },
      { pa: 'Digoxina', dosis: '0,125 mg', frecuencia: 'cada 24 h', indicacion: 'Insuficiencia cardíaca' },
    ],
    muestra:
      '84 años con insuficiencia cardíaca, diabetes e HTA: alertas por condición (Diclofenaco y Diltiazem en ICC) y por adulto mayor (Glibenclamida, Digoxina).',
    esperados: [
      { categoria: 'CONDICION', incluye: ['diclofenaco', 'insuficiencia cardiaca'] },
      { categoria: 'CONDICION', incluye: ['diltiazem', 'insuficiencia cardiaca'] },
      { categoria: 'CONDICION', incluye: ['glibenclamida', 'adulto mayor'] },
      { categoria: 'CONDICION', incluye: ['digoxina', 'adulto mayor'] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const AHORA = new Date();
const FIN_SUSCRIPCION = new Date(AHORA.getTime() + 3 * 365 * 24 * 60 * 60 * 1000);

/** Fecha de nacimiento tal que hoy tenga exactamente `edad` años cumplidos (y siga así ~8 meses). */
function nacimientoPara(edad: number): Date {
  const d = new Date(Date.UTC(AHORA.getUTCFullYear() - edad, AHORA.getUTCMonth(), AHORA.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - 120);
  return d;
}

const fmtFecha = (d: Date) => d.toISOString().slice(0, 10);
const fmtNum = (n: number) => String(n).replace('.', ',');

function pautaTexto(f: { dosis: string; frecuencia: string }): string {
  return `${f.dosis} · ${f.frecuencia} · vía oral`;
}

interface Derivados {
  fechaNacimiento: Date;
  clcr: number | null;
  child: {
    bilirrubinaPuntos: 1 | 2 | 3;
    albuminaPuntos: 1 | 2 | 3;
    inrPuntos: 1 | 2 | 3;
    puntos: number;
    clase: ChildPughClase;
  } | null;
}

function derivar(p: PacienteSpec): Derivados {
  const fechaNacimiento = nacimientoPara(p.edad);
  let clcr: number | null = null;
  if (p.pesoKg !== undefined && p.creatininaMgDl !== undefined) {
    clcr = calcularClcr({
      edadAnios: edadEnAnios(fechaNacimiento, AHORA),
      pesoKg: p.pesoKg,
      creatininaMgDl: p.creatininaMgDl,
      sexo: p.sexo,
    });
  }
  let child: Derivados['child'] = null;
  if (p.hepatico) {
    const bilirrubinaPuntos = puntosBilirrubina(p.hepatico.bilirrubinaMgDl);
    const albuminaPuntos = puntosAlbumina(p.hepatico.albuminaGDl);
    const inrPuntos = puntosInr(p.hepatico.inr);
    const r = childPughDePuntos({
      bilirrubina: bilirrubinaPuntos,
      albumina: albuminaPuntos,
      inr: inrPuntos,
      ascitis: p.hepatico.ascitis,
      encefalopatia: p.hepatico.encefalopatia,
    });
    if (r.clase === null) throw new Error(`${p.apellido}: el Child-Pugh no quedó completo.`);
    child = { bilirrubinaPuntos, albuminaPuntos, inrPuntos, puntos: r.puntos, clase: r.clase };
  }
  return { fechaNacimiento, clcr, child };
}

// ---------------------------------------------------------------------------
// El catálogo, leído de la base (sólo lectura)
// ---------------------------------------------------------------------------

interface CatalogoLeido {
  paPorNombre: Map<string, { id: string; nombre: string; gruposIds: string[] }>;
  productoPorPaId: Map<string, { id: string; nombre: string }>;
  condicionPorCodigo: Map<string, { id: string; codigo: string; nombre: string }>;
  grupos: Map<string, GrupoAlergenico>;
  ajustesRenales: Map<string, AjusteRenalDeFarmaco[]>;
  ajustesHepaticos: Map<string, AjusteHepaticoDeFarmaco[]>;
  alertas: AlertaDeCatalogo[];
  curaciones: ContextoCockpit['curaciones'];
}

function nombresUsados(): string[] {
  const s = new Set<string>();
  for (const p of PACIENTES) {
    for (const f of p.farmacos) s.add(f.pa);
    for (const a of p.alergias) if (a.pa) s.add(a.pa);
    for (const i of p.intentos ?? []) s.add(i.pa);
  }
  return [...s];
}

async function leerCatalogo(): Promise<CatalogoLeido> {
  const problemas: string[] = [];

  const todosPa = await prisma.principioActivo.findMany({
    select: {
      id: true,
      nombre: true,
      nombreNormalizado: true,
      gruposAlergenicos: { select: { grupoAlergenicoId: true } },
    },
  });
  const porNorm = new Map(todosPa.map((p) => [p.nombreNormalizado, p]));
  const paPorNombre: CatalogoLeido['paPorNombre'] = new Map();
  for (const n of nombresUsados()) {
    const pa = porNorm.get(normalizar(n));
    if (!pa) {
      problemas.push(`El principio activo "${n}" no está en la base.`);
      continue;
    }
    paPorNombre.set(n, { id: pa.id, nombre: pa.nombre, gruposIds: pa.gruposAlergenicos.map((g) => g.grupoAlergenicoId) });
  }
  const ids = [...paPorNombre.values()].map((p) => p.id);

  // El producto con el que se prescribe: el genérico (uno por principio activo,
  // con el nombre del PA). No depende de que se haya corrido `dev:datos`.
  const productos = await prisma.productoComercial.findMany({
    where: { esGenerico: true, vigente: true, principiosActivos: { some: { principioActivoId: { in: ids } } } },
    select: { id: true, nombreComercial: true, principiosActivos: { select: { principioActivoId: true } } },
  });
  const productoPorPaId: CatalogoLeido['productoPorPaId'] = new Map();
  for (const pr of productos) {
    if (pr.principiosActivos.length !== 1) continue; // sólo genéricos de un componente
    productoPorPaId.set(pr.principiosActivos[0]!.principioActivoId, { id: pr.id, nombre: pr.nombreComercial });
  }
  for (const [n, pa] of paPorNombre) {
    if (!productoPorPaId.has(pa.id)) problemas.push(`"${n}" no tiene producto genérico (db:genericos).`);
  }

  const codigos = [...new Set(PACIENTES.flatMap((p) => p.condiciones))];
  const condiciones = await prisma.condicionClinica.findMany({
    where: { codigo: { in: [...codigos, CODIGO_EMBARAZO, CODIGO_ADULTO_MAYOR, CODIGO_LACTANCIA] } },
    select: { id: true, codigo: true, nombre: true },
  });
  const condicionPorCodigo: CatalogoLeido['condicionPorCodigo'] = new Map(condiciones.map((c) => [c.codigo, c]));
  for (const c of codigos) if (!condicionPorCodigo.has(c)) problemas.push(`La condición "${c}" no está en la base.`);

  if (problemas.length > 0) throw new Error('Falta catálogo:\n  - ' + problemas.join('\n  - '));

  const [gruposDb, renales, hepaticos, alertasDb, curadas] = await Promise.all([
    prisma.grupoAlergenico.findMany(),
    prisma.ajusteRenalFarmaco.findMany({
      where: { principioActivoId: { in: ids } },
      include: { rangos: { orderBy: { orden: 'asc' } } },
    }),
    prisma.ajusteHepaticoFarmaco.findMany({ where: { principioActivoId: { in: ids } }, include: { rangos: true } }),
    prisma.alertaCondicionFarmaco.findMany({
      where: { principioActivoId: { in: ids } },
      include: { condicionClinica: { select: { id: true, codigo: true, nombre: true } } },
    }),
    prisma.interaccionCurada.findMany(),
  ]);

  const grupos = new Map<string, GrupoAlergenico>(
    gruposDb.map((g) => [
      g.id,
      { id: g.id, codigo: g.codigo, nombre: g.nombre, nivelCruce: g.nivelCruce, grupoPadreId: g.grupoPadreId, sinonimos: g.sinonimos },
    ]),
  );

  const ajustesRenales = new Map<string, AjusteRenalDeFarmaco[]>();
  for (const a of renales) {
    const lista = ajustesRenales.get(a.principioActivoId) ?? [];
    lista.push({
      principioActivoId: a.principioActivoId,
      viaAdministracion: a.viaAdministracion,
      dosisFrNormal: a.dosisFrNormal,
      metodoAjuste: a.metodoAjuste,
      suplementoHd: a.suplementoHd,
      requiereRevision: a.requiereRevision,
      estadoValidacion: a.estadoValidacion,
      rangos: a.rangos.map((r) => ({
        id: r.id,
        orden: r.orden,
        clcrMin: r.clcrMin,
        clcrMax: r.clcrMax,
        rangoTexto: r.rangoTexto,
        textoRecomendacion: r.textoRecomendacion,
        tipo: r.tipo,
      })),
    });
    ajustesRenales.set(a.principioActivoId, lista);
  }

  const ajustesHepaticos = new Map<string, AjusteHepaticoDeFarmaco[]>();
  for (const a of hepaticos) {
    const lista = ajustesHepaticos.get(a.principioActivoId) ?? [];
    lista.push({
      principioActivoId: a.principioActivoId,
      viaAdministracion: a.viaAdministracion,
      dosisFuncionNormal: a.dosisFuncionNormal,
      metodoAjuste: a.metodoAjuste,
      requiereRevision: a.requiereRevision,
      estadoValidacion: a.estadoValidacion,
      rangos: a.rangos.map((r) => ({ id: r.id, clase: r.clase, textoRecomendacion: r.textoRecomendacion, tipo: r.tipo })),
    });
    ajustesHepaticos.set(a.principioActivoId, lista);
  }

  const alertas: AlertaDeCatalogo[] = alertasDb.map((a) => ({
    principioActivoId: a.principioActivoId,
    condicionId: a.condicionClinicaId,
    condicionCodigo: a.condicionClinica.codigo,
    condicionNombre: a.condicionClinica.nombre,
    severidad: a.severidad,
    texto: a.texto,
    semanaMin: a.semanaMin,
    semanaMax: a.semanaMax,
    estadoValidacion: a.estadoValidacion,
  }));

  const curaciones: CatalogoLeido['curaciones'] = new Map(
    curadas.map((c) => [
      c.parClave,
      { parClave: c.parClave, rechazado: c.rechazado, severidadOverride: c.severidadOverride, textoOverride: c.textoOverride },
    ]),
  );

  return { paPorNombre, productoPorPaId, condicionPorCodigo, grupos, ajustesRenales, ajustesHepaticos, alertas, curaciones };
}

/**
 * Las alergias tal como las dejaría `TratamientoService.agregarAlergia`: la
 * FARMACOLOGICA toma el grupo del principio activo; la GENERAL lo resuelve desde
 * el texto libre (y si no matchea, queda sin grupo, no se inventa uno).
 */
function resolverAlergias(p: PacienteSpec, cat: CatalogoLeido) {
  return p.alergias.map((a, i) => {
    let principioActivoId: string | null = null;
    let grupoAlergenicoId: string | null = null;
    if (a.tipo === 'FARMACOLOGICA') {
      const pa = cat.paPorNombre.get(a.pa!)!;
      principioActivoId = pa.id;
      grupoAlergenicoId = pa.gruposIds[0] ?? null;
    } else {
      grupoAlergenicoId = mapearTextoLibreAGrupo(a.descripcion!, cat.grupos.values())?.id ?? null;
      if (!grupoAlergenicoId) throw new Error(`La alergia "${a.descripcion}" no mapea a ninguna familia del catálogo.`);
    }
    return {
      id: `alergia-${p.numero}-${i}`,
      tipo: a.tipo,
      severidad: a.severidad,
      principioActivoId,
      grupoAlergenicoId,
      descripcion: a.tipo === 'GENERAL' ? a.descripcion! : null,
    };
  });
}

// ---------------------------------------------------------------------------
// El motor, en memoria
// ---------------------------------------------------------------------------

function armarContexto(p: PacienteSpec, d: Derivados, cat: CatalogoLeido, umbral: number): ContextoCockpit {
  const pacienteId = `demo-${p.numero}`;

  const prescripciones: PrescripcionActiva[] = [
    ...p.farmacos.map((f, i): PrescripcionActiva => {
      const pa = cat.paPorNombre.get(f.pa)!;
      const prod = cat.productoPorPaId.get(pa.id)!;
      const id = `rx-${p.numero}-${String(i).padStart(2, '0')}`;
      return {
        id,
        esFarmacoLibre: false,
        nombreLibre: null,
        productoComercialId: prod.id,
        nombreMostrado: prod.nombre,
        dosis: f.dosis,
        frecuencia: f.frecuencia,
        via: 'ORAL',
        componentes: [{ prescripcionId: id, principioActivoId: pa.id, nombre: pa.nombre, gruposAlergenicosIds: pa.gruposIds }],
      };
    }),
    ...(p.libres ?? []).map((l, i): PrescripcionActiva => ({
      id: `rx-${p.numero}-L${i}`,
      esFarmacoLibre: true,
      nombreLibre: l.nombre,
      productoComercialId: null,
      nombreMostrado: l.nombre,
      dosis: l.dosis,
      frecuencia: l.frecuencia,
      via: 'ORAL',
      componentes: [],
    })),
  ];

  const condiciones = p.condiciones.map((c) => cat.condicionPorCodigo.get(c)!);
  const edad = edadEnAnios(d.fechaNacimiento, AHORA);
  const sinteticos: string[] = [];
  if (edad >= umbral) sinteticos.push(CODIGO_ADULTO_MAYOR);
  if (p.semanaGestacion !== undefined) sinteticos.push(CODIGO_EMBARAZO);
  const codigosTodos = new Set([...condiciones.map((c) => c.codigo), ...sinteticos]);

  const idsPa = new Set(prescripciones.flatMap((r) => r.componentes.map((c) => c.principioActivoId)));
  const alergias: AlergiaPaciente[] = resolverAlergias(p, cat).map((a) => ({
    id: a.id,
    severidad: a.severidad,
    principioActivoId: a.principioActivoId,
    grupoAlergenicoId: a.grupoAlergenicoId,
  }));

  const subconjunto = <T>(m: Map<string, T[]>) => new Map([...m].filter(([k]) => idsPa.has(k)));

  return {
    paciente: {
      id: pacienteId,
      medicoId: 'demo',
      nombre: p.nombre,
      apellido: p.apellido,
      fechaNacimiento: d.fechaNacimiento,
      sexo: p.sexo,
      pesoKg: p.pesoKg ?? null,
      alturaCm: p.alturaCm ?? null,
      creatininaMgDl: p.creatininaMgDl ?? null,
      clcrMlMin: d.clcr,
      clcrOrigen: d.clcr === null ? null : 'CALCULADO_COCKCROFT',
      clcrMedidoAt: d.clcr === null ? null : AHORA,
      childPughClase: d.child?.clase ?? null,
      childPughOrigen: d.child ? 'CALCULADO' : null,
      semanaGestacion: p.semanaGestacion ?? null,
      estaLactando: null,
    },
    prescripciones,
    condicionesCargadasIds: condiciones.map((c) => c.id),
    condicionesCargadasCodigos: condiciones.map((c) => c.codigo),
    alergias,
    gruposAlergenicos: cat.grupos,
    ajustesRenales: subconjunto(cat.ajustesRenales),
    ajustesHepaticos: subconjunto(cat.ajustesHepaticos),
    alertas: cat.alertas.filter((a) => idsPa.has(a.principioActivoId) && codigosTodos.has(a.condicionCodigo)),
    curaciones: cat.curaciones,
    umbralAdultoMayor: umbral,
  };
}

function nombreDeRango(r: number): string {
  return RANGO_ETIQUETA[r as keyof typeof RANGO_ETIQUETA] ?? String(r);
}

/** Imprime lo que el motor dice y devuelve las fallas contra lo esperado. */
function revisar(p: PacienteSpec, ctx: ContextoCockpit, catalogoInteracciones: CatalogoInteracciones, cat: CatalogoLeido, sangria = '      '): string[] {
  const r: ResultadoCockpit = evaluarCockpit(ctx, catalogoInteracciones, AHORA);
  const fallas: string[] = [];

  console.log(`${sangria}Motor: ${r.hallazgos.length} hallazgo(s)` + (r.clcrMlMin === null ? ', sin Clcr' : `, Clcr ${fmtNum(r.clcrMlMin)} mL/min (${r.gradoKdigo ?? 's/d'})`));
  for (const h of r.hallazgos) {
    console.log(`${sangria}  · [${nombreDeRango(h.rango)}] ${h.categoria}: ${h.titulo}`);
  }
  for (const a of r.avisos) console.log(`${sangria}  · (neutro) ${a.codigo}`);

  const texto = (h: (typeof r.hallazgos)[number]) => normalizar(`${h.titulo} ${h.subtitulo ?? ''} ${h.detalle} ${h.condicionNombre ?? ''}`);
  for (const e of p.esperados) {
    const ok = r.hallazgos.some(
      (h) => h.categoria === e.categoria && e.incluye.every((s) => texto(h).includes(normalizar(s))) && (e.rango === undefined || h.rango === e.rango),
    );
    if (!ok) fallas.push(`falta ${e.categoria} [${e.incluye.join(' + ')}]${e.rango === undefined ? '' : ` con rango ${nombreDeRango(e.rango)}`}`);
  }
  if (p.sinHallazgos && r.hallazgos.length > 0) fallas.push(`debía quedar sin hallazgos y tiene ${r.hallazgos.length}`);
  const codigosAviso = new Set(r.avisos.map((a) => a.codigo as string));
  for (const a of p.avisos ?? []) if (!codigosAviso.has(a)) fallas.push(`falta el aviso ${a}`);
  for (const a of p.sinAvisos ?? []) if (codigosAviso.has(a)) fallas.push(`no debía aparecer el aviso ${a}`);

  if (p.intentos) {
    const alergias = ctx.alergias;
    console.log(`${sangria}Si se intentara agregar:`);
    for (const i of p.intentos) {
      const pa = cat.paPorNombre.get(i.pa)!;
      const coincidencias = evaluarAlergias({ principioActivoId: pa.id, gruposIds: pa.gruposIds }, alergias, ctx.gruposAlergenicos);
      const resultado: 'BLOQUEA' | 'CONFIRMA' | 'LIBRE' = coincidencias.some((c) => c.bloquea)
        ? 'BLOQUEA'
        : coincidencias.some((c) => c.requiereConfirmacion)
          ? 'CONFIRMA'
          : 'LIBRE';
      const detalle = coincidencias.map((c) => `${c.tipo} ${c.severidad}`).join(', ');
      console.log(`${sangria}  · ${i.pa.padEnd(16)} → ${resultado}${detalle ? ` (${detalle})` : ''}`);
      if (resultado !== i.resultado) fallas.push(`intentar ${i.pa} daba ${resultado} y se esperaba ${i.resultado}`);
    }
  }

  console.log(`${sangria}Esperado: ${fallas.length === 0 ? 'OK' : 'FALLA — ' + fallas.join('; ')}`);
  return fallas;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const { HashService } = await import('../src/aplicacion/auth/hash.service');
  const { cargarReglasInteraccion, RUTA_REGLAS_POR_DEFECTO } = await import(
    '../src/infraestructura/catalogo/cargar-reglas-interaccion'
  );
  const { nombreFarmaco, pauta, conUnidad } = await import('../src/aplicacion/historial/redaccion');
  const { cargarContextosDeMedico } = await import('../src/infraestructura/repositorios/cargar-contextos');

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log(APLICAR ? '  CUENTA DE PRESENTACIÓN — APLICANDO CAMBIOS' : '  CUENTA DE PRESENTACIÓN — SIMULACRO (no se escribe nada)');
  console.log('══════════════════════════════════════════════════════════════\n');

  // ---- 1. la cuenta -----------------------------------------------------
  const existente = await prisma.medico.findUnique({
    where: { email: EMAIL },
    include: { suscripcion: true, configuracion: true },
  });
  if (existente && (existente.rol === 'ADMIN' || existente.rol === 'SUPERADMIN')) {
    throw new Error('Esa cuenta tiene rol de administración: no es una cuenta de presentación. No se toca.');
  }

  let nombreUsuario = existente?.nombreUsuario ?? '';
  if (!existente) {
    const pedido = (process.env.GFH_PRESENTACION_USUARIO ?? '').trim().toLowerCase();
    const base = (pedido || (EMAIL.split('@')[0] ?? '').replace(/[^a-z0-9._-]/g, '')).slice(0, 30);
    if (base.length < 3 || !/^[a-z0-9._-]+$/.test(base)) {
      throw new Error('No se pudo derivar un nombre de usuario válido: definí GFH_PRESENTACION_USUARIO (3 a 30 caracteres: letras, números, . _ -).');
    }
    const ocupado = await prisma.medico.findUnique({ where: { nombreUsuario: base }, select: { id: true } });
    if (ocupado) throw new Error(`El nombre de usuario "${base}" ya lo tiene otra cuenta: definí GFH_PRESENTACION_USUARIO con otro.`);
    nombreUsuario = base;
  }

  const demoExistentes = existente
    ? await prisma.paciente.findMany({
        where: { medicoId: existente.id, documento: { startsWith: PREFIJO_DEMO } },
        select: { id: true, nombre: true, apellido: true, documento: true },
      })
    : [];
  const otros = existente
    ? await prisma.paciente.count({ where: { medicoId: existente.id, NOT: { documento: { startsWith: PREFIJO_DEMO } } } })
    : 0;

  console.log('CUENTA');
  console.log(`  email            : ${EMAIL}   (contraseña: la de GFH_PRESENTACION_PASSWORD, no se muestra)`);
  console.log(`  usuario          : ${nombreUsuario}`);
  console.log(`  estado           : ${existente ? 'EXISTE → se actualiza' : 'NO EXISTE → se crea'}`);
  console.log('  se deja así      :');
  console.log('    · contraseña con Argon2id (el mismo hash que el registro)');
  console.log(`    · suscripción ACTIVA (premium, App Store) hasta ${fmtFecha(FIN_SUSCRIPCION)}` + (existente?.suscripcion ? `  [hoy: ${existente.suscripcion.estado} hasta ${fmtFecha(existente.suscripcion.periodoActualFin)}]` : '  [hoy: sin suscripción]'));
  console.log(`    · disclaimer v${VERSION_DISCLAIMER} aceptado`);
  console.log(`    · términos v${VERSION_CONSENTIMIENTO.TERMINOS}, Vera v${VERSION_CONSENTIMIENTO.VERA} y foto v${VERSION_CONSENTIMIENTO.FOTO} aceptados`);
  console.log('    · tema CLARO, notificaciones push apagadas, estado ACTIVO, sin bloqueo por intentos');
  console.log('    · grupos «Consultorio» y «CTI» (si faltan)');
  console.log(`  pacientes demo hoy: ${demoExistentes.length}` + (demoExistentes.length ? ` → se BORRAN y se recrean (${demoExistentes.map((x) => `${x.apellido} ${x.documento}`).join(', ')})` : ''));
  console.log(`  otros pacientes  : ${otros} → NO se tocan`);
  console.log('  otras cuentas    : NO se tocan\n');

  // ---- 2. catálogo + motor (sólo lectura) ----------------------------------
  const cat = await leerCatalogo();
  const { reglas } = cargarReglasInteraccion(RUTA_REGLAS_POR_DEFECTO);
  const catalogoInteracciones = construirCatalogo(reglas);
  const umbral = existente?.configuracion?.umbralAdultoMayor ?? 65;

  console.log(`PACIENTES A CREAR (${PACIENTES.length}) — verificados con el motor clínico real, en memoria\n`);
  const fallas: string[] = [];
  const derivados = new Map<number, Derivados>();
  for (const p of PACIENTES) {
    const d = derivar(p);
    derivados.set(p.numero, d);
    const ctx = armarContexto(p, d, cat, umbral);
    const edad = edadEnAnios(d.fechaNacimiento, AHORA);

    console.log(`  ${p.numero}. ${p.nombre} ${p.apellido} — ${p.etiqueta}   [${p.grupo}] ${PREFIJO_DEMO}${String(p.numero).padStart(2, '0')}`);
    console.log(`      ${edad} años · ${p.sexo}` + (p.alturaCm ? ` · ${p.alturaCm} cm` : '') + (p.pesoKg ? ` · ${fmtNum(p.pesoKg)} kg` : ' · sin peso') + (p.creatininaMgDl ? ` · creatinina ${fmtNum(p.creatininaMgDl)} mg/dL` : ' · sin creatinina') + (d.clcr !== null ? ` → Clcr ${fmtNum(d.clcr)} mL/min (Cockcroft-Gault)` : ''));
    if (d.child) console.log(`      Child-Pugh ${d.child.clase} (${d.child.puntos} puntos; bilirrubina ${fmtNum(p.hepatico!.bilirrubinaMgDl)}, albúmina ${fmtNum(p.hepatico!.albuminaGDl)}, INR ${fmtNum(p.hepatico!.inr)}, ascitis ${p.hepatico!.ascitis.toLowerCase()})`);
    if (p.semanaGestacion !== undefined) console.log(`      Embarazo: semana ${p.semanaGestacion}`);
    if (p.condiciones.length) console.log(`      Condiciones: ${p.condiciones.map((c) => cat.condicionPorCodigo.get(c)!.nombre).join(', ')}`);
    for (const a of p.alergias) console.log(`      Alergia ${a.severidad}: ${a.tipo === 'FARMACOLOGICA' ? a.pa + ' (exacta)' : a.descripcion + ' (familia, texto libre)'}`);
    for (const f of p.farmacos) console.log(`      Rx  ${f.pa.padEnd(15)} ${pautaTexto(f)}`);
    for (const l of p.libres ?? []) console.log(`      Rx  ${l.nombre} (fármaco libre) ${l.dosis} · ${l.frecuencia}`);
    console.log(`      Muestra: ${p.muestra}`);
    for (const f of revisar(p, ctx, catalogoInteracciones, cat)) fallas.push(`${p.apellido}: ${f}`);
    console.log('');
  }

  if (fallas.length > 0) {
    console.log('✗ Alguna verificación no coincide con lo diseñado:');
    for (const f of fallas) console.log(`    - ${f}`);
    if (APLICAR) throw new Error('No se escribió nada: ajustá los datos del script y volvé a correr.');
    process.exitCode = 1;
  } else {
    console.log('✓ Los siete pacientes producen lo que muestran.\n');
  }

  if (!APLICAR) {
    console.log('SIMULACRO: no se escribió nada. Para aplicar:  demo:presentacion -- --aplicar\n');
    return;
  }

  // ---- 3. escritura ------------------------------------------------------
  const passwordHash = await new HashService().hashearPassword(PASSWORD);
  const fin = FIN_SUSCRIPCION;

  const medicoId = await prisma.$transaction(
    async (tx) => {
      const consentimientos = {
        disclaimerVersion: VERSION_DISCLAIMER,
        disclaimerAceptadoAt: AHORA,
        terminosVersion: VERSION_CONSENTIMIENTO.TERMINOS,
        terminosAceptadosAt: AHORA,
        consentimientoVeraVersion: VERSION_CONSENTIMIENTO.VERA,
        consentimientoVeraAt: AHORA,
        consentimientoFotoVersion: VERSION_CONSENTIMIENTO.FOTO,
        consentimientoFotoAt: AHORA,
      };
      const abierta = {
        estado: 'ACTIVO' as const,
        eliminadaAt: null,
        intentosLoginFallidos: 0,
        ventanaLoginDesde: null,
        bloqueadoHasta: null,
      };

      const medico = existente
        ? await tx.medico.update({
            where: { id: existente.id },
            data: { passwordHash, ...consentimientos, ...abierta },
          })
        : await tx.medico.create({
            data: {
              email: EMAIL,
              nombreUsuario,
              passwordHash,
              nombre: (process.env.GFH_PRESENTACION_NOMBRE ?? '').trim() || 'Médico',
              apellido: (process.env.GFH_PRESENTACION_APELLIDO ?? '').trim() || 'de Presentación',
              rol: 'USER',
              ...consentimientos,
              ...abierta,
            },
          });

      await tx.configuracionUsuario.upsert({
        where: { medicoId: medico.id },
        update: { tema: 'CLARO', notificacionesPush: false },
        create: { medicoId: medico.id, tema: 'CLARO', notificacionesPush: false },
      });

      const suscripcion = {
        entitlementId: 'premium',
        productId: 'gfh.mensual',
        store: 'APP_STORE' as const,
        estado: 'ACTIVA' as const,
        periodoActualFin: fin,
        periodoEsTrial: false,
        ultimoEventoId: `presentacion-${medico.id}`,
        ultimoEventoTipo: 'INITIAL_PURCHASE',
      };
      await tx.suscripcion.upsert({
        where: { medicoId: medico.id },
        update: suscripcion,
        create: { medicoId: medico.id, ...suscripcion },
      });

      const grupoId = new Map<Grupo, string>();
      for (const nombre of ['Consultorio', 'CTI'] as const) {
        const g = await tx.grupo.upsert({
          where: { medicoId_nombre: { medicoId: medico.id, nombre } },
          update: {},
          create: { medicoId: medico.id, nombre },
        });
        grupoId.set(nombre, g.id);
      }

      // Sólo los de ESTA cuenta y sólo los marcados. Los hijos se van en cascada.
      await tx.paciente.deleteMany({ where: { medicoId: medico.id, documento: { startsWith: PREFIJO_DEMO } } });

      const base = AHORA.getTime() - 30 * 60_000; // los eventos del historial, con minutos de diferencia
      for (const p of PACIENTES) {
        const d = derivados.get(p.numero)!;
        let minuto = 0;
        const evento = (e: { tipo: Prisma.EventoPacienteUncheckedCreateWithoutPacienteInput['tipo']; titulo: string; detalle?: string | null; cambios?: Prisma.InputJsonValue }) => ({
          medicoId: medico.id,
          tipo: e.tipo,
          titulo: e.titulo,
          detalle: e.detalle ?? null,
          ...(e.cambios ? { cambios: e.cambios } : {}),
          createdAt: new Date(base + (minuto += 1) * 60_000),
        });

        const eventos = [
          evento({ tipo: 'PACIENTE_CREADO', titulo: 'Paciente creado', detalle: d.clcr === null ? null : 'Clcr inicial ' + conUnidad(d.clcr, 'mL/min') + '.' }),
        ];
        if (p.semanaGestacion !== undefined) {
          eventos.push(
            evento({
              tipo: 'EMBARAZO_LACTANCIA',
              titulo: 'Embarazo y lactancia actualizados',
              detalle: 'Las alertas de embarazo se recalculan con la semana ' + p.semanaGestacion + '.',
              cambios: [{ campo: 'Semana de gestación', antes: null, despues: p.semanaGestacion + ' semanas' }],
            }),
          );
        }
        for (const c of p.condiciones) {
          eventos.push(evento({ tipo: 'CONDICION_AGREGADA', titulo: cat.condicionPorCodigo.get(c)!.nombre + ' agregada' }));
        }
        for (const a of resolverAlergias(p, cat).map((x, i) => ({ x, spec: p.alergias[i]! }))) {
          eventos.push(
            evento({
              tipo: 'ALERGIA_AGREGADA',
              titulo: 'Alergia a ' + (a.spec.pa ?? a.spec.descripcion),
              detalle: 'Severidad ' + a.spec.severidad.toLowerCase() + '.',
            }),
          );
        }
        if (d.child) {
          eventos.push(
            evento({
              tipo: 'DATOS_HEPATICOS',
              titulo: 'Función hepática actualizada',
              detalle: `${d.child.puntos} de 15 puntos. ${GLOSA_CLASE[d.child.clase]}`,
              cambios: [{ campo: 'Clase Child-Pugh', antes: null, despues: d.child.clase }],
            }),
          );
        }
        for (const f of p.farmacos) {
          eventos.push(
            evento({
              tipo: 'FARMACO_AGREGADO',
              titulo: nombreFarmaco({ esFarmacoLibre: false, nombreLibre: null, producto: { nombreComercial: f.pa } }) + ' agregado',
              detalle: pauta({ dosis: f.dosis, frecuencia: f.frecuencia, via: 'ORAL' }),
            }),
          );
        }
        for (const l of p.libres ?? []) {
          eventos.push(evento({ tipo: 'FARMACO_AGREGADO', titulo: l.nombre + ' agregado', detalle: pauta({ dosis: l.dosis, frecuencia: l.frecuencia, via: 'ORAL' }) }));
        }

        const alergias = resolverAlergias(p, cat);

        await tx.paciente.create({
          data: {
            medicoId: medico.id,
            grupoId: grupoId.get(p.grupo)!,
            nombre: p.nombre,
            apellido: p.apellido,
            documento: `${PREFIJO_DEMO}${String(p.numero).padStart(2, '0')}`,
            fechaNacimiento: d.fechaNacimiento,
            sexo: p.sexo,
            alturaCm: p.alturaCm ?? null,
            pesoKg: p.pesoKg ?? null,
            creatininaMgDl: p.creatininaMgDl ?? null,
            clcrMlMin: d.clcr,
            clcrOrigen: d.clcr === null ? null : 'CALCULADO_COCKCROFT',
            clcrMedidoAt: d.clcr === null ? null : AHORA,
            ...(d.child && p.hepatico
              ? {
                  bilirrubinaPuntos: d.child.bilirrubinaPuntos,
                  albuminaPuntos: d.child.albuminaPuntos,
                  inrPuntos: d.child.inrPuntos,
                  bilirrubinaMgDl: p.hepatico.bilirrubinaMgDl,
                  albuminaGDl: p.hepatico.albuminaGDl,
                  inr: p.hepatico.inr,
                  ascitis: p.hepatico.ascitis,
                  encefalopatia: p.hepatico.encefalopatia,
                  childPughClase: d.child.clase,
                  childPughOrigen: 'CALCULADO' as const,
                  childPughMedidoAt: AHORA,
                }
              : {}),
            semanaGestacion: p.semanaGestacion ?? null,
            estaLactando: null,
            prescripciones: {
              create: [
                ...p.farmacos.map((f) => ({
                  medicoId: medico.id,
                  productoComercialId: cat.productoPorPaId.get(cat.paPorNombre.get(f.pa)!.id)!.id,
                  dosis: f.dosis,
                  frecuencia: f.frecuencia,
                  via: 'ORAL' as ViaAdministracion,
                  indicacion: f.indicacion ?? null,
                  estado: 'ACTIVO' as const,
                })),
                ...(p.libres ?? []).map((l) => ({
                  medicoId: medico.id,
                  esFarmacoLibre: true,
                  nombreLibre: l.nombre,
                  dosis: l.dosis,
                  frecuencia: l.frecuencia,
                  via: 'ORAL' as ViaAdministracion,
                  estado: 'ACTIVO' as const,
                })),
              ],
            },
            condiciones: {
              create: p.condiciones.map((c) => ({
                medicoId: medico.id,
                condicionClinicaId: cat.condicionPorCodigo.get(c)!.id,
                activo: true,
              })),
            },
            alergias: {
              create: alergias.map((a) => ({
                medicoId: medico.id,
                tipo: a.tipo,
                severidad: a.severidad,
                principioActivoId: a.principioActivoId,
                grupoAlergenicoId: a.grupoAlergenicoId,
                descripcion: a.descripcion,
                activo: true,
              })),
            },
            eventos: { create: eventos },
          },
        });
      }

      await tx.auditLog.create({
        data: { medicoId: medico.id, accion: 'ADMIN_ACTION', detalle: 'cuenta de presentación preparada (demo:presentacion)' },
      });

      return medico.id;
    },
    { maxWait: 20_000, timeout: 180_000 },
  );

  // ---- 4. comprobación contra lo que quedó en la base ----------------------
  console.log('ESCRITO. Comprobando contra la base (el mismo cargador que usa la lista de pacientes)…\n');
  const contextos = await cargarContextosDeMedico(prisma, medicoId, () => new Date());
  const filas = await prisma.paciente.findMany({
    where: { medicoId, documento: { startsWith: PREFIJO_DEMO } },
    select: { id: true, documento: true, apellido: true },
    orderBy: { documento: 'asc' },
  });
  let distintos = 0;
  for (const f of filas) {
    const ctx = contextos.get(f.id);
    const spec = PACIENTES.find((p) => `${PREFIJO_DEMO}${String(p.numero).padStart(2, '0')}` === f.documento);
    if (!ctx || !spec) continue;
    const real = evaluarCockpit(ctx, catalogoInteracciones, new Date());
    const enMemoria = evaluarCockpit(armarContexto(spec, derivados.get(spec.numero)!, cat, umbral), catalogoInteracciones, new Date());
    const igual = real.hallazgos.length === enMemoria.hallazgos.length;
    if (!igual) distintos += 1;
    console.log(`  ${f.documento}  ${f.apellido.padEnd(10)} ${real.hallazgos.length} hallazgo(s) en la base${igual ? '' : `  ✗ (en memoria eran ${enMemoria.hallazgos.length})`}`);
  }
  console.log(distintos === 0 ? '\n✓ Lo guardado coincide con lo verificado.' : `\n✗ ${distintos} paciente(s) difieren de lo verificado: revisar.`);
  if (distintos > 0) process.exitCode = 1;

  console.log('\nLISTO. Para presentar:');
  console.log(`  · entrar con ${EMAIL} desde UN solo dispositivo (un segundo login del mismo tipo desplaza al primero)`);
  console.log('  · el bloqueo biométrico es del teléfono, no de la cuenta: se apaga en Perfil > Bloqueo');
  console.log('  · Vera: tope de 10 consultas por 24 h, no se pueden borrar');
  console.log('  · el backend tiene que correr con EXIGIR_SUSCRIPCION=1 para que el corte gratis/pago se note\n');
}

main()
  .catch((e) => {
    console.error('\n' + (e instanceof Error ? e.message : String(e)));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
