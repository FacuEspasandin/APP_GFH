import { Pressable, Text, View } from 'react-native';

import type {
  ClaveRestriccion,
  EstadoRestriccion,
  Restriccion,
  TramoRenal,
  Trimestre,
  Peldano,
} from '@/dominio/restricciones';
import { Icono, type NombreIcono } from '@/ui/iconos';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';
import { COLOR_SEVERIDAD } from '@gfh/shared-types';

/**
 * Las piezas de las restricciones del fármaco.
 *
 * Cada restricción se dibuja como lo que es y no como una fila más de una
 * lista: el riñón es una escala continua, el embarazo una línea de cuarenta
 * semanas, el hígado tres peldaños y la lactancia una sola afirmación. Una
 * lista con un semáforo al costado tira justamente la información que hace que
 * cada una se entienda.
 */

/**
 * El color de cada estado.
 *
 * `ajustar` es el ÚNICO que no sale de la escala clínica: usa el celeste de
 * propiedad, el mismo que la lista del buscador. Un fármaco con tabla renal no
 * es peligroso — hay que dosificarlo por clearance. Gastar un color de gravedad
 * en eso haría que «tiene tabla» se leyera como «cuidado».
 */
const CELESTE = '#075985';
const CELESTE_FONDO = '#E0F2FE';

/**
 * `frente` es para texto y puntos; `relleno` para superficies grandes.
 *
 * En precaución los dos no coinciden: el ámbar de la escala (#F59E0B) no llega
 * al contraste que pide un texto de 11px sobre blanco, y el ámbar oscuro que sí
 * llega (#B45309) se ve marrón cuando ocupa una barra entera. Cada uno donde
 * corresponde.
 */
export function coloresDe(estado: EstadoRestriccion, col: ReturnType<typeof useColores>) {
  switch (estado) {
    case 'ok':
      return { frente: COLOR_SEVERIDAD.ok, relleno: COLOR_SEVERIDAD.ok, fondo: '#ECFDF3' };
    case 'evitar':
      return { frente: COLOR_SEVERIDAD.grave, relleno: COLOR_SEVERIDAD.grave, fondo: '#FEE7E7' };
    case 'precaucion':
      return { frente: '#B45309', relleno: COLOR_SEVERIDAD.media, fondo: '#FEF3C7' };
    case 'ajustar':
      return { frente: CELESTE, relleno: CELESTE, fondo: CELESTE_FONDO };
    case 'sindato':
      return { frente: col.tenue, relleno: col.line, fondo: col.paper };
  }
}

const ETIQUETA: Record<EstadoRestriccion, string> = {
  ok: 'Sin ajuste',
  evitar: 'Evitar',
  precaucion: 'Precaución',
  ajustar: 'Ajustar',
  sindato: 'Sin datos',
};

const ICONO: Record<ClaveRestriccion, NombreIcono> = {
  embarazo: 'embarazo',
  lactancia: 'lactancia',
  renal: 'gota',
  hepatico: 'higado',
};

// --- la grilla ---------------------------------------------------------------

/** Dos columnas. Las cuatro siempre, ninguna se esconde por no tener dato. */
export function GrillaRestricciones({
  restricciones,
  onAbrir,
}: {
  restricciones: readonly Restriccion[];
  onAbrir: (clave: ClaveRestriccion) => void;
}) {
  return (
    <View className="mb-3.5 flex-row flex-wrap" style={{ gap: 8 }}>
      {restricciones.map((r) => (
        <TarjetaRestriccion key={r.clave} r={r} onPress={() => onAbrir(r.clave)} />
      ))}
    </View>
  );
}

function TarjetaRestriccion({ r, onPress }: { r: Restriccion; onPress: () => void }) {
  const col = useColores();
  const c = coloresDe(r.estado, col);
  const apagada = r.estado === 'sindato';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${r.titulo}: ${ETIQUETA[r.estado]}. ${r.glosa}`}
      // 48% y no la mitad exacta: con `gap: 8` dos tarjetas al 50% no entran.
      style={{ width: '48%', flexGrow: 1 }}
      className="rounded-card border border-line bg-surface px-3 py-3"
    >
      <View className="flex-row items-center">
        <View
          className="mr-2.5 items-center justify-center rounded-input"
          style={{ width: 32, height: 32, backgroundColor: c.fondo }}
        >
          <Icono nombre={ICONO[r.clave]} tamano={18} color={c.frente} />
        </View>
        <Text
          className="flex-1 text-meta font-medio"
          style={{ color: apagada ? col.inkSuave : col.ink }}
        >
          {r.titulo}
        </Text>
        <Icono nombre="chevron" tamano={14} color={col.tenue} />
      </View>

      <Text
        className="font-mono mt-2 text-eyebrow uppercase tracking-wider"
        style={{ color: c.frente }}
      >
        {ETIQUETA[r.estado]}
      </Text>
      <Text className="font-sans mt-0.5 text-eyebrow leading-4 text-ink-suave">{r.glosa}</Text>
    </Pressable>
  );
}

// --- la tapa de una sub-pantalla ---------------------------------------------

export function TapaRestriccion({
  clave,
  titulo,
  veredicto,
  estado,
}: {
  clave: ClaveRestriccion;
  titulo: string;
  veredicto: string;
  estado: EstadoRestriccion;
}) {
  const col = useColores();
  const c = coloresDe(estado, col);

  return (
    <Superficie
      elevacion="media"
      className="mb-3.5 flex-row items-center px-3.5 py-3.5"
      style={{ borderLeftWidth: 4, borderLeftColor: c.frente }}
    >
      <View
        className="mr-3 items-center justify-center rounded-input"
        style={{ width: 38, height: 38, backgroundColor: c.fondo }}
      >
        <Icono nombre={ICONO[clave]} tamano={20} color={c.frente} />
      </View>
      <View className="flex-1">
        <Text className="text-fila font-medio text-ink">{titulo}</Text>
        <Text className="font-sans mt-0.5 text-meta leading-4 text-ink-suave">{veredicto}</Text>
      </View>
    </Superficie>
  );
}

// --- renal: la escala ---------------------------------------------------------

/**
 * La escala de clearance, con la dosis dibujada.
 *
 * La barra es la dosis que queda: sólida hasta el mínimo del rango y clara
 * hasta el máximo. El catálogo da intervalos —«75–50 %»— y pintar el promedio
 * sería inventar un número que nadie cargó.
 */
export function EscalaRenal({ tramos }: { tramos: readonly TramoRenal[] }) {
  const col = useColores();

  return (
    <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3.5">
      <View className="mb-3 flex-row justify-between">
        <Text className="font-mono text-eyebrow uppercase tracking-wider text-tenue">
          Clearance
        </Text>
        <Text className="font-mono text-eyebrow uppercase tracking-wider text-tenue">
          Dosis que queda
        </Text>
      </View>

      {tramos.map((t, i) => {
        const c = coloresDe(t.estado, col);
        const ultimo = i === tramos.length - 1;

        return (
          <View key={t.rango} className="flex-row" style={{ paddingBottom: ultimo ? 0 : 14 }}>
            {/* El eje: la regla numérica y el hilo que une los tramos. Es un eje
                continuo, no una lista de ítems sueltos. */}
            {/* 88 y no 74: «Hemodiálisis» no entraba y se partía en dos
                renglones con la sílaba cortada. */}
            <View style={{ width: 88 }}>
              <Text className="font-mono text-right text-meta text-ink-suave">{t.rango}</Text>
            </View>

            <View className="items-center" style={{ width: 16 }}>
              <View
                className="rounded-full"
                style={{ width: 8, height: 8, marginTop: 5, backgroundColor: c.relleno }}
              />
              {!ultimo ? (
                <View className="w-px flex-1" style={{ backgroundColor: col.line, marginTop: 2 }} />
              ) : null}
            </View>

            <View className="flex-1 pl-2">
              <Barra tramo={t} color={c.relleno} />
              {/* Sólo lo que la barra no dice: el porcentaje ya está adentro. */}
              {t.nota ? (
                <Text className="font-sans mt-1.5 text-meta leading-5 text-ink-suave">
                  {t.nota}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}

      <View className="mt-3 flex-row items-center border-t border-line pt-3">
        <View
          className="mr-2 rounded"
          style={{ width: 24, height: 8, backgroundColor: COLOR_SEVERIDAD.media, opacity: 0.45 }}
        />
        <Text className="font-sans flex-1 text-eyebrow leading-4 text-tenue">
          La parte clara es el resto del rango: el catálogo da un intervalo, no un número.
        </Text>
      </View>
    </Superficie>
  );
}

function Barra({ tramo, color }: { tramo: TramoRenal; color: string }) {
  const col = useColores();

  // Sin porcentaje no se dibuja una barra vacía que parezca cero: se dice que
  // la recomendación no viene en porcentaje.
  if (tramo.minimo === null) {
    return (
      <View
        className="justify-center rounded border border-dashed border-line px-2"
        style={{ height: 22 }}
      >
        <Text className="font-mono text-right text-eyebrow text-tenue">sin porcentaje</Text>
      </View>
    );
  }

  const max = tramo.maximo ?? tramo.minimo;
  const etiqueta = max === tramo.minimo ? `${tramo.minimo} %` : `${max} – ${tramo.minimo} %`;

  return (
    <View
      className="justify-center overflow-hidden rounded"
      style={{ height: 22, backgroundColor: col.paper }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${Math.min(tramo.minimo, 100)}%`,
          backgroundColor: color,
        }}
      />
      {max > tramo.minimo ? (
        <View
          style={{
            position: 'absolute',
            left: `${Math.min(tramo.minimo, 100)}%`,
            top: 0,
            bottom: 0,
            width: `${Math.min(max - tramo.minimo, 100)}%`,
            backgroundColor: color,
            opacity: 0.35,
          }}
        />
      ) : null}
      <Text className="font-mono-fuerte pr-2 text-right text-meta text-ink">{etiqueta}</Text>
    </View>
  );
}

// --- embarazo: la línea de 40 semanas -----------------------------------------

export function LineaEmbarazo({ trimestres }: { trimestres: readonly Trimestre[] }) {
  const col = useColores();

  return (
    <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3.5">
      <View className="flex-row overflow-hidden rounded-input" style={{ height: 32, gap: 2 }}>
        {trimestres.map((t) => {
          const c = coloresDe(t.estado, col);
          return (
            <View
              key={t.numero}
              className="items-center justify-center"
              style={{ flex: t.hasta - t.desde + 1, backgroundColor: c.relleno }}
            >
              <Text
                className="font-mono-fuerte text-eyebrow"
                style={{ color: t.estado === 'sindato' ? col.inkSuave : '#FFFFFF' }}
              >
                {t.numero}º
              </Text>
            </View>
          );
        })}
      </View>

      <View className="mt-1 flex-row">
        {trimestres.map((t, i) => (
          <Text
            key={t.numero}
            className="font-mono text-eyebrow text-tenue"
            style={{
              flex: t.hasta - t.desde + 1,
              textAlign: i === 0 ? 'left' : i === trimestres.length - 1 ? 'right' : 'center',
            }}
          >
            {i === 0 ? `sem ${t.desde}` : i === trimestres.length - 1 ? `${t.hasta}` : `${t.desde}`}
          </Text>
        ))}
      </View>

      <View className="mt-3.5">
        {trimestres.map((t, i) => {
          const c = coloresDe(t.estado, col);
          return (
            <View key={t.numero} className="flex-row" style={{ marginTop: i === 0 ? 0 : 10 }}>
              <View
                className="mr-2.5 rounded-full"
                style={{ width: 4, backgroundColor: c.relleno }}
              />
              <View className="flex-1">
                <View className="flex-row items-baseline">
                  <Text className="flex-1 text-meta font-medio text-ink">{t.nombre}</Text>
                  <Text
                    className="font-mono text-eyebrow uppercase tracking-wider"
                    style={{ color: c.frente }}
                  >
                    {ETIQUETA[t.estado]}
                  </Text>
                </View>
                <Text className="font-sans mt-0.5 text-meta leading-5 text-ink-suave">
                  {t.texto ?? 'Sin alerta cargada para este tramo.'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </Superficie>
  );
}

// --- hepática: los peldaños ---------------------------------------------------

/** De abajo hacia arriba, como empeora el hígado: A abajo, C arriba. */
export function PeldanosHepaticos({ peldanos }: { peldanos: readonly Peldano[] }) {
  const col = useColores();
  const alReves = [...peldanos].reverse();

  return (
    <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3.5">
      {alReves.map((p, i) => {
        const c = coloresDe(p.estado, col);
        const vacio = p.estado === 'sindato';

        return (
          <View
            key={p.clase}
            className="flex-row items-start rounded-card px-3 py-2.5"
            style={{
              // El escalonado: cada peldaño arranca más adentro que el de abajo.
              marginLeft: i * 12,
              marginTop: i === 0 ? 0 : 8,
              backgroundColor: vacio ? 'transparent' : c.fondo,
              borderWidth: vacio ? 1 : 0,
              borderColor: col.line,
              borderStyle: vacio ? 'dashed' : 'solid',
            }}
          >
            <View
              className="mr-2.5 items-center justify-center rounded-input"
              style={{
                width: 30,
                height: 30,
                backgroundColor: vacio ? 'transparent' : c.relleno,
                borderWidth: vacio ? 1.5 : 0,
                borderColor: col.tenue,
                borderStyle: vacio ? 'dashed' : 'solid',
              }}
            >
              <Text
                className="font-mono-fuerte text-fila"
                style={{ color: vacio ? col.tenue : '#FFFFFF' }}
              >
                {p.clase}
              </Text>
            </View>

            <View className="flex-1">
              <Text
                className="text-meta font-medio"
                style={{ color: vacio ? col.inkSuave : col.ink }}
              >
                {p.nombre}
              </Text>
              <Text
                className="font-sans mt-0.5 text-eyebrow leading-4"
                style={{ color: vacio ? col.tenue : col.inkSuave }}
              >
                {p.texto ?? 'Sin dato cargado.'}
              </Text>
            </View>
          </View>
        );
      })}
    </Superficie>
  );
}

// --- comunes ------------------------------------------------------------------

/** La marca de contenido sin revisar por un farmacéutico. */
export function MarcaSinValidar() {
  const col = useColores();
  return (
    <View className="mb-3.5 flex-row">
      <View className="flex-row items-center rounded-chip border border-line px-2.5 py-1">
        <View
          className="mr-1.5 rounded-full"
          style={{ width: 5, height: 5, backgroundColor: col.inkSuave }}
        />
        <Text className="font-mono text-eyebrow uppercase tracking-wider text-ink-suave">
          Sin validar
        </Text>
      </View>
    </View>
  );
}

/** El pie: qué cambia cuando hay un paciente cargado. */
export function PieContexto({ children }: { children: React.ReactNode }) {
  const col = useColores();
  return (
    <Superficie
      elevacion="plana"
      className="mb-3.5 px-3.5 py-3"
      style={{ borderLeftWidth: 4, borderLeftColor: col.tenue }}
    >
      <Text className="font-sans text-meta leading-5 text-ink-suave">{children}</Text>
    </Superficie>
  );
}
