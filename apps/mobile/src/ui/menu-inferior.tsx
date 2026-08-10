import { useRouter, useSegments } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hapticaSeleccion } from '@/ui/haptica';
import { HojaInferior, OpcionHoja } from '@/ui/hoja-inferior';
import { Icono, type NombreIcono } from '@/ui/iconos';
import { coloresChrome, useTema } from '@/ui/tema';

/**
 * El menú principal: cuatro secciones y el botón de herramientas al centro.
 *
 * No es la barra de `Tabs`: esa sólo existe mientras la pantalla activa está
 * dentro del grupo `(tabs)`, y se pierde apenas se abre un paciente o un
 * detalle — que es donde el médico pasa la mayor parte del tiempo. Acá se
 * dibuja en el layout raíz, por fuera del `Stack`, así que está siempre.
 *
 * El botón central NO se marca como activo. Herramientas no es un lugar donde
 * uno está, es un menú que se abre: resaltarlo mentiría sobre dónde estás
 * parado.
 */

interface Destino {
  clave: string;
  ruta: string;
  titulo: string;
  icono: NombreIcono;
}

const IZQUIERDA: Destino[] = [
  { clave: 'index', ruta: '/(tabs)', titulo: 'Pacientes', icono: 'pacientes' },
  { clave: 'grupos', ruta: '/(tabs)/grupos', titulo: 'Grupos', icono: 'grupos' },
];

const DERECHA: Destino[] = [
  { clave: 'buscador', ruta: '/(tabs)/buscador', titulo: 'Buscador', icono: 'buscar' },
  { clave: 'perfil', ruta: '/(tabs)/perfil', titulo: 'Perfil', icono: 'usuario' },
];

const HERRAMIENTAS: { ruta: string; titulo: string; detalle: string; icono: NombreIcono }[] = [
  {
    ruta: '/herramientas/interacciones',
    titulo: 'Interacciones',
    detalle: 'Entre dos o más fármacos',
    icono: 'interacciones',
  },
  {
    ruta: '/herramientas/renal',
    titulo: 'Ajuste renal',
    detalle: 'Según clearance de creatinina',
    icono: 'gota',
  },
  {
    ruta: '/herramientas/condicion-alergia',
    titulo: 'Condición y alergia',
    detalle: 'Alertas sobre un fármaco',
    icono: 'alerta',
  },
];

/**
 * Pantallas sin menú: las de antes de entrar y las que bloquean la app a
 * propósito. Mostrar los accesos ahí sería ofrecer algo que no va a funcionar.
 */
const SIN_MENU = new Set([
  '',
  'bienvenida',
  'login',
  'registro',
  'recuperar',
  'disclaimer',
  'suscripcion-vencida',
  'paywall',
]);

/**
 * Qué sección resaltar. Los detalles heredan la sección de la que cuelgan: un
 * paciente y todo lo suyo pertenecen a Pacientes, la ficha de un fármaco al
 * Buscador. Sin esto el menú se apagaría entero al entrar a cualquier lado.
 */
function seccionActiva(segmentos: string[]): string {
  const primero = segmentos[0] ?? '';

  if (primero === '(tabs)') return segmentos[1] ?? 'index';
  if (primero === 'grupo') return 'grupos';
  if (primero === 'farmaco') return 'buscador';
  if (primero === 'perfil') return 'perfil';
  // Las herramientas no marcan nada: el botón central no es un destino.
  if (primero === 'herramientas') return '';

  // Paciente, prescripción, crear-paciente.
  return 'index';
}

export function MenuInferior() {
  const segmentos = useSegments() as string[];
  const router = useRouter();
  const { oscuro } = useTema();
  const insets = useSafeAreaInsets();
  const c = coloresChrome(oscuro);
  const [abierta, setAbierta] = useState(false);

  if (SIN_MENU.has(segmentos[0] ?? '')) return null;

  const activa = seccionActiva(segmentos);

  const ir = (ruta: string) => {
    // `navigate` y no `push`: si la sección ya está en el historial vuelve a
    // ella en vez de apilar otra copia. Tocar "Pacientes" estando en un
    // paciente tiene que cerrarlo, no dejarlo abierto debajo.
    hapticaSeleccion();
    router.navigate(ruta as never);
  };

  const item = (d: Destino) => {
    const activo = d.clave === activa;
    const color = activo ? '#FFFFFF' : c.tabInactivo;

    return (
      <Pressable
        key={d.clave}
        onPress={() => ir(d.ruta)}
        accessibilityRole="tab"
        accessibilityState={{ selected: activo }}
        accessibilityLabel={d.titulo}
        className="flex-1 items-center justify-center"
      >
        <Icono nombre={d.icono} tamano={21} color={color} />
        <Text className="font-medio" style={{ color, fontSize: 10, marginTop: 3 }}>
          {d.titulo}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      {/* El contenedor reserva el alto de la barra MÁS lo que sobresale el
          botón, para que ninguna pantalla quede tapada por él. */}
      <View style={{ paddingBottom: insets.bottom, paddingTop: 22 }}>
        <View className="mx-3" style={{ position: 'relative' }}>
          <View
            className="flex-row items-center rounded-card"
            style={{
              height: 64,
              backgroundColor: c.fondoHeader,
              shadowColor: '#122A23',
              shadowOpacity: 0.18,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 14,
              elevation: 12,
            }}
          >
            <View className="flex-1 flex-row" style={{ paddingRight: 30 }}>
              {IZQUIERDA.map(item)}
            </View>
            <View className="flex-1 flex-row" style={{ paddingLeft: 30 }}>
              {DERECHA.map(item)}
            </View>
          </View>

          {/* Botón central. Sobresale por encima de la barra; el borde del
              color del fondo lo recorta contra ella. */}
          <Pressable
            onPress={() => {
              hapticaSeleccion();
              setAbierta((v) => !v);
            }}
            accessibilityRole="button"
            accessibilityLabel={abierta ? 'Cerrar herramientas' : 'Herramientas'}
            accessibilityState={{ expanded: abierta }}
            style={{
              position: 'absolute',
              alignSelf: 'center',
              left: 0,
              right: 0,
              top: -26,
              alignItems: 'center',
            }}
          >
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: 58,
                height: 58,
                backgroundColor: oscuro ? c.fondoHeader : '#FFFFFF',
                borderWidth: 5,
                borderColor: oscuro ? '#0C1613' : '#F3F6F3',
                shadowColor: '#122A23',
                shadowOpacity: 0.25,
                shadowOffset: { width: 0, height: 5 },
                shadowRadius: 12,
                elevation: 14,
              }}
            >
              <Icono
                nombre={abierta ? 'cerrar' : 'barras'}
                tamano={23}
                color={oscuro ? '#FFFFFF' : c.fondoHeader}
              />
            </View>
          </Pressable>
        </View>
      </View>

      <HojaInferior visible={abierta} onCerrar={() => setAbierta(false)} titulo="Herramientas">
        {HERRAMIENTAS.map((h) => (
          <OpcionHoja
            key={h.ruta}
            titulo={h.titulo}
            detalle={h.detalle}
            icono={h.icono}
            onPress={() => {
              setAbierta(false);
              router.push(h.ruta as never);
            }}
          />
        ))}
        {/* Apagado y no oculto: existe en el producto, falta el dato. Esconderlo
            haría parecer que nunca existió. */}
        <OpcionHoja
          titulo="Ajuste hepático"
          detalle="Sin tabla de datos todavía"
          icono="higado"
          deshabilitada
        />
      </HojaInferior>
    </>
  );
}
