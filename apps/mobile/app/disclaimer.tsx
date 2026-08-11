import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { api } from '@/api/cliente';
import { Icono } from '@/ui/iconos';
import { Boton } from '@/ui/kit';
import { useColores } from '@/ui/tema';

const VERSION_DISCLAIMER = '1.0';

/**
 * Disclaimer de primer ingreso (1.8). Regla no negociable 7: checkbox
 * obligatorio, no se puede saltear.
 *
 * La aceptación se persiste con su VERSIÓN: cuando el texto cambie, hay que
 * poder volver a pedirlo, y hay que poder probar qué aceptó cada médico.
 */
export default function DisclaimerPrimerIngreso() {
  const col = useColores();

  const router = useRouter();
  const [aceptado, setAceptado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const continuar = async () => {
    setEnviando(true);
    try {
      await api.post('/auth/disclaimer', { version: VERSION_DISCLAIMER });
      router.replace('/(tabs)');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View className="flex-1 bg-paper pt-16">
      <Text className="px-6 text-grande font-fuerte text-ink">Antes de empezar</Text>

      <ScrollView className="mt-4 flex-1" contentContainerClassName="px-6 pb-4">
        <Text className="font-sans text-body leading-6 text-ink">
          GFH es una <Text className="font-fuerte">herramienta de apoyo a la decisión clínica</Text>.
          Las recomendaciones que muestra no sustituyen el juicio del médico tratante.
        </Text>
        <Text className="font-sans mt-3 text-body leading-6 text-ink">
          Verificá siempre las dosis contra la ficha técnica del medicamento y considerá las
          características individuales del paciente: función hepática, edad, comorbilidades y
          terapia concomitante.
        </Text>
        <Text className="font-sans mt-3 text-body leading-6 text-ink">
          El contenido clínico está en revisión profesional. Las fichas marcadas como borrador no
          fueron validadas por un farmacéutico.
        </Text>
      </ScrollView>

      <View className="border-t border-line bg-surface px-6 pb-8 pt-4">
      <Pressable
        onPress={() => setAceptado((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: aceptado }}
        className="mb-4 flex-row items-start gap-3"
      >
        <View
          className="mt-0.5 h-5 w-5 items-center justify-center rounded-[5px] border-2"
          style={{
            borderColor: aceptado ? col.primary : col.tenue,
            backgroundColor: aceptado ? col.primary : 'transparent',
          }}
        >
          {aceptado ? <Icono nombre="check" tamano={14} color="#FFFFFF" /> : null}
        </View>
        <Text className="font-sans flex-1 text-body leading-5 text-ink">
          Entiendo y acepto que esta herramienta no reemplaza mi criterio clínico.
        </Text>
      </Pressable>

      <Boton onPress={continuar} deshabilitado={!aceptado} cargando={enviando}>
        Continuar
      </Boton>
      </View>
    </View>
  );
}
