import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { BuscadorPrincipioActivo, type PaSugerido } from '@/ui/buscador-pa';
import {
  AvisoDescartable,
  Consulta,
  ConsultaPlegada,
  FilaResultado,
  Veredicto,
} from '@/ui/herramienta';
import { CampoTexto, Chip, Estado } from '@/ui/kit';
import {
  COLOR_SEVERIDAD,
  nombreSexo,
  OPCIONES_SEXO,
  type RangoGravedad,
  type Sexo,
} from '@gfh/shared-types';

interface Resultado {
  clcrMlMin: number;
  clcrOrigen: string | null;
  gradoKdigo: string | null;
  resultados: Array<{
    nombre: string | null;
    sinDatos: boolean;
    rango: string | null;
    recomendacion: string | null;
    dosisFrNormal?: string;
    suplementoHd?: string | null;
    requiereRevision?: boolean;
    rangoGravedad: 0 | 1 | 2 | 3 | null;
    porEncimaDelTecho?: boolean;
  }>;
}

/** Herramienta 3 (4.6 / 4.7): N fármacos contra un Clcr directo o calculado. */
export default function HerramientaRenal() {
  const [seleccion, setSeleccion] = useState<PaSugerido[]>([]);
  const [modo, setModo] = useState<'directo' | 'calcular'>('directo');
  const [clcr, setClcr] = useState('');
  const [d, setD] = useState({ edadAnios: '', pesoKg: '', creatininaMgDl: '' });
  const [sexo, setSexo] = useState<Sexo>('F');
  const [editando, setEditando] = useState(true);

  const num = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(',', '.')));

  const calcular = useMutation({
    mutationFn: () =>
      api.post<Resultado>('/herramientas/ajuste-renal', {
        principioActivoIds: seleccion.map((s) => s.id),
        ...(modo === 'directo'
          ? { clcrMlMin: num(clcr) }
          : {
              edadAnios: num(d.edadAnios),
              pesoKg: num(d.pesoKg),
              creatininaMgDl: num(d.creatininaMgDl),
              sexo,
            }),
      }),
    onSuccess: () => setEditando(false),
  });

  const listo =
    seleccion.length > 0 &&
    (modo === 'directo'
      ? num(clcr) !== undefined
      : num(d.edadAnios) !== undefined &&
        num(d.pesoKg) !== undefined &&
        num(d.creatininaMgDl) !== undefined);

  if (editando || !calcular.data) {
    return (
      <Consulta
        accion={
          seleccion.length === 0
            ? 'Agregá al menos un fármaco'
            : `Calcular ajuste de ${seleccion.length}`
        }
        onAccion={() => calcular.mutate()}
        cargando={calcular.isPending}
        deshabilitado={!listo}
      >
        <BloqueFormulario titulo="Fármacos" exigencia="Obligatorio">
          <BuscadorPrincipioActivo
            seleccionados={seleccion}
            onAgregar={(pa) => setSeleccion((s) => (s.some((x) => x.id === pa.id) ? s : [...s, pa]))}
            onQuitar={(id) => setSeleccion((s) => s.filter((x) => x.id !== id))}
          />
        </BloqueFormulario>

        <BloqueFormulario titulo="Función renal" exigencia="Obligatorio">
          <View className="mb-3.5 flex-row gap-2">
            <Chip
              texto="Tengo el Clcr"
              activo={modo === 'directo'}
              onPress={() => setModo('directo')}
            />
            <Chip
              texto="Calcularlo"
              activo={modo === 'calcular'}
              onPress={() => setModo('calcular')}
            />
          </View>

          {modo === 'directo' ? (
            <CampoTexto
              etiqueta="Clcr (mL/min)"
              value={clcr}
              onChangeText={setClcr}
              keyboardType="numeric"
            />
          ) : (
            <>
              {/* Los tres en una fila, igual que en Crear paciente: son números
                  cortos que alimentan una sola fórmula. */}
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <CampoTexto
                    etiqueta="Edad"
                    value={d.edadAnios}
                    onChangeText={(v) => setD((p) => ({ ...p, edadAnios: v }))}
                    keyboardType="numeric"
                    placeholder="años"
                  />
                </View>
                <View className="flex-1">
                  <CampoTexto
                    etiqueta="Peso"
                    value={d.pesoKg}
                    onChangeText={(v) => setD((p) => ({ ...p, pesoKg: v }))}
                    keyboardType="numeric"
                    placeholder="kg"
                  />
                </View>
                <View className="flex-1">
                  <CampoTexto
                    etiqueta="Creatinina"
                    value={d.creatininaMgDl}
                    onChangeText={(v) => setD((p) => ({ ...p, creatininaMgDl: v }))}
                    keyboardType="numeric"
                    placeholder="mg/dL"
                  />
                </View>
              </View>

              <Text className="mb-1.5 text-eyebrow font-medio uppercase tracking-wider text-ink-suave">
                Sexo
              </Text>
              <View className="flex-row gap-2">
                {OPCIONES_SEXO.map((o) => (
                  <Chip
                    key={o.valor}
                    texto={o.sigla}
                    activo={sexo === o.valor}
                    onPress={() => setSexo(o.valor)}
                  />
                ))}
              </View>
            </>
          )}
        </BloqueFormulario>

        <AvisoDescartable />

        {calcular.isError ? (
          <Estado
            titulo="No se pudo calcular"
            detalle={String((calcular.error as Error)?.message ?? '')}
          />
        ) : null}
      </Consulta>
    );
  }

  return (
    <ResultadoRenal
      datos={calcular.data}
      onCambiar={() => setEditando(true)}
      consulta={{
        farmacos: seleccion.map((s) => s.nombre),
        detalle:
          modo === 'directo'
            ? `Clcr ingresado: ${clcr} mL/min`
            : `${nombreSexo(sexo)}, ${d.edadAnios} años · ${d.pesoKg} kg · creatinina ${d.creatininaMgDl}`,
      }}
    />
  );
}

function ResultadoRenal({
  datos,
  onCambiar,
  consulta,
}: {
  datos: Resultado;
  onCambiar: () => void;
  consulta: { farmacos: string[]; detalle: string };
}) {
  // Ordenados por gravedad y no por el orden en que se cargaron: lo
  // contraindicado tiene que estar arriba aunque se haya escrito último.
  const filas = [...datos.resultados].sort(
    (a, b) => orden(a.rangoGravedad) - orden(b.rangoGravedad),
  );

  const conAjuste = filas.filter((r) => r.rangoGravedad !== null && r.rangoGravedad <= 2).length;
  const sinTabla = filas.filter((r) => r.sinDatos).length;

  return (
    <View className="flex-1 bg-paper">
      <ConsultaPlegada
        titulo={consulta.farmacos.join(' · ')}
        detalle={consulta.detalle}
        onCambiar={onCambiar}
      />

      <ScrollView contentContainerClassName="px-4 pb-4 pt-3">
        {/* El Clcr manda: hoy el médico carga edad, peso y creatinina y nunca
            ve el número que salió, sólo sus consecuencias. */}
        <Veredicto
          rango={rangoDelClcr(datos.clcrMlMin)}
          cifra={String(datos.clcrMlMin).replace('.', ',')}
          titulo="Clcr mL/min"
          detalle={[
            datos.clcrOrigen === 'CALCULADO_COCKCROFT' ? 'Cockcroft-Gault' : 'ingresado',
            datos.gradoKdigo ? `KDIGO ${datos.gradoKdigo}` : null,
            conAjuste > 0
              ? `${conAjuste} de ${filas.length} ${conAjuste === 1 ? 'necesita' : 'necesitan'} ajuste`
              : 'Ninguno necesita ajuste en este rango',
          ]
            .filter(Boolean)
            .join(' · ')}
        />

        {filas.map((r, i) => (
          <FilaResultado
            key={i}
            rango={r.rangoGravedad}
            titulo={r.nombre ?? 'Fármaco'}
            detalle={
              r.sinDatos
                ? 'Sin tabla de ajuste renal. No hay recomendación que dar — eso no significa que no haga falta ajustar.'
                : (r.recomendacion ?? 'Sin texto de recomendación en la fuente.')
            }
          >
            {!r.sinDatos ? (
              <>
                {r.rango ? (
                  <Text className="font-mono mt-1 text-eyebrow text-ink-suave">Rango {r.rango}</Text>
                ) : null}
                {r.dosisFrNormal ? (
                  <Text className="font-sans mt-1 text-meta text-ink-suave">
                    Función normal: {r.dosisFrNormal}
                  </Text>
                ) : null}
                {r.suplementoHd ? (
                  <Text className="font-sans mt-0.5 text-meta text-ink-suave">
                    Hemodiálisis: {r.suplementoHd}
                  </Text>
                ) : null}
                {r.porEncimaDelTecho ? (
                  <Text className="font-sans mt-1 text-eyebrow uppercase tracking-wider text-ink-suave">
                    Función renal por encima del techo de la tabla
                  </Text>
                ) : null}
                {r.requiereRevision ? (
                  <Text
                    className="font-sans mt-1 text-eyebrow uppercase tracking-wider"
                    style={{ color: COLOR_SEVERIDAD.media }}
                  >
                    Entrada marcada para revisión en la fuente
                  </Text>
                ) : null}
              </>
            ) : null}
          </FilaResultado>
        ))}

        <AvisoDescartable
          extra={
            sinTabla > 0
              ? `${sinTabla} ${sinTabla === 1 ? 'fármaco no tiene' : 'fármacos no tienen'} tabla en el catálogo.`
              : undefined
          }
        />
      </ScrollView>
    </View>
  );
}

/** Sin gravedad va al final, no al principio. */
function orden(rango: RangoGravedad | null): number {
  return rango === null ? 99 : rango;
}

/**
 * La gravedad del Clcr en sí, para teñir el veredicto.
 *
 * Son los mismos cortes que usa `claveColorPorClcr` para pintar el número en el
 * resto de la app, traducidos a rango porque el veredicto tiñe por gravedad. No
 * sale de los hallazgos: un Clcr de 20 es grave aunque ningún fármaco cargado
 * tenga tabla.
 */
function rangoDelClcr(clcr: number): RangoGravedad {
  if (clcr < 30) return 1;
  if (clcr < 60) return 2;
  return 3;
}
