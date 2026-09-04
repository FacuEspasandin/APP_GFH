import { Text, View } from 'react-native';

import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/** Ayuda y soporte (6.10). */
export default function Ayuda() {
  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Ayuda y Soporte" />
      <Pantalla>
        <Text className="mb-4 text-grande font-medio text-ink">Preguntas frecuentes</Text>

        <Bloque
          titulo="¿De dónde salen las recomendaciones?"
          texto="De tablas y reglas deterministas, trazables a una fuente. Ninguna severidad, dosis ni interacción la decide un modelo de lenguaje: ante la misma entrada, la respuesta es siempre la misma."
        />
        <Bloque
          titulo="¿Por qué algunas fichas dicen «borrador»?"
          texto="Porque el contenido clínico todavía no fue validado por un farmacéutico. Se muestra igual: ocultar una alerta por falta de revisión sería peor que mostrarla marcada."
        />
        <Bloque
          titulo="¿Por qué no me muestra nada de ajuste hepático?"
          texto="Porque todavía no hay tabla de datos cargada. Ante la falta de dato el sistema dice que no sabe, nunca que no hay problema."
        />
        <Bloque
          titulo="¿Qué pasa si el paciente no tiene Clcr?"
          texto="El ajuste renal queda en neutro y se avisa. No se infiere una función renal normal."
          ultimo
        />
      </Pantalla>
    </View>
  );
}

function Bloque({ titulo, texto, ultimo }: { titulo: string; texto: string; ultimo?: boolean }) {
  const col = useColores();
  return (
    <Superficie
      elevacion="plana"
      className={`border p-4 ${ultimo ? '' : 'mb-3'}`}
      style={{ borderColor: col.line }}
    >
      <Text className="mb-1.5 text-body font-medio text-ink">{titulo}</Text>
      <Text className="font-sans text-meta leading-5 text-ink-suave">{texto}</Text>
    </Superficie>
  );
}
