import * as Linking from 'expo-linking';
import { Text, View } from 'react-native';

import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Boton, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { COLOR_SEVERIDAD } from '@gfh/shared-types';

/** A dónde escribir mientras el restablecimiento sea manual. */
const SOPORTE = 'info@gfh.com';

/**
 * Recuperar contraseña (1.5 / 1.6).
 *
 * El backend todavía no tiene el flujo: falta el proveedor de email y el token
 * de un solo uso.
 *
 * Antes esta pantalla tenía un campo y un botón "Enviar enlace", y el aviso de
 * que no estaba conectado aparecía DESPUÉS de tocarlo — durante unos segundos
 * el médico creía que le iba a llegar un mail. Un formulario que no envía nada
 * es peor que no tener formulario: acá se dice primero y se ofrece la vía que
 * sí funciona.
 */
export default function Recuperar() {
  const escribir = () => {
    const asunto = encodeURIComponent('Restablecer contraseña de GFH');
    void Linking.openURL(`mailto:${SOPORTE}?subject=${asunto}`);
  };

  return (
    <Pantalla>
      <Superficie elevacion="plana" className="mb-3.5 px-3.5 py-3.5">
        <View className="flex-row items-center">
          <View
            className="mr-2.5 rounded-full"
            style={{ width: 10, height: 10, backgroundColor: COLOR_SEVERIDAD.neutro }}
          />
          <Text className="flex-1 text-fila font-fuerte text-ink">Todavía no es automático</Text>
        </View>
        <Text className="font-sans mt-1.5 text-meta leading-5 text-ink-suave">
          El envío de emails no está conectado: falta el proveedor y el token de un solo uso. No hay
          forma de mandarte un enlace todavía.
        </Text>
      </Superficie>

      <BloqueFormulario titulo="Mientras tanto">
        <Text className="font-sans text-meta leading-5 text-ink-suave">
          Escribinos desde el email de tu cuenta y te la restablecemos a mano.
        </Text>
        <Text className="font-mono-fuerte mt-2.5 text-body text-ink">{SOPORTE}</Text>
      </BloqueFormulario>

      <BloqueFormulario titulo="Cuando esté conectado">
        <Text className="font-sans text-meta leading-5 text-ink-suave">
          Esta pantalla va a pedirte el email y mandarte un enlace de un solo uso.
        </Text>
      </BloqueFormulario>

      <Boton onPress={escribir}>Escribir a soporte</Boton>
    </Pantalla>
  );
}
