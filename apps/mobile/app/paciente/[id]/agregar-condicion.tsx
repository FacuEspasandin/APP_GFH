import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import * as API from '@/api/endpoints';
import { buscar } from '@/dominio/busqueda';
import { CampoFecha } from '@/ui/campo-fecha';
import { aISO, validarFecha } from '@/ui/fecha';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { Boton, CampoTexto, Chip, Pantalla } from '@/ui/kit';

/** Agregar condición clínica (3.4.1). */
export default function AgregarCondicion() {
  const { id: pacienteId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [elegida, setElegida] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  /** Opcional y vacío por defecto: la mayoría de las condiciones se cargan sin
   *  saber la fecha, y un campo obligatorio ahí frenaría el alta. */
  const [fecha, setFecha] = useState('');

  const vf = validarFecha(fecha);
  const fechaDiagnostico = vf.valida && vf.fecha ? aISO(vf.fecha) : undefined;
  // Sin pausa: la lista ya está en memoria y `buscar` normaliza sola.
  const filtro = texto.trim();

  const { data } = useQuery({ queryKey: ['cond'], queryFn: API.condiciones });

  const agregar = useMutation({
    mutationFn: () =>
      API.agregarCondicion(pacienteId, {
        condicionClinicaId: elegida,
        ...(fechaDiagnostico ? { fechaDiagnostico } : {}),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['cockpit', pacienteId] });
      router.back();
    },
  });

  // Las sintéticas se derivan de datos del paciente, no se cargan a mano.
  const SINTETICAS = ['ADULTO_MAYOR', 'EMBARAZO', 'LACTANCIA'];
  const cargables = data?.filter((c) => !SINTETICAS.includes(c.codigo)) ?? [];

  // Con el catálogo entero volcado como chips, encontrar una era leerlas
  // todas. El buscador aparece recién cuando hay suficientes para perderse.
  //
  // Filtra desde la primera letra y con el mismo motor que el resto de la app:
  // ordena por las que empiezan con lo escrito, ignora tildes y encuentra por
  // la descripción además del nombre.
  const visibles = buscar(cargables, filtro, {
    nombre: (c) => c.nombre,
    tambien: (c) => [c.descripcion ?? ''],
  });

  return (
    <Pantalla>
      <BloqueFormulario titulo="Condición" exigencia="Obligatorio">
        {cargables.length > 10 ? (
          <CampoTexto
            value={texto}
            onChangeText={setTexto}
            placeholder="Buscar condición"
            autoCapitalize="none"
          />
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          {visibles.map((c) => (
            <Chip
              key={c.id}
              texto={c.nombre}
              activo={elegida === c.id}
              onPress={() => setElegida(c.id)}
            />
          ))}
        </View>

        {visibles.length === 0 ? (
          <Text className="font-sans text-meta text-ink-suave">
            Sin coincidencias para el texto buscado.
          </Text>
        ) : null}
      </BloqueFormulario>

      {/* Aparece recién con una condición elegida: sin eso es un campo que no
          se sabe de qué habla. */}
      {elegida ? (
        <BloqueFormulario titulo="Desde cuándo" etiqueta="Opcional">
          <CampoFecha etiqueta="Fecha de diagnóstico" valor={fecha} onChange={setFecha} />
          <Text className="font-sans -mt-2 text-meta leading-5 text-ink-suave">
            {/* Que no entre en el motor hay que decirlo: si no, el médico puede
                suponer que cargarla cambia lo que la app verifica. */}
            No cambia las verificaciones — el motor sólo mira si la condición está.
            Queda como contexto en la ficha.
          </Text>
        </BloqueFormulario>
      ) : null}

      <BloqueFormulario titulo="Las que no se cargan">
        <Text className="font-sans text-meta leading-5 text-ink-suave">
          Adulto mayor, embarazo y lactancia se derivan solos de los datos del paciente: aparecen y
          desaparecen con la edad y la semana de gestación, no se agregan a mano.
        </Text>
      </BloqueFormulario>

      <Boton onPress={() => agregar.mutate()} cargando={agregar.isPending} deshabilitado={!elegida}>
        Agregar condición
      </Boton>
    </Pantalla>
  );
}
