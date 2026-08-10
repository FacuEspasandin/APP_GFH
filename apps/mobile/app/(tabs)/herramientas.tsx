import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { AvisoNeutro, Eyebrow, FilaAccion, Pantalla } from '@/ui/kit';

/**
 * Menú de las 4 herramientas standalone (funcional §6.3).
 *
 * Usan los mismos motores que el cockpit pero sin paciente, y **no guardan
 * nada**: se pierden al salir de la pantalla. Está avisado en la propia
 * pantalla para que no sea una sorpresa.
 */
export default function Herramientas() {
  const router = useRouter();

  return (
    <Pantalla>
      <Eyebrow>Sin paciente</Eyebrow>
      <FilaAccion
        titulo="Interacción fármaco-fármaco"
        detalle="Todos los pares de una lista de fármacos"
        onPress={() => router.push('/herramientas/interacciones')}
      />
      <FilaAccion
        titulo="Condición y alergia"
        detalle="Un fármaco candidato contra condiciones y alergias"
        onPress={() => router.push('/herramientas/condicion-alergia')}
      />
      <FilaAccion
        titulo="Ajuste renal"
        detalle="Clcr directo, o calculado con Cockcroft-Gault"
        onPress={() => router.push('/herramientas/renal')}
      />
      <FilaAccion
        titulo="Ajuste hepático"
        detalle="Sin tabla de datos todavía"
        onPress={() => router.push('/herramientas/hepatico')}
      />

      <View className="mt-4">
        <AvisoNeutro>No se guarda nada. Al salir se pierde.</AvisoNeutro>
      </View>
    </Pantalla>
  );
}
