import { Text, View } from 'react-native';

import { esSubtitulo, parsearMarkdownLite, type RunTexto } from '@/dominio/markdown-lite';
import { useColores } from './tema';

function Runs({ runs }: { runs: RunTexto[] }) {
  return (
    <>
      {runs.map((r, i) => (
        <Text key={i} className={r.negrita ? 'font-fuerte' : undefined}>
          {r.texto}
        </Text>
      ))}
    </>
  );
}

/** Las respuestas de Vera — ver `dominio/markdown-lite.ts` para qué formatos
 *  soporta y por qué alcanza con eso (el backend le pide al modelo que no
 *  use nada más). */
export function TextoMarkdownLite({ texto, color }: { texto: string; color: string }) {
  const col = useColores();
  const bloques = parsearMarkdownLite(texto);

  return (
    <View className="gap-2">
      {bloques.map((bloque, i) => {
        if (bloque.tipo === 'lista') {
          return (
            <View key={i} className="gap-1">
              {bloque.items.map((runs, j) => (
                <View key={j} className="flex-row gap-1.5">
                  <Text className="text-body leading-5" style={{ color }}>
                    •
                  </Text>
                  <Text className="flex-1 text-body leading-5" style={{ color }}>
                    <Runs runs={runs} />
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        if (esSubtitulo(bloque)) {
          return (
            <Text key={i} className="font-fuerte text-body" style={{ color: col.primary }}>
              {bloque.runs[0]!.texto}
            </Text>
          );
        }

        return (
          <Text key={i} className="text-body leading-5" style={{ color }}>
            <Runs runs={bloque.runs} />
          </Text>
        );
      })}
    </View>
  );
}
