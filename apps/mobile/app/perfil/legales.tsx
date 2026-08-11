import { Text, View } from 'react-native';

import { BloqueFormulario } from '@/ui/bloque-formulario';
import { AvisoNeutro, Eyebrow, Pantalla } from '@/ui/kit';

/**
 * Términos y privacidad (6.11 + 6.12), en una sola pantalla.
 *
 * Eran dos entradas del menú para dos documentos que se leen una vez y nunca
 * más: ocupaban dos de los doce lugares de Perfil. Juntos siguen siendo cortos
 * y se leen de corrido.
 */
export default function Legales() {
  return (
    <Pantalla>
      <Eyebrow>Términos y condiciones</Eyebrow>

      <BloqueFormulario titulo="Uso de la herramienta">
        <Parrafo>
          GFH es una herramienta de apoyo a la decisión clínica destinada a profesionales médicos.
          Las recomendaciones no sustituyen el juicio del médico tratante ni la ficha técnica del
          medicamento.
        </Parrafo>
      </BloqueFormulario>

      <BloqueFormulario titulo="Responsabilidad">
        <Parrafo>
          La decisión de prescribir, ajustar o suspender un tratamiento es siempre del profesional.
          GFH no practica medicina ni establece una relación médico-paciente.
        </Parrafo>
      </BloqueFormulario>

      <BloqueFormulario titulo="Contenido clínico">
        <Parrafo>
          Parte del contenido está en revisión profesional y se muestra marcado como borrador.
        </Parrafo>
      </BloqueFormulario>

      <AvisoNeutro>
        Texto preliminar. Los términos definitivos tienen que pasar por revisión legal antes del
        lanzamiento.
      </AvisoNeutro>

      <View className="mt-5" />
      <Eyebrow>Política de privacidad</Eyebrow>

      <BloqueFormulario titulo="Datos de pacientes">
        <Parrafo>
          Los pacientes que cargás son tuyos: ningún otro médico puede verlos. El aislamiento se
          aplica en cada consulta a la base, no por convención.
        </Parrafo>
      </BloqueFormulario>

      <BloqueFormulario titulo="Fotos de tratamiento">
        <Parrafo>
          Cuando exista la carga por foto, la imagen se procesa en memoria y se descarta de
          inmediato. No se guarda ni la foto ni el texto extraído.
        </Parrafo>
      </BloqueFormulario>

      <BloqueFormulario titulo="Marco legal">
        <Parrafo>
          Ley 18.331 de protección de datos personales, Decreto 396/003 y Ley 18.335 de derechos y
          deberes de los pacientes.
        </Parrafo>
      </BloqueFormulario>

      <AvisoNeutro>
        Antes de cargar el primer paciente real hay que tener definidas la residencia de los datos,
        la política de backup —y que el backup se haya probado restaurar— y el registro ante la
        autoridad de datos personales.
      </AvisoNeutro>
    </Pantalla>
  );
}

function Parrafo({ children }: { children: string }) {
  return <Text className="font-sans text-body leading-6 text-ink">{children}</Text>;
}
