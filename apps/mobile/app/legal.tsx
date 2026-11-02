import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { DocumentoLegalVista } from '@/ui/documento-legal';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { Pantalla } from '@/ui/kit';
import { DOCUMENTOS_LEGALES } from '@gfh/shared-types';

/**
 * Un documento legal completo: términos, política de privacidad o metodología.
 *
 * Una sola pantalla para los tres, elegida por `?clave=`. Los textos son los de
 * `shared-types`, los mismos que se publican en la web; acá no hay ninguno
 * escrito a mano.
 */
export default function Documento() {
  const { clave } = useLocalSearchParams<{ clave?: string }>();
  const documento = DOCUMENTOS_LEGALES.find((d) => d.clave === clave) ?? DOCUMENTOS_LEGALES[0]!;

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo={documento.titulo} />
      <Pantalla>
        <DocumentoLegalVista documento={documento} />
      </Pantalla>
    </View>
  );
}
