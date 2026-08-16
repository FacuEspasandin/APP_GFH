import { useRouter, useSegments } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hapticaSeleccion } from '@/ui/haptica';
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
 * El botón central lleva a la pantalla de Herramientas, y se marca como activo
 * mientras estás ahí. Antes abría una hoja inferior con su propia lista de
 * cuatro herramientas escrita a mano: sin la calculadora de Clcr, sin candados
 * y sin buscador. Eran dos catálogos para lo mismo, y agregar una herramienta
 * era acordarse de los dos.
 */

/** Alto de la zona con íconos, sin contar el área segura del teléfono. */
const ALTO_CONTENIDO = 50;

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
  // Las pantallas de cada herramienta cuelgan de `/herramientas/…` y no del
  // grupo de pestañas, así que se marcan a mano.
  if (primero === 'herramientas') return 'herramientas';

  // Paciente, prescripción, crear-paciente.
  return 'index';
}

export function MenuInferior() {
  const segmentos = useSegments() as string[];
  const router = useRouter();
  const { oscuro } = useTema();
  const insets = useSafeAreaInsets();
  const c = coloresChrome(oscuro);

  if (SIN_MENU.has(segmentos[0] ?? '')) return null;

  /**
   * El área segura del teléfono, recortada.
   *
   * iOS reserva 34pt bajo el indicador de inicio y esa franja es la que se veía
   * como espacio muerto: más alta que los propios rótulos. Se dejan 24, que
   * mantiene los elementos tocables fuera de la zona del gesto —el indicador
   * ocupa los últimos 8pt— sin regalar el resto.
   *
   * En teléfonos sin indicador (`insets.bottom === 0`) queda un respiro mínimo
   * para que los rótulos no toquen el borde de la pantalla.
   */
  const respiro = insets.bottom > 0 ? insets.bottom - 10 : 8;

  const activa = seccionActiva(segmentos);
  const enHerramientas = activa === 'herramientas';

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
        <Icono nombre={d.icono} tamano={20} color={color} />
        <Text className="font-medio" style={{ color, fontSize: 10, marginTop: 2 }}>
          {d.titulo}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      {/* El contenedor reserva lo que sobresale el botón, para que ninguna
          pantalla quede tapada por él. */}
      <View style={{ paddingTop: 20 }}>
        <View style={{ position: 'relative' }}>
          {/* De borde a borde: el verde llega a los lados de la pantalla y baja
              hasta el borde inferior, cubriendo el área segura del teléfono.
              Flotando como pastilla dejaba una franja de papel abajo que no
              pertenecía a ninguna de las dos superficies. */}
          <View
            className="flex-row items-start"
            style={{
              height: ALTO_CONTENIDO + respiro,
              paddingBottom: respiro,
              backgroundColor: c.fondoHeader,
              shadowColor: '#122A23',
              shadowOpacity: 0.18,
              shadowOffset: { width: 0, height: -3 },
              shadowRadius: 14,
              elevation: 12,
            }}
          >
            <View className="flex-1 flex-row" style={{ height: ALTO_CONTENIDO, paddingRight: 34 }}>
              {IZQUIERDA.map(item)}
            </View>
            <View className="flex-1 flex-row" style={{ height: ALTO_CONTENIDO, paddingLeft: 34 }}>
              {DERECHA.map(item)}
            </View>
          </View>

          {/* Botón central.
              El área tocable mide EXACTAMENTE lo que el botón. Antes se
              estiraba de borde a borde con el contenido centrado, así que
              tocar la parte de arriba de "Grupos" o "Buscador" abría las
              herramientas: el Pressable invisible tapaba media barra. */}
          <View
            pointerEvents="box-none"
            style={{ position: 'absolute', left: 0, right: 0, top: -24, alignItems: 'center' }}
          >
            <Pressable
              onPress={() => ir('/(tabs)/herramientas')}
              accessibilityRole="tab"
              accessibilityLabel="Herramientas"
              accessibilityState={{ selected: enHerramientas }}
              className="items-center justify-center rounded-full"
              style={{
                width: 58,
                height: 58,
                // Estando ahí se rellena de verde, como los rótulos de los
                // costados se ponen blancos: es el mismo idioma para decir
                // «acá estás».
                backgroundColor: enHerramientas
                  ? c.fondoHeader
                  : oscuro
                    ? c.fondoHeader
                    : '#FFFFFF',
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
                nombre="barras"
                tamano={23}
                color={enHerramientas || oscuro ? '#FFFFFF' : c.fondoHeader}
              />
            </Pressable>
          </View>
        </View>
      </View>

    </>
  );
}
