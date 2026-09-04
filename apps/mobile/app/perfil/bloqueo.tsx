import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { activarBloqueo, biometriaDisponible, bloqueoActivo, pedirHuella } from '@/api/bloqueo';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { hapticaSeleccion } from '@/ui/haptica';
import { Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/**
 * Bloqueo con huella (6.x).
 *
 * Prenderlo pide la huella una vez: si el sensor no responde acá, tampoco va a
 * responder al abrir la app, y es mejor descubrirlo con la sesión abierta que
 * con la app trabada.
 */
export default function BloqueoPantalla() {
  const col = useColores();
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setDisponible(await biometriaDisponible());
      setActivo(await bloqueoActivo());
    })();
  }, []);

  const cambiar = async (quiere: boolean) => {
    setError(null);
    hapticaSeleccion();

    if (quiere) {
      // Se comprueba ANTES de guardar: prender el bloqueo y descubrir después
      // que el lector no anda deja la app cerrada con llave y sin llave.
      const paso = await pedirHuella();
      if (!paso) {
        setError('No se pudo verificar. El bloqueo queda apagado.');
        return;
      }
    }

    await activarBloqueo(quiere);
    setActivo(quiere);
  };

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Bloqueo con huella" />
      <Pantalla>
        <Text className="mb-4 font-sans text-meta leading-5 text-ink-suave">
          Pide tu huella o tu cara cada vez que abrís la app. La sesión sigue
          abierta como hasta ahora: esto es una puerta más, para que el teléfono
          sobre un escritorio no muestre la medicación de un paciente.
        </Text>

        <Superficie elevacion="plana" className="border p-2" style={{ borderColor: col.line }}>
          <View className="flex-row items-center justify-between rounded-input px-3 py-3.5">
            <View className="flex-1 pr-3">
              <Text className="text-body font-medio text-ink">Pedir huella al abrir</Text>
              <Text className="font-sans mt-0.5 text-meta leading-5 text-ink-suave">
                {disponible === false
                  ? 'Este teléfono no tiene huella ni cara registradas.'
                  : 'Si la huella falla, siempre podés entrar con tu contraseña.'}
              </Text>
            </View>
            <Switch
              value={activo}
              onValueChange={(v) => void cambiar(v)}
              disabled={disponible !== true}
              accessibilityLabel="Pedir huella al abrir la app"
            />
          </View>
        </Superficie>

        {error ? (
          <Text className="font-sans mt-3 text-meta" style={{ color: col.peligro }}>
            {error}
          </Text>
        ) : null}

        {disponible === false ? (
          <Text className="font-sans mt-3 text-meta leading-5 text-ink-suave">
            Registrá una huella o el reconocimiento facial en la configuración
            del teléfono y volvé acá.
          </Text>
        ) : null}
      </Pantalla>
    </View>
  );
}
