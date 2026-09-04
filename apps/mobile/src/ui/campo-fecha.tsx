import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Icono } from './iconos';
import {
  aplicarMascara,
  aTexto,
  DIAS_SEMANA,
  diaSemanaLunes,
  diasDelMes,
  LARGO_FECHA,
  MESES,
  validarFecha,
} from './fecha';
import { useColores } from './tema';

/**
 * Campo de fecha con máscara dd/mm/aaaa y calendario.
 *
 * Las dos formas de cargar conviven porque sirven para cosas distintas: quien
 * sabe la fecha la teclea más rápido de lo que navega un calendario, y quien
 * la tiene que buscar prefiere verla.
 *
 * El calendario es el del SISTEMA en iOS y Android: el médico ya sabe usarlo y
 * en Android trae su propio salto de año, que es lo que hacía falta para una
 * fecha de nacimiento (desde 2026 hasta 1948 hay 936 meses). En web —donde no
 * hay picker nativo— sigue el calendario propio, que arranca por el AÑO por esa
 * misma razón.
 */

/**
 * El picker nativo devuelve una fecha LOCAL y todo el resto de la app lee en
 * UTC (`aTexto`, `validarFecha`). Sin esta conversión, en un huso al este de
 * Greenwich la medianoche local del 7 cae el 6 en UTC y la fecha de nacimiento
 * se guarda un día antes. Se reconstruye por componentes, que es lo único que
 * no depende del huso.
 */
function aUtc(local: Date): Date {
  return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
}

/** Ninguna fecha de nacimiento es futura, y el calendario no debería ofrecerla. */
const HOY = () => new Date();
export function CampoFecha({
  etiqueta,
  valor,
  onChange,
  errorExterno,
}: {
  etiqueta: string;
  /** Texto en formato dd/mm/aaaa. El componente no maneja Date por dentro para
   *  que el campo pueda estar a medio escribir. */
  valor: string;
  onChange: (texto: string) => void;
  errorExterno?: string;
}) {
  const col = useColores();

  const [abierto, setAbierto] = useState(false);
  const [tocado, setTocado] = useState(false);

  const validacion = validarFecha(valor);
  // No se marca en rojo mientras todavía está escribiendo algo que puede
  // terminar bien; sí apenas un tramo es imposible.
  const error = errorExterno ?? (tocado || validacion.completa ? validacion.error : null);

  const elegir = (f: Date) => {
    onChange(aTexto(aUtc(f)));
    setTocado(true);
    setAbierto(false);
  };

  /*
   * Android abre el diálogo del sistema por llamada y no montando un
   * componente; iOS y web sí necesitan que algo se dibuje, por eso sólo ahí se
   * usa `abierto`.
   */
  const abrirCalendario = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: validacion.fecha ?? HOY(),
        mode: 'date',
        maximumDate: HOY(),
        onChange: (evento, fecha) => {
          if (evento.type === 'set' && fecha) elegir(fecha);
        },
      });
      return;
    }
    setAbierto(true);
  };

  return (
    <View className="mb-3.5">
      <Text className="mb-1.5 text-eyebrow font-fuerte uppercase tracking-wider text-ink-suave">
        {etiqueta}
      </Text>

      <View className="flex-row items-center gap-2">
        <TextInput
          value={valor}
          onChangeText={(t) => onChange(aplicarMascara(t, valor))}
          onBlur={() => setTocado(true)}
          placeholder="dd/mm/aaaa"
          placeholderTextColor={col.tenue}
          keyboardType="number-pad"
          maxLength={LARGO_FECHA}
          accessibilityLabel={etiqueta}
          className="h-12 flex-1 rounded-chip border bg-surface px-3.5 text-body text-ink"
          style={{ borderColor: error ? '#EF4444' : col.line }}
        />
        <Pressable
          onPress={abrirCalendario}
          accessibilityRole="button"
          accessibilityLabel="Elegir del calendario"
          className="h-12 w-12 items-center justify-center rounded-chip border border-line bg-surface"
        >
          <Icono nombre="carpeta" tamano={20} color={col.primary} />
        </Pressable>
      </View>

      {error ? (
        <Text className="font-sans mt-1 text-meta" style={{ color: col.peligro }}>
          {error}
        </Text>
      ) : validacion.valida ? (
        <Text className="font-sans mt-1 text-meta text-ink-suave">
          {edadDe(validacion.fecha!)} años
        </Text>
      ) : null}

      {Platform.OS === 'ios' ? (
        /* En iOS el picker se dibuja inline: va adentro de una hoja propia con
           su botón de cerrar, porque la rueda sola no tiene forma de salir. */
        <Modal visible={abierto} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
          <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setAbierto(false)}>
            <Pressable className="rounded-t-sheet bg-surface px-4 pb-8 pt-3" onPress={(e) => e.stopPropagation()}>
              <View className="mb-2 flex-row justify-end">
                <Pressable onPress={() => setAbierto(false)} accessibilityRole="button" hitSlop={8}>
                  <Text className="text-fila font-medio" style={{ color: col.primary }}>
                    Listo
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={validacion.fecha ?? HOY()}
                mode="date"
                display="spinner"
                maximumDate={HOY()}
                onChange={(_evento, fecha) => {
                  if (fecha) onChange(aTexto(aUtc(fecha)));
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : Platform.OS === 'web' ? (
        <Calendario
          visible={abierto}
          inicial={validacion.fecha}
          onCerrar={() => setAbierto(false)}
          onElegir={elegir}
        />
      ) : null}
    </View>
  );
}

function edadDe(fecha: Date): number {
  const hoy = new Date();
  let edad = hoy.getUTCFullYear() - fecha.getUTCFullYear();
  const mes = hoy.getUTCMonth() - fecha.getUTCMonth();
  if (mes < 0 || (mes === 0 && hoy.getUTCDate() < fecha.getUTCDate())) edad -= 1;
  return edad;
}

// ---------------------------------------------------------------------------

type Vista = 'anio' | 'mes' | 'dia';

function Calendario({
  visible,
  inicial,
  onElegir,
  onCerrar,
}: {
  visible: boolean;
  inicial: Date | null;
  onElegir: (f: Date) => void;
  onCerrar: () => void;
}) {
  const col = useColores();

  const hoy = new Date();
  const base = inicial ?? hoy;

  const [vista, setVista] = useState<Vista>(inicial ? 'dia' : 'anio');
  const [anio, setAnio] = useState(base.getUTCFullYear());
  const [mes, setMes] = useState(base.getUTCMonth() + 1);

  const anios = Array.from({ length: 121 }, (_, i) => hoy.getUTCFullYear() - i);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(18,42,35,0.45)' }}
        onPress={onCerrar}
      >
        {/* El Pressable interno frena el toque para que tocar el calendario no
            lo cierre. */}
        <Pressable className="w-full max-w-[360px] rounded-card bg-surface p-4" onPress={() => {}}>
          <View className="mb-3 flex-row items-center justify-between">
            <Pressable
              onPress={() => setVista(vista === 'dia' ? 'mes' : vista === 'mes' ? 'anio' : 'anio')}
              accessibilityRole="button"
              className="flex-row items-center gap-1.5"
            >
              <Text className="text-fila font-fuerte capitalize text-ink">
                {vista === 'anio' ? 'Elegí el año' : vista === 'mes' ? String(anio) : `${MESES[mes - 1]} ${anio}`}
              </Text>
              {vista !== 'anio' ? <Icono nombre="chevronArriba" tamano={16} color={col.inkSuave} /> : null}
            </Pressable>

            <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Icono nombre="cerrar" tamano={18} color={col.inkSuave} />
            </Pressable>
          </View>

          {vista === 'anio' ? (
            <ScrollView style={{ maxHeight: 300 }}>
              <View className="flex-row flex-wrap">
                {anios.map((a) => (
                  <Pressable
                    key={a}
                    onPress={() => {
                      setAnio(a);
                      setVista('mes');
                    }}
                    accessibilityRole="button"
                    className="w-1/4 items-center rounded-chip py-2.5"
                    style={{ backgroundColor: a === anio ? col.primaryLight : 'transparent' }}
                  >
                    <Text
                      className="font-sans text-body"
                      style={{ color: a === anio ? col.primary : col.ink, fontFamily: a === anio ? 'Inter_700Bold' : 'Inter_400Regular' }}
                    >
                      {a}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : null}

          {vista === 'mes' ? (
            <View className="flex-row flex-wrap">
              {MESES.map((nombre, i) => (
                <Pressable
                  key={nombre}
                  onPress={() => {
                    setMes(i + 1);
                    setVista('dia');
                  }}
                  accessibilityRole="button"
                  className="w-1/3 items-center rounded-chip py-3"
                  style={{ backgroundColor: i + 1 === mes ? col.primaryLight : 'transparent' }}
                >
                  <Text
                    className="font-sans text-body capitalize"
                    style={{ color: i + 1 === mes ? col.primary : col.ink }}
                  >
                    {nombre.slice(0, 3)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {vista === 'dia' ? (
            <GrillaDias anio={anio} mes={mes} elegida={inicial} hoy={hoy} onElegir={onElegir} />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function GrillaDias({
  anio,
  mes,
  elegida,
  hoy,
  onElegir,
}: {
  anio: number;
  mes: number;
  elegida: Date | null;
  hoy: Date;
  onElegir: (f: Date) => void;
}) {
  const col = useColores();

  const total = diasDelMes(mes, anio);
  const huecos = diaSemanaLunes(new Date(Date.UTC(anio, mes - 1, 1)));

  const esElegida = (d: number) =>
    elegida?.getUTCFullYear() === anio &&
    elegida.getUTCMonth() + 1 === mes &&
    elegida.getUTCDate() === d;

  return (
    <View>
      <View className="mb-1 flex-row">
        {DIAS_SEMANA.map((d, i) => (
          <Text
            key={i}
            className="w-[14.28%] text-center text-eyebrow font-fuerte uppercase text-ink-suave"
          >
            {d}
          </Text>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {Array.from({ length: huecos }, (_, i) => (
          <View key={`h${i}`} className="w-[14.28%] py-2" />
        ))}

        {Array.from({ length: total }, (_, i) => i + 1).map((d) => {
          const fecha = new Date(Date.UTC(anio, mes - 1, d));
          // Una fecha de nacimiento futura no existe: se muestra apagada y no
          // se puede tocar.
          const futura = fecha.getTime() > hoy.getTime();
          const activa = esElegida(d);

          return (
            <Pressable
              key={d}
              disabled={futura}
              onPress={() => onElegir(fecha)}
              accessibilityRole="button"
              accessibilityLabel={`${d} de ${MESES[mes - 1]} de ${anio}`}
              accessibilityState={{ selected: activa, disabled: futura }}
              className="w-[14.28%] items-center py-1.5"
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: activa ? col.primary : 'transparent' }}
              >
                <Text
                  className="font-sans text-body"
                  style={{
                    color: activa ? '#FFFFFF' : futura ? col.tenue : col.ink,
                    fontFamily: activa ? 'Inter_700Bold' : 'Inter_400Regular',
                  }}
                >
                  {d}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
