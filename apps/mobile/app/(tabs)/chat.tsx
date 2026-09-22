import { useMutation } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import * as API from '@/api/endpoints';
import { ErrorApi } from '@/api/cliente';
import { chipsDeFuente, type ChipFuente } from '@/dominio/chat';
import { EncabezadoApp } from '@/ui/encabezado-app';
import { Icono } from '@/ui/iconos';
import { useColores } from '@/ui/tema';
import { TextoMarkdownLite } from '@/ui/texto-markdown-lite';

interface MensajeChat {
  id: string;
  rol: 'usuario' | 'asistente';
  contenido: string;
  chips?: ChipFuente[];
}

let contadorId = 0;
function idLocal(): string {
  contadorId += 1;
  return `local-${contadorId}`;
}

/**
 * Vera — chat con IA (§ plan `toasty-dancing-swing`).
 *
 * Sin streaming en v1: se manda la pregunta completa y se espera la
 * respuesta completa, con un estado "pensando…" mientras corre el loop de
 * tool-use del backend. El hilo vive sólo en memoria de esta pantalla — no
 * hay pantalla de "conversaciones anteriores" todavía; `sessionId` se
 * conserva mientras la pantalla sigue montada para que el backend mantenga
 * contexto entre mensajes de una misma visita.
 */
export default function ChatIa() {
  const col = useColores();
  const scrollRef = useRef<ScrollView>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const enviar = useMutation({
    mutationFn: (pregunta: string) => API.enviarMensajeChat({ sessionId, pregunta }),
    onSuccess: (respuesta) => {
      setSessionId(respuesta.sessionId);
      setMensajes((m) => [
        ...m,
        {
          id: idLocal(),
          rol: 'asistente',
          contenido: respuesta.respuesta,
          chips: chipsDeFuente(respuesta.toolsUsadas),
        },
      ]);
    },
    // Un mensaje que no llegó no puede desaparecer sin explicación — se
    // muestra como si Vera hubiera contestado que no pudo, en vez de dejar
    // el "pensando…" colgado o perder la pregunta ya enviada.
    onError: (error) => {
      setMensajes((m) => [
        ...m,
        {
          id: idLocal(),
          rol: 'asistente',
          contenido:
            error instanceof ErrorApi
              ? error.message
              : 'No pude responder. Probá de nuevo en un momento.',
        },
      ]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [mensajes.length, enviar.isPending]);

  const mandar = () => {
    const pregunta = texto.trim();
    if (!pregunta || enviar.isPending) return;
    setMensajes((m) => [...m, { id: idLocal(), rol: 'usuario', contenido: pregunta }]);
    setTexto('');
    enviar.mutate(pregunta);
  };

  const hayHilo = mensajes.length > 0 || enviar.isPending;

  return (
    <View className="flex-1 bg-paper">
      <Stack.Screen options={{ headerShown: false }} />
      <EncabezadoApp ocultarVolver />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 px-4 pt-3">
          <Text className="mb-2 text-[32px] font-fuerte" style={{ color: '#005228' }}>
            Vera
          </Text>

          {!hayHilo ? (
            <View className="flex-1 items-center justify-center px-6">
              <Icono nombre="chat" tamano={32} color={col.tenue} />
              <Text className="mt-3 text-center text-body font-medio text-ink">
                Preguntale a Vera sobre interacciones, ajustes o fichas técnicas
              </Text>
              <Text className="mt-1 text-center text-meta leading-5 text-ink-suave">
                Responde apoyándose en la base propia de GFH — nunca de memoria.
              </Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              contentContainerClassName="gap-2.5 pb-4"
              keyboardShouldPersistTaps="handled"
            >
              {mensajes.map((m) => (
                <BurbujaMensaje key={m.id} mensaje={m} />
              ))}
              {enviar.isPending ? (
                <View
                  className="mr-auto rounded-card rounded-bl-[3px] border px-3.5 py-3"
                  style={{ backgroundColor: col.surface, borderColor: col.line }}
                >
                  <ActivityIndicator size="small" color={col.tenue} />
                </View>
              ) : null}
            </ScrollView>
          )}

          <View
            className="mb-2 mt-2 flex-row items-end gap-2 rounded-full border px-3.5 py-1.5"
            style={{ backgroundColor: col.surface, borderColor: col.line }}
          >
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Escribí tu pregunta…"
              placeholderTextColor={col.tenue}
              className="flex-1 py-1.5 text-body text-ink"
              style={{ maxHeight: 100 }}
              multiline
              editable={!enviar.isPending}
              accessibilityLabel="Mensaje para Vera"
            />
            <Pressable
              onPress={mandar}
              disabled={!texto.trim() || enviar.isPending}
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              className="mb-1 h-8 w-8 items-center justify-center rounded-full"
              style={{
                backgroundColor: col.primary,
                opacity: !texto.trim() || enviar.isPending ? 0.5 : 1,
              }}
            >
              <Icono nombre="enviar" tamano={15} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function BurbujaMensaje({ mensaje }: { mensaje: MensajeChat }) {
  const col = useColores();
  const esUsuario = mensaje.rol === 'usuario';

  return (
    <View className={esUsuario ? 'ml-auto max-w-[85%]' : 'mr-auto max-w-[90%]'}>
      <View
        className={
          esUsuario
            ? 'rounded-card rounded-br-[3px] px-3.5 py-2.5'
            : 'rounded-card rounded-bl-[3px] border px-3.5 py-2.5'
        }
        style={{
          backgroundColor: esUsuario ? col.primary : col.surface,
          borderColor: esUsuario ? undefined : col.line,
        }}
      >
        {esUsuario ? (
          <Text className="text-body leading-5 text-white">{mensaje.contenido}</Text>
        ) : (
          <TextoMarkdownLite texto={mensaje.contenido} color={col.ink} />
        )}
      </View>

      {mensaje.chips && mensaje.chips.length > 0 ? (
        <View className="mt-1.5 flex-row flex-wrap gap-1.5">
          {mensaje.chips.map((chip) => (
            <View
              key={chip.etiqueta}
              className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
              style={{ backgroundColor: col.primaryLight }}
            >
              <Icono nombre={chip.icono} tamano={11} color={col.primary} />
              <Text className="text-eyebrow font-fuerte" style={{ color: col.primary }}>
                {chip.etiqueta}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
