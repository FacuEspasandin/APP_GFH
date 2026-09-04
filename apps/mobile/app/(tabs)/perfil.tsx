import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { api, cerrarSesionLocal } from '@/api/cliente';
import * as API from '@/api/endpoints';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { Eyebrow, Pantalla } from '@/ui/kit';
import { GrupoOpciones, Opcion } from '@/ui/lista-opciones';
import { Superficie, SuperficieTocable } from '@/ui/superficie';
import { useColores, useTema, type Tema } from '@/ui/tema';
import { COLOR_SEVERIDAD } from '@gfh/shared-types';

import type { EstadoSuscripcion, Medico as Perfil } from '@/api/tipos';

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
        suscripcion={suscripcion.data}
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
        <Opcion icono="candado" titulo="Contraseña" onPress={() => router.push('/perfil/password')} />
        <Opcion
          icono="dispositivo"
          titulo="Sesiones activas"
          valor={textoSesiones(sesiones.data?.length)}
          onPress={() => router.push('/perfil/sesiones')}
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
        <Opcion
          icono="campana"
          titulo="Notificaciones"
          valor={configuracion ? (configuracion.notificacionesPush ? 'Activadas' : 'Desactivadas') : null}
          onPress={() => router.push('/perfil/notificaciones')}
        />
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
        <Opcion icono="info" titulo="Acerca de GFH" onPress={() => router.push('/perfil/acerca')} />
      </GrupoOpciones>

      <Pressable
        onPress={async () => {
          await cerrarSesionLocal();
          router.replace('/login');
        }}
        accessibilityRole="button"
        className="mt-4 flex-row items-center justify-center gap-2 rounded-full border px-6 py-3.5"
        style={{ borderColor: '#6F7A6F' }}
      >
        <Icono nombre="salir" tamano={18} color="#191C20" />
        <Text className="text-body font-medio text-ink">Cerrar sesión</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/perfil/eliminar-cuenta')}
        accessibilityRole="button"
        className="mt-3.5 items-center py-1"
      >
        <Text className="text-meta font-medio" style={{ color: '#991B1B' }}>
          Eliminar cuenta
        </Text>
      </Pressable>

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
  suscripcion,
  onEditar,
}: {
  nombre: string;
  email: string;
  suscripcion?: EstadoSuscripcion;
  onEditar: () => void;
}) {
  const col = useColores();

  return (
    <Superficie elevacion="media" className="mb-3.5 items-center px-5 py-6">
      <View className="absolute bottom-0 left-0 top-0" style={{ width: 4, backgroundColor: col.tenue }} />

      <View
        className="mb-3 items-center justify-center rounded-full"
        style={{ width: 80, height: 80, backgroundColor: '#005228' }}
      >
        <Text className="font-fuerte text-white" style={{ fontSize: 26 }}>
          {iniciales(nombre)}
        </Text>
      </View>

      <Text className="text-fila font-fuerte text-ink" numberOfLines={1}>
        {nombre}
      </Text>
      <Text className="mt-0.5 font-sans text-meta text-ink-suave" numberOfLines={1}>
        {email}
      </Text>

      {/* Acá iba el rol ("MEDICO"), que es vocabulario del sistema y además el
          único rol con pantallas en v1. El lugar más visible de la pantalla lo
          ocupa ahora el dato que cambia lo que la app deja hacer. */}
      {suscripcion ? (
        <View
          className="mt-2.5 flex-row items-center gap-1.5 rounded-full px-3 py-1"
          style={{ backgroundColor: col.paper, borderWidth: 1, borderColor: col.line }}
        >
          <View
            className="rounded-full"
            style={{
              width: 8,
              height: 8,
              backgroundColor: suscripcion.vigente ? '#22C55E' : col.tenue,
            }}
          />
          <Text className="font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
            {suscripcion.vigente ? 'Suscripción activa' : 'Plan gratis'}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={onEditar}
        accessibilityRole="button"
        className="mt-4 rounded-full border px-5 py-2"
        style={{ borderColor: '#6F7A6F' }}
      >
        <Text className="text-meta font-medio" style={{ color: '#005228' }}>
          Editar perfil
        </Text>
      </Pressable>
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

  const color = estado.vigente
    ? COLOR_SEVERIDAD.ok
    : estado.estado === 'GRACIA'
      ? COLOR_SEVERIDAD.media
      : COLOR_SEVERIDAD.neutro;

  const fecha = estado.periodoActualFin
    ? new Date(estado.periodoActualFin).toLocaleDateString('es-UY', {
        day: 'numeric',
        month: 'long',
      })
    : null;

  const detalle = [
    fecha ? `${estado.vigente ? 'Se renueva el' : 'Venció el'} ${fecha}` : null,
    estado.store ? (estado.store === 'APP_STORE' ? 'App Store' : 'Google Play') : null,
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
            El plan gratis sigue a un paciente.
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
