import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { BuscadorPrincipioActivo, type PaSugerido } from '@/ui/buscador-pa';
import { AvisoNeutro, Boton, CampoTexto, Card, Chip, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { claveColorPorClcr, COLOR_SEVERIDAD, colorEspina, OPCIONES_SEXO, type Sexo } from '@gfh/shared-types';

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
  });

  const listo =
    seleccion.length > 0 &&
    (modo === 'directo'
      ? num(clcr) !== undefined
      : num(d.edadAnios) !== undefined && num(d.pesoKg) !== undefined && num(d.creatininaMgDl) !== undefined);

  return (
    <Pantalla>
      <BuscadorPrincipioActivo
        seleccionados={seleccion}
        onAgregar={(pa) => setSeleccion((s) => (s.some((x) => x.id === pa.id) ? s : [...s, pa]))}
        onQuitar={(id) => setSeleccion((s) => s.filter((x) => x.id !== id))}
      />

      <Eyebrow>Función renal</Eyebrow>
      <View className="mb-4 flex-row gap-2">
        <Chip texto="Tengo el Clcr" activo={modo === 'directo'} onPress={() => setModo('directo')} />
        <Chip texto="Calcularlo" activo={modo === 'calcular'} onPress={() => setModo('calcular')} />
      </View>

      {modo === 'directo' ? (
        <CampoTexto etiqueta="Clcr (mL/min)" value={clcr} onChangeText={setClcr} keyboardType="numeric" />
      ) : (
        <>
          <CampoTexto
            etiqueta="Edad (años)"
            value={d.edadAnios}
            onChangeText={(v) => setD((p) => ({ ...p, edadAnios: v }))}
            keyboardType="numeric"
          />
          <CampoTexto
            etiqueta="Peso (kg)"
            value={d.pesoKg}
            onChangeText={(v) => setD((p) => ({ ...p, pesoKg: v }))}
            keyboardType="numeric"
          />
          <CampoTexto
            etiqueta="Creatinina (mg/dL)"
            value={d.creatininaMgDl}
            onChangeText={(v) => setD((p) => ({ ...p, creatininaMgDl: v }))}
            keyboardType="numeric"
          />
          <Eyebrow>Sexo</Eyebrow>
          <View className="mb-4 flex-row gap-2">
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

      <Boton onPress={() => calcular.mutate()} cargando={calcular.isPending} deshabilitado={!listo}>
        Calcular ajuste
      </Boton>

      {calcular.isError ? (
        <View className="mt-4">
          <Estado titulo="No se pudo calcular" detalle={String((calcular.error as Error)?.message ?? '')} />
        </View>
      ) : null}

      {calcular.data ? (
        <View className="mt-5">
          <Card className="mb-4 px-3.5 py-3">
            <Text className="font-sans text-eyebrow uppercase tracking-wider text-ink-suave">Clcr</Text>
            <Text
              className="text-grande font-fuerte"
              style={{ color: COLOR_SEVERIDAD[claveColorPorClcr(calcular.data.clcrMlMin)] }}
            >
              {calcular.data.clcrMlMin} mL/min
            </Text>
            <Text className="font-sans text-meta text-ink-suave">
              {calcular.data.gradoKdigo ? `KDIGO ${calcular.data.gradoKdigo} · ` : ''}
              {calcular.data.clcrOrigen === 'CALCULADO_COCKCROFT' ? 'Cockcroft-Gault' : 'ingresado'}
            </Text>
          </Card>

          {calcular.data.resultados.map((r, i) => (
            <View key={i} className="mb-2 flex-row items-stretch overflow-hidden rounded-card border border-line bg-surface">
              <View style={{ width: 4, backgroundColor: colorEspina(r.rangoGravedad) }} />
              <View className="flex-1 px-3.5 py-3">
                <Text className="text-body font-medio text-ink">
                  {r.nombre ?? 'Fármaco'}
                  {r.rango ? <Text className="font-sans text-ink-suave"> · {r.rango}</Text> : null}
                </Text>
                {r.sinDatos ? (
                  <Text className="font-sans mt-1 text-meta text-ink-suave">
                    Sin tabla de ajuste renal. No hay recomendación que dar — eso no significa que
                    no haga falta ajustar.
                  </Text>
                ) : (
                  <>
                    <Text className="font-sans mt-1 text-meta leading-5 text-ink">
                      {r.recomendacion ?? 'Sin texto de recomendación en la fuente.'}
                    </Text>
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
                      <Text className="font-sans mt-1 text-eyebrow uppercase tracking-wider" style={{ color: '#92400E' }}>
                        Entrada marcada para revisión en la fuente
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
            </View>
          ))}

          <AvisoNeutro>
            No se guarda. Para dejarlo registrado, cargá el fármaco en un paciente.
          </AvisoNeutro>
        </View>
      ) : null}
    </Pantalla>
  );
}
