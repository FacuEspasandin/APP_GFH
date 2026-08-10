import { Text } from 'react-native';

import { Card, Eyebrow, Pantalla } from '@/ui/kit';

/** Ayuda y soporte (6.10). */
export default function Ayuda() {
  return (
    <Pantalla>
      <Eyebrow>Preguntas frecuentes</Eyebrow>

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
      />
    </Pantalla>
  );
}

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <Card className="mb-2.5 px-3.5 py-3">
      <Text className="text-body font-medio text-ink">{titulo}</Text>
      <Text className="font-sans mt-1.5 text-meta leading-5 text-ink-suave">{texto}</Text>
    </Card>
  );
}
