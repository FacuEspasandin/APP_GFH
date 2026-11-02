import { Linking, Pressable, Text, View } from 'react-native';

import { Icono } from './iconos';
import { Superficie } from './superficie';
import { useColores } from './tema';
import { VIGENTE_DESDE, urlPublica, type DocumentoLegal } from '@gfh/shared-types';

/**
 * Un documento legal, de corrido: las secciones en orden, cada una con sus
 * párrafos, su lista y su cierre.
 *
 * Los textos vienen de `shared-types` (`legal-documentos.ts`) y no se escriben
 * acá: son los mismos que se publican en la web y que se cargan en App Store
 * Connect, y tienen que seguir siendo uno solo.
 */
export function DocumentoLegalVista({ documento }: { documento: DocumentoLegal }) {
  const col = useColores();
  const publica = urlPublica(documento.clave);

  return (
    <View>
      <Text className="text-titular font-extra text-ink">{documento.titulo}</Text>
      <Text className="font-sans mb-1 mt-1.5 text-meta leading-5 text-ink-suave">
        {documento.resumen}
      </Text>
      <Text className="font-mono mb-4 text-eyebrow text-tenue">Vigente desde {VIGENTE_DESDE}</Text>

      {documento.secciones.map((s) => (
        <Superficie
          key={s.titulo}
          elevacion="plana"
          className="mb-3 border p-4"
          style={{ borderColor: col.line }}
        >
          <Text className="mb-2 text-body font-fuerte text-ink">{s.titulo}</Text>

          {s.parrafos?.map((p) => (
            <Text key={p} className="font-sans mb-2 text-meta leading-5 text-ink">
              {p}
            </Text>
          ))}

          {s.items?.map((i) => (
            <View key={i} className="mb-1.5 flex-row gap-2">
              <Text className="font-sans text-meta leading-5 text-ink-suave">•</Text>
              <Text className="font-sans flex-1 text-meta leading-5 text-ink">{i}</Text>
            </View>
          ))}

          {s.cierre?.map((p) => (
            <Text key={p} className="font-sans mt-1 text-meta leading-5 text-ink">
              {p}
            </Text>
          ))}
        </Superficie>
      ))}

      {/* Sólo cuando ya existe el dominio: un enlace que no lleva a ningún lado
          es peor que ninguno. Mientras tanto el texto completo está arriba. */}
      {publica ? (
        <Pressable
          onPress={() => void Linking.openURL(publica)}
          accessibilityRole="link"
          className="mt-1 flex-row items-center gap-2 py-2"
        >
          <Icono nombre="documento" tamano={16} color={col.accent} />
          <Text className="font-medio text-meta text-accent">Ver en la web</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
