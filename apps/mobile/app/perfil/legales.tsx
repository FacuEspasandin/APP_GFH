import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { AvisoNeutro, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/**
 * Términos y privacidad (6.11 + 6.12), en una sola pantalla.
 *
 * Eran dos entradas del menú para dos documentos que se leen una vez y nunca
 * más: ocupaban dos de los doce lugares de Perfil. Juntos siguen siendo cortos
 * y se leen de corrido.
 */
export default function Legales() {
  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Términos y Privacidad" />
      <Pantalla>
        <Text className="mb-3 text-grande font-medio text-ink">Términos y condiciones</Text>

        <Bloque titulo="Uso de la herramienta">
          GFH es una herramienta de apoyo a la decisión clínica destinada a profesionales médicos.
          Las recomendaciones no sustituyen el juicio del médico tratante ni la ficha técnica del
          medicamento.
        </Bloque>

        <Bloque titulo="Responsabilidad">
          La decisión de prescribir, ajustar o suspender un tratamiento es siempre del profesional.
          GFH no practica medicina ni establece una relación médico-paciente.
        </Bloque>

        <Bloque titulo="Contenido clínico" ultimo>
          Parte del contenido está en revisión profesional y se muestra marcado como borrador.
        </Bloque>

        <AvisoNeutro>
          Texto preliminar. Los términos definitivos tienen que pasar por revisión legal antes del
          lanzamiento.
        </AvisoNeutro>

        <Text className="mb-3 mt-6 text-grande font-medio text-ink">Política de privacidad</Text>

        <Bloque titulo="Datos de pacientes">
          Los pacientes que cargás son tuyos: ningún otro médico puede verlos. El aislamiento se
          aplica en cada consulta a la base, no por convención.
        </Bloque>

        <Bloque titulo="Fotos de tratamiento">
          Cuando exista la carga por foto, la imagen se procesa en memoria y se descarta de
          inmediato. No se guarda ni la foto ni el texto extraído.
        </Bloque>

        <Bloque titulo="Marco legal" ultimo>
          Ley 18.331 de protección de datos personales, Decreto 396/003 y Ley 18.335 de derechos y
          deberes de los pacientes.
        </Bloque>

        <AvisoNeutro>
          Antes de cargar el primer paciente real hay que tener definidas la residencia de los datos,
          la política de backup —y que el backup se haya probado restaurar— y el registro ante la
          autoridad de datos personales.
        </AvisoNeutro>
      </Pantalla>
    </View>
  );
}

function Bloque({
  titulo,
  children,
  ultimo,
}: {
  titulo: string;
  children: ReactNode;
  ultimo?: boolean;
}) {
  const col = useColores();
  return (
    <Superficie
      elevacion="plana"
      className={`border p-4 ${ultimo ? 'mb-4' : 'mb-3'}`}
      style={{ borderColor: col.line }}
    >
      <Text className="mb-1.5 font-fuerte text-eyebrow uppercase tracking-wider text-ink-suave">
        {titulo}
      </Text>
      <Text className="font-sans text-body leading-6 text-ink">{children}</Text>
    </Superficie>
  );
}
