import { Text } from 'react-native';

import { AvisoNeutro, Pantalla } from '@/ui/kit';

/** Política de privacidad (6.12). Marco legal uruguayo. */
export default function Privacidad() {
  return (
    <Pantalla>
      <Text className="text-body font-fuerte text-ink">Datos de pacientes</Text>
      <Text className="font-sans mt-2 text-body leading-6 text-ink">
        Los pacientes que cargás son tuyos: ningún otro médico puede verlos. El aislamiento se
        aplica en cada consulta a la base, no por convención.
      </Text>

      <Text className="mt-5 text-body font-fuerte text-ink">Fotos de tratamiento</Text>
      <Text className="font-sans mt-2 text-body leading-6 text-ink">
        Cuando exista la carga por foto, la imagen se procesa en memoria y se descarta de inmediato.
        No se guarda ni la foto ni el texto extraído.
      </Text>

      <Text className="mt-5 text-body font-fuerte text-ink">Marco legal</Text>
      <Text className="font-sans mt-2 text-body leading-6 text-ink">
        Ley 18.331 de protección de datos personales, Decreto 396/003 y Ley 18.335 de derechos y
        deberes de los pacientes.
      </Text>

      <AvisoNeutro>
        Antes de cargar el primer paciente real hay que tener definidas la residencia de los datos,
        la política de backup —y que el backup se haya probado restaurar— y el registro ante la
        autoridad de datos personales.
      </AvisoNeutro>
    </Pantalla>
  );
}
