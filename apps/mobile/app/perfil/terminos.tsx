import { Text } from 'react-native';

import { AvisoNeutro, Pantalla } from '@/ui/kit';

/** Términos y condiciones (6.11). Texto pendiente de redacción legal. */
export default function Terminos() {
  return (
    <Pantalla>
      <Text className="text-body font-fuerte text-ink">Uso de la herramienta</Text>
      <Text className="font-sans mt-2 text-body leading-6 text-ink">
        GFH es una herramienta de apoyo a la decisión clínica destinada a profesionales médicos. Las
        recomendaciones no sustituyen el juicio del médico tratante ni la ficha técnica del
        medicamento.
      </Text>

      <Text className="mt-5 text-body font-fuerte text-ink">Responsabilidad</Text>
      <Text className="font-sans mt-2 text-body leading-6 text-ink">
        La decisión de prescribir, ajustar o suspender un tratamiento es siempre del profesional.
        GFH no practica medicina ni establece una relación médico-paciente.
      </Text>

      <Text className="mt-5 text-body font-fuerte text-ink">Contenido clínico</Text>
      <Text className="font-sans mt-2 text-body leading-6 text-ink">
        Parte del contenido está en revisión profesional y se muestra marcado como borrador.
      </Text>

      <AvisoNeutro>
        Texto preliminar. Los términos definitivos tienen que pasar por revisión legal antes del
        lanzamiento.
      </AvisoNeutro>
    </Pantalla>
  );
}
