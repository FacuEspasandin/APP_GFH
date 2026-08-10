import { AvisoNeutro, Estado, Eyebrow, Pantalla } from '@/ui/kit';
import { Text } from 'react-native';

/**
 * Datos hepáticos (3.1.4).
 *
 * El esquema existe —`Paciente` tiene bilirrubina, albúmina, INR, ascitis,
 * encefalopatía y clase Child-Pugh— pero no hay tabla de ajuste hepático contra
 * la cual evaluarlos, y la clasificación clínica todavía no está confirmada.
 *
 * Cargar los cinco valores sin motor que los use daría la impresión de que el
 * sistema está evaluando algo. Por eso la pantalla explica en vez de pedir
 * datos que hoy no cambian ningún resultado.
 */
export default function DatosHepaticos() {
  return (
    <Pantalla>
      <Estado
        titulo="Todavía no se puede evaluar"
        detalle="El ajuste hepático no tiene tabla de datos cargada, así que cargar los valores no cambiaría ningún resultado."
      />

      <Eyebrow>Qué falta</Eyebrow>
      <Text className="font-sans mb-3 px-1 text-meta leading-5 text-ink-suave">
        Dos cosas, en este orden: confirmar la clasificación clínica —Child-Pugh es lo propuesto,
        por ser el criterio de las tablas publicadas— y construir la tabla de ajuste por fármaco.
        El esquema de base ya está listo para recibirla, con el mismo patrón que el renal.
      </Text>

      <AvisoNeutro>
        Mientras tanto la categoría «Ajuste hepático» del diagnóstico queda en cero y en neutro. No
        es que no haya problema: es que no se sabe.
      </AvisoNeutro>
    </Pantalla>
  );
}
