import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { api, cerrarSesionLocal } from '@/api/cliente';
import * as API from '@/api/endpoints';
import { ES_DEMO_WEB } from '@/ui/dispositivo';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { Boton, Eyebrow, Pantalla } from '@/ui/kit';
import { GrupoOpciones, Opcion } from '@/ui/lista-opciones';
import { Superficie, SuperficieTocable } from '@/ui/superficie';
import { useColores, useTema, type Tema } from '@/ui/tema';

import type { EstadoSuscripcion, Medico as Perfil } from '@/api/tipos';
import { tiendaDeLaCompra } from '@/ui/tienda';
import { TIPO } from '@/ui/tokens';

const TEXTO_ESTADO: Record<EstadoSuscripcion['estado'], string> = {
  SIN_SUSCRIPCION: 'Plan gratis',
  ACTIVA: 'Suscripción activa',
  GRACIA: 'Problema de cobro',
  VENCIDA: 'Suscripción vencida',
  CANCELADA: 'Cancelada, vigente hasta el fin del período',
};

const ETIQUETA_TEMA: Record<Tema, string> = {
  CLARO: 'Claro',
  OSCURO: 'Oscuro',
  SISTEMA: 'Sistema',
};

/**
 * Perfil (6.1).
 *
 * Los accesos se agrupan en tarjetas con divisiones internas y cada uno muestra
 * su valor a la derecha: varias de las subpantallas existían sólo para leer un
 * dato, y verlo acá evita entrar.
 *
 * La suscripción sube a tarjeta propia. Es lo único de esta pantalla que cambia
 * lo que la app deja hacer, y estaba escondida detrás de una fila que decía
 * "Suscripción" y nada más.
 */
export default function PerfilPantalla() {
  const col = useColores();
  const router = useRouter();
  const { tema, configuracion } = useTema();

  const { data } = useQuery({ queryKey: ['perfil'], queryFn: API.yo });
  const suscripcion = useQuery({
    queryKey: ['suscripcion'],
    queryFn: API.estadoSuscripcion,
  });
  const sesiones = useQuery({
    queryKey: ['sesiones'],
    queryFn: API.sesiones,
  });

  const nombreCompleto = data ? `${data.nombre} ${data.apellido}` : '—';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp ocultarVolver />
      <Pantalla>
      <Identidad
        nombre={nombreCompleto}
        email={data?.email ?? ''}
        onEditar={() => router.push('/perfil/cuenta')}
      />

      <TarjetaPlan
        estado={suscripcion.data}
        onPress={() => router.push('/perfil/suscripcion')}
      />

      <Eyebrow>Cuenta</Eyebrow>
      <GrupoOpciones>
        <Opcion
          primera
          icono="usuario"
          titulo="Datos personales"
          onPress={() => router.push('/perfil/cuenta')}
        />
        {!ES_DEMO_WEB ? (
          <Opcion icono="candado" titulo="Contraseña" onPress={() => router.push('/perfil/password')} />
        ) : null}
        <Opcion
          icono="dispositivo"
          titulo="Sesiones activas"
          valor={textoSesiones(sesiones.data?.length)}
          onPress={() => router.push('/perfil/sesiones')}
        />
        {/* Dónde se retiran los permisos de Vera y de fotos, y se pide una copia
            de los datos. Va en Cuenta porque es de la cuenta, no de la app. */}
        <Opcion
          icono="usuario"
          titulo="Privacidad y datos"
          onPress={() => router.push('/perfil/privacidad' as never)}
        />
      </GrupoOpciones>

      <Eyebrow>Preferencias</Eyebrow>
      <GrupoOpciones>
        <Opcion
          primera
          icono="sol"
          titulo="Tema"
          valor={ETIQUETA_TEMA[tema]}
          onPress={() => router.push('/perfil/tema')}
        />
        {/* Es del TELÉFONO y no de la cuenta: por eso no muestra valor traído
            del servidor como las otras dos. Ver `api/bloqueo.ts`. */}
        {!ES_DEMO_WEB ? (
          <Opcion
            icono="candado"
            titulo="Bloqueo con huella"
            onPress={() => router.push('/perfil/bloqueo')}
          />
        ) : null}
        {!ES_DEMO_WEB ? (
          <Opcion
            icono="campana"
            titulo="Notificaciones"
            onPress={() => router.push('/perfil/notificaciones')}
          />
        ) : null}
        {/* Estaba enterrado dentro de "Tema y notificaciones" pese a decidir
            qué alertas se disparan. Ahora se lee sin entrar. */}
        <Opcion
          icono="reloj"
          titulo="Umbral de adulto mayor"
          valor={configuracion ? `${configuracion.umbralAdultoMayor} años` : null}
          onPress={() => router.push('/perfil/umbral')}
        />
      </GrupoOpciones>

      <Eyebrow>Información</Eyebrow>
      <GrupoOpciones>
        <Opcion
          primera
          icono="ayuda"
          titulo="Ayuda y soporte"
          onPress={() => router.push('/perfil/ayuda')}
        />
        <Opcion
          icono="documento"
          titulo="Términos y privacidad"
          onPress={() => router.push('/perfil/legales')}
        />
        <Opcion
          icono="info"
          titulo="Metodología y fuentes"
          onPress={() => router.push('/legal?clave=metodologia' as never)}
        />
        <Opcion icono="info" titulo="Acerca de GFH" onPress={() => router.push('/perfil/acerca')} />
      </GrupoOpciones>

      <View className="mt-4">
        <Boton
          variante="secundario"
          icono="salir"
          onPress={async () => {
            await cerrarSesionLocal();
            router.replace('/login');
          }}
        >
          Cerrar sesión
        </Boton>
      </View>

      {!ES_DEMO_WEB ? (
        <Pressable
          onPress={() => router.push('/perfil/eliminar-cuenta')}
          accessibilityRole="button"
          className="mt-1.5 min-h-11 items-center justify-center"
        >
          <Text className="text-meta font-medio" style={{ color: col.peligro }}>
            Eliminar cuenta
          </Text>
        </Pressable>
      ) : null}

      <Text className="mb-2 mt-4 font-mono text-center text-eyebrow text-tenue">GFH Móvil 0.0.1</Text>
      </Pantalla>
    </>
  );
}

/** `undefined` mientras carga: mejor sin valor que un "0 dispositivos" falso. */
function textoSesiones(n?: number): string | null {
  if (n === undefined) return null;
  return n === 1 ? '1 dispositivo' : `${n} dispositivos`;
}

function Identidad({
  nombre,
  email,
  onEditar,
}: {
  nombre: string;
  email: string;
  onEditar: () => void;
}) {
  const col = useColores();

  return (
    <Superficie elevacion="media" className="mb-3.5 items-center px-5 py-6">

      <View
        className="mb-3 items-center justify-center rounded-full"
        style={{ width: 80, height: 80, backgroundColor: col.primary }}
      >
        <Text className="font-fuerte text-on-primary" style={{ fontSize: TIPO.cifra }}>
          {iniciales(nombre)}
        </Text>
      </View>

      <Text className="text-fila font-fuerte text-ink" numberOfLines={1}>
        {nombre}
      </Text>
      <Text className="mt-0.5 font-sans text-meta text-ink-suave" numberOfLines={1}>
        {email}
      </Text>

      {/* Acá iba el rol ("MEDICO") y después una pastilla con el plan. El plan
          vive en `TarjetaPlan`, justo debajo: decirlo dos veces era ruido. */}
      <View className="mt-4">
        <Boton tamano="chico" variante="secundario" onPress={onEditar}>
          Editar perfil
        </Boton>
      </View>
    </Superficie>
  );
}

function TarjetaPlan({
  estado,
  onPress,
}: {
  estado?: EstadoSuscripcion;
  onPress: () => void;
}) {
  const col = useColores();
  if (!estado) return null;

  // El estado de una suscripción no es gravedad clínica: usa los colores de la
  // interfaz, no los de la escala de severidad.
  const color = estado.vigente ? col.exito : estado.estado === 'GRACIA' ? col.aviso : col.tenue;

  const fecha = estado.periodoActualFin
    ? new Date(estado.periodoActualFin).toLocaleDateString('es-UY', {
        day: 'numeric',
        month: 'long',
      })
    : null;

  const detalle = [
    fecha ? `${estado.vigente ? 'Se renueva el' : 'Venció el'} ${fecha}` : null,
    tiendaDeLaCompra(estado.store),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SuperficieTocable elevacion="plana" onPress={onPress} contenedor="mb-4">
      <View className="px-3.5 py-3.5">
        <View className="flex-row items-center">
          <View
            className="mr-2 rounded-full"
            style={{ width: 9, height: 9, backgroundColor: color }}
          />
          <Text className="flex-1 text-fila font-fuerte text-ink">
            {TEXTO_ESTADO[estado.estado]}
          </Text>
          <Icono nombre="chevron" tamano={15} color={col.tenue} />
        </View>
        {detalle ? (
          <Text className="font-sans mt-1 text-meta text-ink-suave">{detalle}</Text>
        ) : null}
        {!estado.vigente ? (
          <Text className="font-sans mt-1 text-meta text-ink-suave">
            El plan gratis no incluye pacientes propios.
          </Text>
        ) : null}
      </View>

      <View className="border-t border-line px-3.5 py-2.5" style={{ backgroundColor: col.paper }}>
        <Text className="font-sans text-meta leading-4 text-ink-suave">
          Cancelar o cambiar de plan se hace desde la tienda, no desde acá.
        </Text>
      </View>
    </SuperficieTocable>
  );
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}
