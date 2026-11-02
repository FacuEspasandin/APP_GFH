import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Linking, Text, View } from 'react-native';

import * as API from '@/api/endpoints';
import { useAviso } from '@/ui/aviso';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Boton, Eyebrow, Pantalla } from '@/ui/kit';
import { GrupoOpciones, Opcion } from '@/ui/lista-opciones';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { EMAIL_CONTACTO, VERSION_CONSENTIMIENTO } from '@gfh/shared-types';

/**
 * Privacidad y datos.
 *
 * Es donde se retira lo que se dio. Apple pide que el permiso para mandar datos
 * a un tercero pueda revocarse, y que sea tan fácil como darlo: dos toques
 * desde Perfil. El estado de cada permiso se ve sin abrir nada.
 *
 * Retirar no borra lo ya procesado: las conversaciones con Vera que existen
 * siguen en la cuenta hasta que se elimine. La pantalla lo dice.
 */
export default function Privacidad() {
  const col = useColores();
  const router = useRouter();

  const { data: perfil } = useQuery({ queryKey: ['perfil'], queryFn: API.yo });

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Privacidad y Datos" />
      <Pantalla>
        <Eyebrow>Permisos para enviar datos a terceros</Eyebrow>
        <Text className="font-sans mb-3 text-meta leading-5 text-ink-suave">
          Vera y la carga por foto usan servicios externos. Los pedimos la primera vez que los usás
          y podés retirarlos acá cuando quieras.
        </Text>

        <TarjetaPermiso
          tipo="VERA"
          titulo="Vera · inteligencia artificial"
          destino="Tus preguntas se envían a Anthropic."
          version={perfil?.consentimientoVeraVersion ?? null}
          fecha={perfil?.consentimientoVeraAt ?? null}
          vigenteVersion={VERSION_CONSENTIMIENTO.VERA}
          cargado={Boolean(perfil)}
        />
        <TarjetaPermiso
          tipo="FOTO"
          titulo="Carga de tratamiento por foto"
          destino="La imagen se envía a Google Cloud Vision y se descarta."
          version={perfil?.consentimientoFotoVersion ?? null}
          fecha={perfil?.consentimientoFotoAt ?? null}
          vigenteVersion={VERSION_CONSENTIMIENTO.FOTO}
          cargado={Boolean(perfil)}
        />

        <Eyebrow>Documentos</Eyebrow>
        <GrupoOpciones>
          <Opcion
            primera
            icono="candado"
            titulo="Política de privacidad"
            onPress={() => router.push('/legal?clave=privacidad' as never)}
          />
          <Opcion
            icono="documento"
            titulo="Términos y condiciones"
            onPress={() => router.push('/legal?clave=terminos' as never)}
          />
          <Opcion
            icono="info"
            titulo="Metodología y fuentes"
            onPress={() => router.push('/legal?clave=metodologia' as never)}
          />
        </GrupoOpciones>

        <Eyebrow>Tus derechos</Eyebrow>
        <Superficie elevacion="plana" className="mb-4 border p-4" style={{ borderColor: col.line }}>
          <Text className="font-sans text-meta leading-5 text-ink">
            Podés pedir una copia de tus datos, corregirlos o que los borremos. Escribinos y te
            respondemos dentro del plazo legal.
          </Text>
        </Superficie>
        <View className="mb-4">
          <Boton
            variante="secundario"
            icono="correo"
            onPress={() => void Linking.openURL(`mailto:${EMAIL_CONTACTO}?subject=Mis%20datos%20en%20GFH`)}
          >
            Escribir sobre mis datos
          </Boton>
        </View>

        <Eyebrow>Cuenta</Eyebrow>
        <GrupoOpciones>
          <Opcion
            primera
            destructiva
            icono="basura"
            titulo="Eliminar mi cuenta y mis datos"
            onPress={() => router.push('/perfil/eliminar-cuenta')}
          />
        </GrupoOpciones>
      </Pantalla>
    </View>
  );
}

function TarjetaPermiso({
  tipo,
  titulo,
  destino,
  version,
  fecha,
  vigenteVersion,
  cargado,
}: {
  tipo: 'VERA' | 'FOTO';
  titulo: string;
  destino: string;
  version: string | null;
  fecha: string | null;
  vigenteVersion: string;
  cargado: boolean;
}) {
  const col = useColores();
  const qc = useQueryClient();
  const { avisar } = useAviso();

  // Un permiso con un texto que ya cambió no cuenta: el backend lo trata como no dado.
  const dado = version === vigenteVersion;

  const retirar = useMutation({
    mutationFn: () => API.retirarConsentimiento(tipo),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['perfil'] });
      avisar('Permiso retirado. Dejamos de enviar datos.', 'exito');
    },
    onError: (e) => avisar(e instanceof Error ? e.message : 'No se pudo retirar el permiso.', 'error'),
  });

  const confirmar = () =>
    Alert.alert(
      'Retirar el permiso',
      tipo === 'VERA'
        ? 'Vera deja de funcionar hasta que lo vuelvas a dar. Tus conversaciones anteriores siguen en tu cuenta.'
        : 'No vas a poder cargar tratamientos por foto hasta que lo vuelvas a dar. Pegar la lista sigue funcionando.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Retirar', style: 'destructive', onPress: () => retirar.mutate() },
      ],
    );

  const cuando = fecha
    ? new Date(fecha).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <Superficie elevacion="plana" className="mb-3 border p-4" style={{ borderColor: col.line }}>
      <View className="flex-row items-center">
        <View
          className="mr-2 rounded-full"
          style={{ width: 9, height: 9, backgroundColor: dado ? col.exito : col.tenue }}
        />
        <Text className="flex-1 text-body font-fuerte text-ink">{titulo}</Text>
        <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
          {!cargado ? '…' : dado ? 'Permitido' : 'No permitido'}
        </Text>
      </View>

      <Text className="font-sans mt-1.5 text-meta leading-5 text-ink-suave">{destino}</Text>
      {dado && cuando ? (
        <Text className="font-sans mt-1 text-meta text-ink-suave">Lo diste el {cuando}.</Text>
      ) : null}
      {!dado && cargado ? (
        <Text className="font-sans mt-1 text-meta text-ink-suave">
          Se te pide la próxima vez que lo uses.
        </Text>
      ) : null}

      {dado ? (
        <View className="mt-3">
          <Boton variante="secundario" tamano="chico" onPress={confirmar} cargando={retirar.isPending}>
            Retirar permiso
          </Boton>
        </View>
      ) : null}
    </Superficie>
  );
}
