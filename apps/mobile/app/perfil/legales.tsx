import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Eyebrow, Pantalla } from '@/ui/kit';
import { GrupoOpciones, Opcion } from '@/ui/lista-opciones';
import { VIGENTE_DESDE } from '@gfh/shared-types';

/**
 * Términos, privacidad y metodología (6.11 + 6.12).
 *
 * Es el índice: cada documento se lee completo en su propia pantalla
 * (`legal.tsx`). Antes eran tres bloques cortos acá mismo con un cartel de
 * «texto preliminar»; ahora son los documentos definitivos, los mismos que se
 * publican en la web y se cargan en App Store Connect.
 */
export default function Legales() {
  const router = useRouter();
  const abrir = (clave: string) => router.push(`/legal?clave=${clave}` as never);

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Términos y Privacidad" />
      <Pantalla>
        <Eyebrow>Documentos</Eyebrow>
        <GrupoOpciones>
          <Opcion
            primera
            icono="documento"
            titulo="Términos y condiciones"
            onPress={() => abrir('terminos')}
          />
          <Opcion
            icono="candado"
            titulo="Política de privacidad"
            onPress={() => abrir('privacidad')}
          />
          <Opcion
            icono="info"
            titulo="Metodología y fuentes"
            onPress={() => abrir('metodologia')}
          />
        </GrupoOpciones>

        <Eyebrow>Tus datos</Eyebrow>
        <GrupoOpciones>
          <Opcion
            primera
            icono="usuario"
            titulo="Privacidad y datos"
            onPress={() => router.push('/perfil/privacidad' as never)}
          />
        </GrupoOpciones>

        <Text className="font-mono mt-2 text-center text-eyebrow text-tenue">
          Vigentes desde {VIGENTE_DESDE}
        </Text>
      </Pantalla>
    </View>
  );
}
