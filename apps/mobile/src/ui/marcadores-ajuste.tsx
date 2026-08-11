import { Text, View } from 'react-native';

/**
 * Los dos marcadores de propiedad de una fila del catálogo: R renal, H hepático.
 *
 * Antes eran dos etiquetas de texto completo debajo del nombre, y hacían que
 * una fila con las dos midiera 30px más que una sin ninguna: recorrer la lista
 * con la vista se volvía imposible porque nada quedaba alineado. Acá los dos
 * lugares existen SIEMPRE y el que no aplica queda vacío, así la columna de la
 * derecha es una grilla y no un texto que fluye.
 *
 * El celeste marca una PROPIEDAD del fármaco —"tiene tabla de ajuste"—, nunca
 * gravedad. Es el único uso legítimo de este color en el sistema: los de
 * severidad significan otra cosa y no se pueden gastar acá.
 */
const CELESTE_FONDO = '#E0F2FE';
const CELESTE_TEXTO = '#075985';

export function MarcadoresAjuste({ renal, hepatico }: { renal: boolean; hepatico: boolean }) {
  return (
    <View
      className="flex-row"
      style={{ gap: 4 }}
      accessibilityLabel={etiquetaAccesible(renal, hepatico)}
    >
      <Marcador letra="R" activo={renal} />
      <Marcador letra="H" activo={hepatico} />
    </View>
  );
}

function Marcador({ letra, activo }: { letra: string; activo: boolean }) {
  return (
    <View
      className="items-center justify-center rounded"
      style={{
        width: 22,
        height: 22,
        backgroundColor: activo ? CELESTE_FONDO : 'transparent',
      }}
    >
      {activo ? (
        <Text className="font-mono-fuerte" style={{ fontSize: 11, color: CELESTE_TEXTO }}>
          {letra}
        </Text>
      ) : null}
    </View>
  );
}

/** Una R y una H sueltas no se leen en voz alta: para el lector de pantalla va
 *  el texto completo, o nada si el fármaco no tiene ninguna de las dos. */
function etiquetaAccesible(renal: boolean, hepatico: boolean): string | undefined {
  const partes = [renal ? 'ajuste renal' : null, hepatico ? 'ajuste hepático' : null].filter(
    Boolean,
  );
  return partes.length > 0 ? `Tiene ${partes.join(' y ')}` : undefined;
}
