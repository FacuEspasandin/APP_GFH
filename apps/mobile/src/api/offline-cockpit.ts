import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  armarRespuestaCockpit,
  construirCatalogo,
  evaluarCockpit,
  procesarReglasInteraccion,
  type ArchivoReglas,
  type ContextoCockpit,
} from '@gfh/motor-clinico';
import reglasCrudas from '@gfh/motor-clinico/reglas-interaccion.json';

import type { Cockpit } from './tipos';

/**
 * Cockpit sin conexión (offline nivel 2).
 *
 * Cada vez que el cockpit de un paciente carga con señal, `[id].tsx` guarda
 * acá el `ContextoCockpit` crudo que ya bajó del backend. Si después se
 * pierde la señal, `calcularCockpitOffline` corre el MISMO motor
 * (`@gfh/motor-clinico`) sobre esa copia y arma la MISMA forma de respuesta
 * (`armarRespuestaCockpit`) que usa la pantalla online — no una aproximación.
 *
 * Exclusivo de cuentas con suscripción vigente: quien llama decide eso antes
 * de invocar `guardarContextoOffline`, no este módulo.
 */

const PREFIJO_CLAVE = 'gfh.offline.cockpit.';

// El catálogo se construye una sola vez, desde el JSON que el paquete trae
// bundleado — igual que hace el backend al boot, pero sin tocar disco: acá
// ya es parte del bundle de la app.
const { reglas } = procesarReglasInteraccion(reglasCrudas as ArchivoReglas);
const catalogo = construirCatalogo(reglas);

/** Lo que se guarda en disco: el contexto, más cuándo se guardó. */
interface ContextoGuardado {
  contexto: ContextoCockpitSerializado;
  guardadoAt: string;
}

/** `ContextoCockpit`, pero con Maps→arrays y Dates→ISO, listo para JSON. Es
 *  la forma exacta que devuelve `GET .../cockpit/contexto-offline`. */
export type ContextoCockpitSerializado = Omit<
  ContextoCockpit,
  'gruposAlergenicos' | 'ajustesRenales' | 'ajustesHepaticos' | 'curaciones' | 'paciente'
> & {
  paciente: Omit<ContextoCockpit['paciente'], 'fechaNacimiento' | 'clcrMedidoAt'> & {
    fechaNacimiento: string;
    clcrMedidoAt: string | null;
  };
  gruposAlergenicos: Array<[string, ContextoCockpit['gruposAlergenicos'] extends Map<string, infer V> ? V : never]>;
  ajustesRenales: Array<[string, ContextoCockpit['ajustesRenales'] extends Map<string, infer V> ? V : never]>;
  ajustesHepaticos: Array<[string, ContextoCockpit['ajustesHepaticos'] extends Map<string, infer V> ? V : never]>;
  curaciones: Array<[string, ContextoCockpit['curaciones'] extends Map<string, infer V> ? V : never]>;
};

/**
 * Guarda el contexto crudo de un paciente, tal cual lo devuelve
 * `GET .../cockpit/contexto-offline` (ya viene con los Map serializados a
 * arrays). Sin tope de cantidad de pacientes: es texto, pesa poco.
 */
export async function guardarContextoOffline(
  pacienteId: string,
  contexto: ContextoCockpitSerializado,
): Promise<void> {
  const guardado: ContextoGuardado = { contexto, guardadoAt: new Date().toISOString() };
  await AsyncStorage.setItem(PREFIJO_CLAVE + pacienteId, JSON.stringify(guardado));
}

export async function leerContextoOffline(
  pacienteId: string,
): Promise<ContextoGuardado | null> {
  const crudo = await AsyncStorage.getItem(PREFIJO_CLAVE + pacienteId);
  if (!crudo) return null;
  return JSON.parse(crudo) as ContextoGuardado;
}

/**
 * Corre el motor localmente sobre la última copia guardada de este paciente.
 * `null` si nunca se guardó nada —no inventa un cockpit vacío, Regla 5—.
 */
export async function calcularCockpitOffline(pacienteId: string): Promise<Cockpit | null> {
  const guardado = await leerContextoOffline(pacienteId);
  if (!guardado) return null;

  const s = guardado.contexto;
  const contexto: ContextoCockpit = {
    ...s,
    paciente: {
      ...s.paciente,
      fechaNacimiento: new Date(s.paciente.fechaNacimiento),
      clcrMedidoAt: s.paciente.clcrMedidoAt ? new Date(s.paciente.clcrMedidoAt) : null,
    },
    gruposAlergenicos: new Map(s.gruposAlergenicos),
    ajustesRenales: new Map(s.ajustesRenales),
    ajustesHepaticos: new Map(s.ajustesHepaticos),
    curaciones: new Map(s.curaciones),
  };

  const resultado = evaluarCockpit(contexto, catalogo, new Date());
  const respuesta = armarRespuestaCockpit(contexto, resultado);

  return {
    paciente: respuesta.paciente,
    // La misma forma que ya manda el backend por HTTP — acá se tipa a mano
    // porque el motor devuelve `espina: number | null` y la pantalla espera
    // el rango acotado (`RangoGravedad`); el backend cruza el mismo límite
    // sin avisarle a TypeScript, al viajar por JSON.
    prescripciones: respuesta.prescripciones as unknown as Cockpit['prescripciones'],
    dashboard: respuesta.conteoPorCategoria,
    hallazgos: respuesta.hallazgos,
    avisos: respuesta.avisos,
    condicionesEfectivas: respuesta.condicionesEfectivasCodigos,
    offline: true,
    calculadoConDatosDe: guardado.guardadoAt,
  };
}
