import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';

import * as API from '@/api/endpoints';
import { ErrorApi } from '@/api/cliente';
import {
  CONSENTIMIENTO_FOTO,
  CONSENTIMIENTO_VERA,
  type TextoConsentimiento,
} from '@gfh/shared-types';
import { CasillaAceptacion } from './casilla';
import { hapticaExito } from './haptica';
import { HojaInferior } from './hoja-inferior';
import { Boton } from './kit';
import { useColores } from './tema';

/**
 * El permiso de la primera vez para Vera y para la carga por foto.
 *
 * Los dos mandan algo del médico a un tercero —la pregunta a Anthropic, la
 * imagen a Google Cloud Vision— y Apple exige decirlo y pedir permiso expreso
 * antes (guideline 5.1.2(i)). Se pide UNA vez: queda guardado en la cuenta, con
 * la versión del texto, y no vuelve a aparecer salvo que el texto cambie o el
 * médico lo retire en Perfil → Privacidad.
 *
 * Uso:
 *
 *   const permiso = useConsentimiento('VERA');
 *   ...
 *   permiso.pedir(() => enviar.mutate(pregunta));   // corre ya, o tras aceptar
 *   ...
 *   {permiso.hoja}
 *
 * El backend es el que decide (`@RequiereConsentimiento`): esto es sólo la forma
 * de pedirlo bien. Si el permiso se retiró desde otro teléfono y esta app aún
 * lo cree vigente, el 403 `CONSENTIMIENTO_REQUERIDO` vuelve acá —ver
 * `alRechazar`— y la próxima vez se pide de nuevo.
 */

const TEXTOS: Record<'VERA' | 'FOTO', TextoConsentimiento> = {
  VERA: CONSENTIMIENTO_VERA,
  FOTO: CONSENTIMIENTO_FOTO,
};

export function useConsentimiento(tipo: 'VERA' | 'FOTO'): {
  /** `true` si ya se aceptó la versión vigente. `false` también mientras carga. */
  vigente: boolean;
  /** Corre `alAceptar` ya, si hay permiso; si no, abre el pedido y lo corre al aceptar. */
  pedir: (alAceptar: () => void) => void;
  /** Para pasarle un error del backend: si es el del permiso, se vuelve a pedir. */
  alRechazar: (error: unknown) => boolean;
  /** El pedido. Va una vez, en cualquier lugar del árbol de la pantalla. */
  hoja: ReactElement;
} {
  const texto = TEXTOS[tipo];
  const qc = useQueryClient();
  const { data: perfil } = useQuery({ queryKey: ['perfil'], queryFn: API.yo });

  const aceptadaVersion =
    tipo === 'VERA' ? perfil?.consentimientoVeraVersion : perfil?.consentimientoFotoVersion;
  const vigente = aceptadaVersion === texto.version;

  const [abierto, setAbierto] = useState(false);
  const [marcada, setMarcada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* En una ref y no en estado: es una función, y guardar una función en
     `useState` la ejecuta como inicializador. */
  const pendiente = useRef<(() => void) | null>(null);

  const aceptar = useMutation({
    mutationFn: () => API.aceptarConsentimiento(tipo, texto.version),
    onSuccess: async () => {
      hapticaExito();
      await qc.invalidateQueries({ queryKey: ['perfil'] });
      const seguir = pendiente.current;
      pendiente.current = null;
      setAbierto(false);
      seguir?.();
    },
    onError: (e) =>
      setError(
        e instanceof ErrorApi && e.esSinConexion
          ? 'Sin conexión. Probá de nuevo cuando vuelva la señal.'
          : e instanceof Error
            ? e.message
            : 'No se pudo guardar el permiso.',
      ),
  });

  const pedir = useCallback(
    (alAceptar: () => void) => {
      if (vigente) {
        alAceptar();
        return;
      }
      pendiente.current = alAceptar;
      setMarcada(false);
      setError(null);
      setAbierto(true);
    },
    [vigente],
  );

  const alRechazar = useCallback(
    (e: unknown): boolean => {
      if (e instanceof ErrorApi && e.codigo === 'CONSENTIMIENTO_REQUERIDO') {
        void qc.invalidateQueries({ queryKey: ['perfil'] });
        return true;
      }
      return false;
    },
    [qc],
  );

  const cerrar = () => {
    pendiente.current = null;
    setAbierto(false);
  };

  const hoja = (
    <HojaInferior visible={abierto} onCerrar={cerrar}>
      <PedidoDePermiso
        texto={texto}
        marcada={marcada}
        onAlternar={() => setMarcada((m) => !m)}
        error={error}
        cargando={aceptar.isPending}
        onAceptar={() => {
          setError(null);
          aceptar.mutate();
        }}
        onCancelar={cerrar}
      />
    </HojaInferior>
  );

  return { vigente, pedir, alRechazar, hoja };
}

function PedidoDePermiso({
  texto,
  marcada,
  onAlternar,
  error,
  cargando,
  onAceptar,
  onCancelar,
}: {
  texto: TextoConsentimiento;
  marcada: boolean;
  onAlternar: () => void;
  error: string | null;
  cargando: boolean;
  onAceptar: () => void;
  onCancelar: () => void;
}) {
  const col = useColores();
  const router = useRouter();

  return (
    <View>
      <Text className="mb-3 text-fila font-fuerte text-ink">{texto.titulo}</Text>

      {texto.puntos.map((p) => (
        <View key={p} className="mb-2 flex-row gap-2">
          <Text className="font-sans text-meta leading-5 text-ink-suave">•</Text>
          <Text className="font-sans flex-1 text-meta leading-5 text-ink">{p}</Text>
        </View>
      ))}

      <View className="mb-4 mt-1">
        <Boton
          tamano="chico"
          variante="secundario"
          icono="documento"
          onPress={() => {
            onCancelar();
            router.push('/legal?clave=privacidad' as never);
          }}
        >
          Leer la política de privacidad
        </Boton>
      </View>

      <View className="mb-4">
        <CasillaAceptacion marcada={marcada} onAlternar={onAlternar}>
          <Text className="font-sans text-body leading-5 text-ink">{texto.aceptacion}</Text>
        </CasillaAceptacion>
      </View>

      {error ? (
        <Text className="font-sans mb-3 text-meta" style={{ color: col.peligro }}>
          {error}
        </Text>
      ) : null}

      <Boton onPress={onAceptar} deshabilitado={!marcada} cargando={cargando}>
        Aceptar y continuar
      </Boton>
      <View className="mt-2">
        <Boton variante="secundario" onPress={onCancelar}>
          Ahora no
        </Boton>
      </View>
      <Text className="font-sans mt-3 text-center text-eyebrow leading-4 text-ink-suave">
        {texto.siNoAcepta}
      </Text>
    </View>
  );
}
