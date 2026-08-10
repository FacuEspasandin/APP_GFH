/**
 * Puertos del motor clínico — lo que el dominio necesita del mundo exterior,
 * expresado sin nombrar a Prisma.
 *
 * La forma de estos métodos NO es casual: cada uno devuelve todo lo que hace
 * falta para una evaluación completa, en UNA llamada. Es la contracara de los
 * errores de rendimiento que el motor documenta dos veces (§4.6, §5.5, §8.5):
 * la primera versión de GFH pedía la recomendación de a un fármaco por vez y
 * midió 103 peticiones HTTP en una sola pantalla, y la detección de
 * interacciones hacía 3 consultas por par — 24,7 s de mediana con 5 fármacos.
 *
 * Si algún día un método de acá recibe un id suelto en vez de una lista, ese es
 * el momento en que el problema vuelve.
 */

import type { SeveridadAlerta } from './condiciones';
import type { ComponenteActivo, Curacion } from './interacciones';
import type { AlergiaPaciente, GrupoAlergenico } from './alergias';
import type { RangoClcr } from './ajuste-renal';

/**
 * Un componente activo con sus grupos alergénicos ya resueltos. Se traen en la
 * misma consulta que las prescripciones: pedirlos después, por fármaco, sería
 * el N+1 de siempre.
 */
export interface ComponenteConGrupos extends ComponenteActivo {
  gruposAlergenicosIds: string[];
}

export interface PrescripcionActiva {
  id: string;
  esFarmacoLibre: boolean;
  nombreLibre: string | null;
  productoComercialId: string | null;
  nombreMostrado: string;
  dosis: string;
  frecuencia: string;
  via: string;
  /** Un producto combinado aporta más de uno. Vacío si es fármaco libre. */
  componentes: ComponenteConGrupos[];
}

export interface AjusteRenalDeFarmaco {
  principioActivoId: string;
  viaAdministracion: string;
  dosisFrNormal: string;
  metodoAjuste: string;
  suplementoHd: string | null;
  requiereRevision: boolean;
  estadoValidacion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  rangos: RangoClcr[];
}

export interface AlertaDeCatalogo {
  principioActivoId: string;
  condicionId: string;
  condicionCodigo: string;
  condicionNombre: string;
  severidad: SeveridadAlerta;
  texto: string;
  semanaMin: number | null;
  semanaMax: number | null;
  estadoValidacion: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
}

export interface DatosPaciente {
  id: string;
  medicoId: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: Date;
  sexo: 'M' | 'F' | 'OTRO';
  pesoKg: number | null;
  alturaCm: number | null;
  creatininaMgDl: number | null;
  clcrMlMin: number | null;
  clcrOrigen: string | null;
  clcrMedidoAt: Date | null;
  childPughClase: 'A' | 'B' | 'C' | null;
  childPughOrigen: string | null;
  semanaGestacion: number | null;
  estaLactando: boolean | null;
}

/**
 * Todo lo que se necesita para evaluar un paciente, en una sola estructura.
 *
 * El adaptador que la arma resuelve el conjunto con un número FIJO de consultas
 * — no una por fármaco, no una por par.
 */
export interface ContextoCockpit {
  paciente: DatosPaciente;
  prescripciones: PrescripcionActiva[];
  condicionesCargadasIds: string[];
  condicionesCargadasCodigos: string[];
  alergias: AlergiaPaciente[];
  gruposAlergenicos: Map<string, GrupoAlergenico>;
  /** Indexado por principioActivoId, solo de los PA que el paciente toma. */
  ajustesRenales: Map<string, AjusteRenalDeFarmaco[]>;
  /** Alertas del catálogo para (PA del paciente × condiciones del paciente). */
  alertas: AlertaDeCatalogo[];
  curaciones: Map<string, Curacion>;
  umbralAdultoMayor: number;
}

export interface RepositorioCockpit {
  /**
   * Trae el contexto completo de un paciente. `medicoId` es obligatorio y va en
   * el `where`, no se deduce de la cadena de relaciones (motor §2).
   *
   * Devuelve `null` si el paciente no existe O no es de ese médico — las dos
   * cosas son el mismo resultado a propósito: distinguirlas filtraría
   * información sobre pacientes ajenos.
   */
  cargarContexto(medicoId: string, pacienteId: string): Promise<ContextoCockpit | null>;
}
