import { api } from './cliente';
import type {
  Cockpit,
  Condicion,
  CondicionesYAlergias,
  Configuracion,
  EstadoSuscripcion,
  GrupoAlergenico,
  Inicio,
  Medico,
  Paciente,
  PacienteHepatico,
  ResultadoChildPugh,
  Sesion,
} from './tipos';

/**
 * Un nombre por endpoint. La ruta y su tipo, en un solo lugar.
 *
 * Antes cada pantalla escribía `api.get<AlgunTipo>('/una/ruta')` a mano, y eso
 * traía tres problemas que no se ven hasta que muerden:
 *
 *   1. La misma ruta repetida. `/pacientes/:id/cockpit` estaba escrita en cinco
 *      pantallas; cambiarla era buscar y reemplazar con la esperanza de no
 *      saltearse ninguna.
 *   2. El mismo tipo declarado dos veces, y ya divergido. `GET /auth/yo` tenía
 *      `id` en una pantalla y no en la otra; `GET /perfil/suscripcion`,
 *      `productId` en una y no en la otra. Ninguna estaba mal: estaban
 *      incompletas, que es peor, porque el compilador no avisa de un campo que
 *      nadie declaró.
 *   3. Nada que compare contra el backend. Con la forma escrita en un solo
 *      lugar, `API.md` y este archivo se leen en paralelo.
 *
 * El orden y los títulos siguen los de `apps/backend/API.md` a propósito: son
 * el mismo contrato visto desde los dos lados.
 *
 * Acá no hay hooks. Las funciones son `queryFn`/`mutationFn` a secas, para que
 * cada pantalla elija su `queryKey`, su `staleTime` y qué invalidar — que es
 * decisión de la pantalla y no del transporte.
 */

// --- 4. autenticación --------------------------------------------------------

export const yo = () => api.get<Medico>('/auth/yo');

export const sesiones = () => api.get<Sesion[]>('/auth/sesiones');

export const cerrarSesion = (id: string) => api.delete<void>(`/auth/sesiones/${id}`);

export const registrarse = (datos: {
  email: string;
  nombreUsuario: string;
  password: string;
  nombre: string;
  apellido: string;
  dispositivoInfo?: string;
}) => api.post<{ accessToken: string; refreshToken: string }>('/auth/registro', datos);

export const cambiarPassword = (datos: { actual: string; nueva: string }) =>
  api.post<void>('/auth/password', datos);

export const aceptarDisclaimer = (version: string) =>
  api.post<void>('/auth/disclaimer', { version });

// --- 5. pacientes y grupos ---------------------------------------------------

export const inicio = () => api.get<Inicio>('/inicio');

export const paciente = (id: string) => api.get<Paciente>(`/pacientes/${id}`);

/** El mismo GET, leído por la pantalla hepática: son campos del mismo recurso. */
export const pacienteHepatico = (id: string) =>
  api.get<PacienteHepatico>(`/pacientes/${id}`);

export const crearPaciente = (datos: Record<string, unknown>) =>
  api.post<{ id: string }>('/pacientes', datos);

export const actualizarPaciente = (id: string, datos: Record<string, unknown>) =>
  api.patch<{ id: string }>(`/pacientes/${id}`, datos);

export const borrarPaciente = (id: string) => api.delete<void>(`/pacientes/${id}`);

export const crearGrupo = (nombre: string) => api.post<{ id: string }>('/grupos', { nombre });

export const renombrarGrupo = (id: string, nombre: string) =>
  api.patch<{ id: string }>(`/grupos/${id}`, { nombre });

export const borrarGrupo = (id: string) => api.delete<void>(`/grupos/${id}`);

// --- 6. cockpit e historial --------------------------------------------------

export const cockpit = (pacienteId: string) => api.get<Cockpit>(`/pacientes/${pacienteId}/cockpit`);

export const historial = <T>(
  pacienteId: string,
  filtros: { antesDe?: string; grupo?: string; periodo?: string } = {},
) => {
  const q = new URLSearchParams();
  if (filtros.antesDe) q.set('antesDe', filtros.antesDe);
  if (filtros.grupo) q.set('grupo', filtros.grupo);
  // 'todo' es el valor por defecto del backend: mandarlo sería ruido en la URL.
  if (filtros.periodo && filtros.periodo !== 'todo') q.set('periodo', filtros.periodo);
  const cola = q.toString();
  return api.get<T>(`/pacientes/${pacienteId}/historial${cola ? `?${cola}` : ''}`);
};

// --- 7. tratamiento ----------------------------------------------------------

export const agregarPrescripcion = (pacienteId: string, datos: Record<string, unknown>) =>
  api.post<{ id: string }>(`/pacientes/${pacienteId}/prescripciones`, datos);

export const actualizarPrescripcion = (id: string, datos: Record<string, unknown>) =>
  api.patch<{ id: string }>(`/prescripciones/${id}`, datos);

export const borrarPrescripcion = (id: string) => api.delete<void>(`/prescripciones/${id}`);

export const agregarCondicion = (pacienteId: string, datos: Record<string, unknown>) =>
  api.post<{ id: string }>(`/pacientes/${pacienteId}/condiciones`, datos);

export const quitarCondicion = (pacienteId: string, condicionId: string) =>
  api.delete<void>(`/pacientes/${pacienteId}/condiciones/${condicionId}`);

export const agregarAlergia = (pacienteId: string, datos: Record<string, unknown>) =>
  api.post<{ id: string }>(`/pacientes/${pacienteId}/alergias`, datos);

export const quitarAlergia = (alergiaId: string) => api.delete<void>(`/alergias/${alergiaId}`);

export const guardarDatosRenales = (pacienteId: string, datos: Record<string, unknown>) =>
  api.patch<{ clcrMlMin: number | null }>(`/pacientes/${pacienteId}/datos-renales`, datos);

export const guardarDatosHepaticos = (pacienteId: string, datos: Record<string, unknown>) =>
  api.patch<ResultadoChildPugh>(`/pacientes/${pacienteId}/datos-hepaticos`, datos);

// --- 8. alternativas y carga por foto ----------------------------------------

export const alternativasDe = <T>(pacienteId: string, prescripcionId: string) =>
  api.get<T>(`/pacientes/${pacienteId}/prescripciones/${prescripcionId}/alternativas`);

export const alternativas = <T>(pacienteId: string) =>
  api.get<T>(`/pacientes/${pacienteId}/alternativas`);

export const aceptarAlternativa = (pacienteId: string, datos: Record<string, unknown>) =>
  api.post<{ id: string }>(`/pacientes/${pacienteId}/alternativas-aceptadas`, datos);

export const alternativasAceptadas = <T>(pacienteId: string) =>
  api.get<T>(`/pacientes/${pacienteId}/alternativas-aceptadas`);

/**
 * La foto del tratamiento.
 *
 * El archivo NO se persiste: se lee, se devuelven las líneas para revisar y se
 * descarta. Ninguna se convierte en prescripción sin confirmación humana.
 */
export const subirFoto = <T>(pacienteId: string, imagenBase64: string) =>
  api.post<T>(`/pacientes/${pacienteId}/foto`, { imagenBase64 });

export const matchearLineas = <T>(pacienteId: string, textos: string[]) =>
  api.post<T>(`/pacientes/${pacienteId}/lineas/matchear`, { textos });

// --- 9. catálogo -------------------------------------------------------------

export const condiciones = () => api.get<Condicion[]>('/catalogo/condiciones');

export const gruposAlergenicos = () => api.get<GrupoAlergenico[]>('/catalogo/grupos-alergenicos');

export const buscarProductos = <T>(q: string) =>
  api.get<T>(`/catalogo/productos?q=${encodeURIComponent(q)}`);

export const buscarPrincipiosActivos = <T>(q: string) =>
  api.get<T>(`/catalogo/principios-activos?q=${encodeURIComponent(q)}`);

export const similares = <T>(principioActivoId: string) =>
  api.get<T>(`/catalogo/principios-activos/${principioActivoId}/similares`);

export const conteoProductos = () => api.get<{ total: number }>('/catalogo/productos/conteo');

// El índice y la ficha viven en `catalogo.ts` y `ficha.ts`: no son una llamada
// suelta sino una caché con su propia política, y mudarlas acá las dejaría a
// mitad de camino entre las dos cosas.

// --- 10. herramientas sueltas ------------------------------------------------

export const herramientaInteracciones = <T>(principioActivoIds: string[]) =>
  api.post<T>('/herramientas/interacciones', { principioActivoIds });

export const herramientaCondicionAlergia = <T>(datos: Record<string, unknown>) =>
  api.post<T>('/herramientas/condicion-alergia', datos);

export const herramientaAjusteRenal = <T>(datos: Record<string, unknown>) =>
  api.post<T>('/herramientas/ajuste-renal', datos);

export const herramientaAjusteHepatico = <T>(datos: Record<string, unknown>) =>
  api.post<T>('/herramientas/ajuste-hepatico', datos);

// --- 11. perfil y suscripción ------------------------------------------------

/**
 * El plan, sin el hook.
 *
 * `usePlan` en `plan.ts` es el camino normal; esto existe para el login, que
 * necesita el dato una sola vez y fuera de React para decidir si manda al
 * paywall.
 */
export const plan = () => api.get<{ vigente: boolean }>('/perfil/plan');

export const configuracion = () => api.get<Configuracion>('/perfil/configuracion');

export const guardarConfiguracion = (datos: Partial<Configuracion>) =>
  api.patch<Configuracion>('/perfil/configuracion', datos);

/** Los tres campos del `DatosMedicoDto` del backend, todos opcionales. */
export const guardarDatosMedico = (datos: {
  nombre?: string;
  apellido?: string;
  email?: string;
}) => api.patch<Medico>('/perfil/datos', datos);

export const estadoSuscripcion = () => api.get<EstadoSuscripcion>('/perfil/suscripcion');

export const eliminarCuenta = (password: string) =>
  api.post<void>('/perfil/eliminar-cuenta', { password });

export const condicionesYAlergias = (pacienteId: string) =>
  api.get<CondicionesYAlergias>(`/perfil/pacientes/${pacienteId}/condiciones-alergias`);
