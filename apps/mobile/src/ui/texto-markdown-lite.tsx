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
                // Un solo Text (viñeta + contenido), no un View flex-row con
                // dos Text separados — un Text con flex-1 dentro de una fila
                // puede NO ajustar línea en Android y cortar el contenido en
                // vez de pasar a la siguiente línea (bug real, visto en vivo:
                // el segundo ítem de una lista larga se cortaba a mitad de
                // oración aunque el texto llegara completo del backend).
                <Text key={j} className="text-body leading-5" style={{ color }}>
                  {'•  '}
                  <Runs runs={runs} />
                </Text>
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
