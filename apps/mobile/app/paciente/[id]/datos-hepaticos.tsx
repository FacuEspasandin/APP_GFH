import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import * as API from '@/api/endpoints';
import { cuerpoDeGuardado, evaluar, sePuedeGuardar, borradorDesde } from '@/dominio/hepatico';
import {
  aBorradorDelMolde,
  desdeBorradorDelMolde,
  moldeChildPugh,
} from '@/dominio/molde-child-pugh';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Calculadora } from '@/ui/calculadora';
import { CampoFecha } from '@/ui/campo-fecha';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { SkeletonFormulario } from '@/ui/estados-sistema';
import { aISO, validarFecha } from '@/ui/fecha';
import { Superficie } from '@/ui/superficie';
import type { Borrador, Unidades } from '@gfh/shared-types';

/**
 * Lo que hace falta de `GET /pacientes/:id`. Los tres primeros son `Decimal` en
 * el esquema, y Prisma los serializa como string.
 */
interface PacienteHepatico {
  /** La banda es el dato del que sale la clase. Puede faltar en un paciente
   *  cargado antes de que la pantalla pasara a bandas. */
  bilirrubinaPuntos: number | null;
  albuminaPuntos: number | null;
  inrPuntos: number | null;
  bilirrubinaMgDl: string | number | null;
  albuminaGDl: string | number | null;
  inr: string | number | null;
  ascitis: string | null;
  encefalopatia: string | null;
  childPughClase: string | null;
}

const aNumeros = (p: PacienteHepatico) => ({
  bilirrubinaPuntos: p.bilirrubinaPuntos,
  albuminaPuntos: p.albuminaPuntos,
  inrPuntos: p.inrPuntos,
  bilirrubinaMgDl: p.bilirrubinaMgDl === null ? null : Number(p.bilirrubinaMgDl),
  albuminaGDl: p.albuminaGDl === null ? null : Number(p.albuminaGDl),
  inr: p.inr === null ? null : Number(p.inr),
  ascitis: p.ascitis,
  encefalopatia: p.encefalopatia,
});

/**
 * Función hepática del paciente (3.1.4).
 *
 * Dibujada desde el molde, igual que la herramienta suelta — que es el punto:
 * antes eran dos pantallas compartiendo un formulario de 524 líneas escrito a
 * mano, y ahora son la misma declaración con `conValorExacto` distinto.
 *
 * La diferencia real entre las dos está en tres props: acá se arranca con lo
 * que ya estaba guardado, se pide el valor exacto —el historial quiere poder
 * decir el número— y hay botón de guardar en vez del aviso de que no se guarda
 * nada.
 *
 * La tabla de ajuste hepático por fármaco sigue sin existir, y el molde lo dice
 * en su `limite` en vez de esconderlo: guardar sirve igual —la clase es un dato
 * del paciente— pero prometer un ajuste que no va a aparecer sería mentir.
 */
export default function DatosHepaticos() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  // Se pide el paciente completo y no el cockpit: los cinco criterios son datos
  // crudos que el motor no necesita, y meterlos en el contexto clínico sería
  // ensuciar el puerto del dominio con algo que sólo usa esta pantalla.
  const { data: paciente, isLoading } = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => API.pacienteHepatico(pacienteId),
    enabled: Boolean(pacienteId),
  });

  /** Lo que el médico va tocando, en el formato del molde. `null` = sin tocar. */
  const [tocado, setTocado] = useState<{ borrador: Borrador; unidades: Unidades } | null>(null);
  /** Vacío = hoy. Ver `datos-renales`. */
  const [fecha, setFecha] = useState('');

  // El ISO sale del texto sólo cuando la fecha está completa y es válida: a
  // medio escribir no se manda nada y el backend usa hoy.
  const vf = validarFecha(fecha);
  const medidoAt = vf.valida && vf.fecha ? aISO(vf.fecha) : undefined;

  const guardar = useMutation({
    mutationFn: () => {
      // Se recalcula acá y no se toma de una const de arriba: aquélla se
      // define después del `return` de carga, y capturarla en el cierre
      // dependería de en qué render se armó la mutación.
      const base = tocado ?? aBorradorDelMolde(borradorDesde(aNumeros(paciente!)));
      return API.guardarDatosHepaticos(pacienteId, {
        ...cuerpoDeGuardado(desdeBorradorDelMolde(base.borrador, base.unidades)),
        ...(medidoAt ? { medidoAt } : {}),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cockpit', pacienteId] });
      await qc.invalidateQueries({ queryKey: ['historial', pacienteId] });
      await qc.invalidateQueries({ queryKey: ['inicio'] });
      router.back();
    },
  });

  if (isLoading || !paciente) {
    return (
      <View className="flex-1 bg-paper">
        <EncabezadoConTitulo titulo="Función Hepática" cierra />
        <SkeletonFormulario campos={5} />
      </View>
    );
  }

  // Lo guardado es el punto de partida; lo que el médico toca lo pisa.
  const guardado = aBorradorDelMolde(borradorDesde(aNumeros(paciente)));
  const actual = tocado ?? guardado;
  const enDominio = desdeBorradorDelMolde(actual.borrador, actual.unidades);
  const r = evaluar(enDominio);
  const yaTenia = paciente.childPughClase !== null;

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Función Hepática" cierra />
      <Calculadora
        molde={moldeChildPugh(true)}
        inicial={guardado.borrador}
        onCambio={(borrador, unidades) => setTocado({ borrador, unidades })}
        guardar={{
          rotulo: yaTenia ? 'Actualizar' : 'Guardar y recalcular',
          onGuardar: () => guardar.mutate(),
          guardando: guardar.isPending,
          listo: sePuedeGuardar(enDominio),
        }}
        extra={
          <>
            <Superficie elevacion="plana" className="mb-3.5 mt-3.5 px-3.5 py-3">
              <Text className="font-sans text-meta leading-5 text-ink-suave">
                {r.clase === null
                  ? 'La clase se guarda cuando estén los cinco criterios. Mientras tanto, lo que cargues queda igual.'
                  : 'La clase queda en el paciente. La tabla de ajuste por fármaco todavía no existe: cuando esté, se aplica sola sobre el tratamiento que ya cargaste.'}
              </Text>
            </Superficie>

            <BloqueFormulario titulo="Fecha del análisis" etiqueta="Opcional">
              <CampoFecha etiqueta="Cuándo se hicieron" valor={fecha} onChange={setFecha} />
              <Text className="font-sans -mt-2 text-meta leading-5 text-ink-suave">
                Sin completar se guarda con la fecha de hoy.
              </Text>
            </BloqueFormulario>
          </>
        }
      />
    </View>
  );
}
