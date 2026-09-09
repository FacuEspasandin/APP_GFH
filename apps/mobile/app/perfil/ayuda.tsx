import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { Linking, Pressable, Text, View, type TextInputProps } from 'react-native';
import { z } from 'zod';

import { ErrorApi } from '@/api/cliente';
import * as API from '@/api/endpoints';
import type { CategoriaProblema } from '@/api/tipos';
import { CATEGORIAS_PROBLEMA, filtrarPorCategoria, NOMBRE_CATEGORIA_PROBLEMA } from '@/dominio/ayuda';
import { buscar } from '@/dominio/busqueda';
import { useAviso } from '@/ui/aviso';
import { EncabezadoConTitulo } from '@/ui/encabezado-app';
import { ErrorGenerico, SinConexion, SkeletonLista } from '@/ui/estados-sistema';
import { Icono } from '@/ui/iconos';
import { Boton, CampoTexto, Chip, Estado, Pantalla } from '@/ui/kit';
import { Superficie } from '@/ui/superficie';
import { useColores } from '@/ui/tema';

/** El email real de soporte — no el `soporte@gfh.app` del wireframe viejo. */
const SOPORTE = 'info@gfh.com';

const esquema = z.object({
  nombre: z.string().min(1, 'Ingresá tu nombre.'),
  apellido: z.string().min(1, 'Ingresá tu apellido.'),
  telefono: z.string().min(1, 'Ingresá tu teléfono.'),
  correo: z.string().email('Ingresá un correo válido.'),
  descripcion: z.string().min(1, 'Describí lo ocurrido.'),
});
type Campos = z.infer<typeof esquema>;

/**
 * Ayuda y soporte (6.10): preguntas frecuentes, solución de problemas
 * comunes con buscador y filtro por categoría, y formulario de reporte.
 *
 * FAQ y problemas se sirven desde el backend (`/ayuda/faq`,
 * `/ayuda/problemas`) y no viven en el bundle: cambiar una pregunta es
 * editar `docs/data/` y redeployar, sin build nuevo de la app.
 */
export default function Ayuda() {
  const col = useColores();
  const { avisar } = useAviso();

  const faqQuery = useQuery({ queryKey: ['ayuda', 'faq'], queryFn: API.ayudaFaq });
  const problemasQuery = useQuery({ queryKey: ['ayuda', 'problemas'], queryFn: API.ayudaProblemas });

  const [abierta, setAbierta] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<CategoriaProblema | null>(null);
  const [tipo, setTipo] = useState<'ERROR' | 'SUGERENCIA'>('ERROR');
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: '', apellido: '', telefono: '', correo: '', descripcion: '' },
  });

  const problemasVisibles = useMemo(() => {
    const filtrados = filtrarPorCategoria(problemasQuery.data ?? [], categoria);
    return buscar(filtrados, busqueda, {
      nombre: (p) => p.titulo,
      tambien: (p) => [p.descripcion],
    });
  }, [problemasQuery.data, categoria, busqueda]);

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    try {
      await API.reportarProblema({ ...datos, tipo });
      reset();
      setTipo('ERROR');
      avisar('Gracias — recibimos tu reporte.');
    } catch (e) {
      setErrorServidor(e instanceof Error ? e.message : 'No se pudo enviar el reporte.');
    }
  });

  const reintentar = () => {
    void faqQuery.refetch();
    void problemasQuery.refetch();
  };

  if (faqQuery.isLoading || problemasQuery.isLoading) {
    return (
      <View className="flex-1 bg-paper">
        <EncabezadoConTitulo titulo="Ayuda y Soporte" />
        <SkeletonLista />
      </View>
    );
  }

  const errorCarga = faqQuery.error ?? problemasQuery.error;
  if (errorCarga) {
    return (
      <View className="flex-1 bg-paper">
        <EncabezadoConTitulo titulo="Ayuda y Soporte" />
        {errorCarga instanceof ErrorApi && errorCarga.esSinConexion ? (
          <SinConexion onReintentar={reintentar} />
        ) : (
          <ErrorGenerico onReintentar={reintentar} />
        )}
      </View>
    );
  }

  const faq = faqQuery.data ?? [];
  const problemas = problemasQuery.data ?? [];

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoConTitulo titulo="Ayuda y Soporte" />
      <Pantalla>
        <Text className="mb-3 text-grande font-medio text-ink">Preguntas frecuentes</Text>
        {faq.map((item) => (
          <PreguntaAcordeon
            key={item.pregunta}
            pregunta={item.pregunta}
            respuesta={item.respuesta}
            abierta={abierta === item.pregunta}
            onPress={() => setAbierta(abierta === item.pregunta ? null : item.pregunta)}
          />
        ))}

        <Text className="mb-3 mt-6 text-grande font-medio text-ink">
          Solución de problemas frecuentes
        </Text>
        <CampoTexto
          placeholder="Buscar por palabra clave"
          value={busqueda}
          onChangeText={setBusqueda}
          autoCapitalize="none"
        />
        <View className="mb-1 flex-row flex-wrap gap-2">
          <Chip texto="Todos" activo={categoria === null} onPress={() => setCategoria(null)} />
          {CATEGORIAS_PROBLEMA.map((c) => (
            <Chip
              key={c}
              texto={NOMBRE_CATEGORIA_PROBLEMA[c]}
              activo={categoria === c}
              onPress={() => setCategoria(categoria === c ? null : c)}
            />
          ))}
        </View>

        {problemas.length > 0 && problemasVisibles.length === 0 ? (
          <Estado
            titulo="No se encontraron resultados"
            detalle="Intente con otra palabra clave, o comunique el inconveniente mediante el formulario disponible a continuación."
          />
        ) : (
          problemasVisibles.map((p) => (
            <Superficie
              key={p.titulo}
              elevacion="plana"
              className="mb-3 border p-4"
              style={{ borderColor: col.line }}
            >
              <Text
                className="mb-1 text-eyebrow font-fuerte uppercase tracking-wider"
                style={{ color: col.accent }}
              >
                {NOMBRE_CATEGORIA_PROBLEMA[p.categoria]}
              </Text>
              <Text className="mb-1.5 text-body font-medio text-ink">{p.titulo}</Text>
              <Text className="font-sans text-meta leading-5 text-ink-suave">{p.descripcion}</Text>
            </Superficie>
          ))
        )}

        <Text className="mb-3 mt-6 text-grande font-medio text-ink">
          Reportar un error o sugerencia
        </Text>
        <Superficie elevacion="plana" className="mb-4 border p-4" style={{ borderColor: col.line }}>
          <View className="mb-3 flex-row gap-2">
            <Chip
              texto="Reportar un error"
              activo={tipo === 'ERROR'}
              onPress={() => setTipo('ERROR')}
            />
            <Chip
              texto="Enviar una sugerencia"
              activo={tipo === 'SUGERENCIA'}
              onPress={() => setTipo('SUGERENCIA')}
            />
          </View>

          <CampoControlado control={control} nombre="nombre" etiqueta="Nombre" error={errors.nombre?.message} />
          <CampoControlado
            control={control}
            nombre="apellido"
            etiqueta="Apellido"
            error={errors.apellido?.message}
          />
          <CampoControlado
            control={control}
            nombre="telefono"
            etiqueta="Teléfono"
            error={errors.telefono?.message}
            teclado="phone-pad"
          />
          <CampoControlado
            control={control}
            nombre="correo"
            etiqueta="Correo electrónico"
            error={errors.correo?.message}
            teclado="email-address"
          />
          <CampoControlado
            control={control}
            nombre="descripcion"
            etiqueta="Descripción del caso"
            error={errors.descripcion?.message}
            multilinea
          />

          {errorServidor ? (
            <Text className="mb-2 text-meta" style={{ color: col.peligro }}>
              {errorServidor}
            </Text>
          ) : null}

          <Boton onPress={() => void enviar()} cargando={isSubmitting}>
            Enviar
          </Boton>
        </Superficie>

        <Pressable
          onPress={() => void Linking.openURL(`mailto:${SOPORTE}`)}
          accessibilityRole="button"
          className="flex-row items-center justify-between border-t py-3.5"
          style={{ borderColor: col.line }}
        >
          <View>
            <Text className="text-body font-medio text-ink">Escribir a soporte</Text>
            <Text className="font-mono text-meta text-ink-suave">{SOPORTE}</Text>
          </View>
          <Icono nombre="chevron" tamano={16} color={col.tenue} />
        </Pressable>
      </Pantalla>
    </View>
  );
}

function PreguntaAcordeon({
  pregunta,
  respuesta,
  abierta,
  onPress,
}: {
  pregunta: string;
  respuesta: string;
  abierta: boolean;
  onPress: () => void;
}) {
  const col = useColores();
  return (
    <Superficie elevacion="plana" className="mb-2 border" style={{ borderColor: col.line }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className="flex-row items-center justify-between p-4"
      >
        <Text className="flex-1 pr-2 text-body font-medio text-ink">{pregunta}</Text>
        <Icono nombre={abierta ? 'chevronArriba' : 'chevron'} tamano={16} color={col.tenue} />
      </Pressable>
      {abierta ? (
        <Text className="font-sans px-4 pb-4 text-meta leading-5 text-ink-suave">{respuesta}</Text>
      ) : null}
    </Superficie>
  );
}

function CampoControlado({
  control,
  nombre,
  etiqueta,
  error,
  teclado,
  multilinea,
}: {
  control: Control<Campos>;
  nombre: keyof Campos;
  etiqueta: string;
  error?: string;
  teclado?: TextInputProps['keyboardType'];
  multilinea?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={nombre}
      render={({ field: { onChange, onBlur, value } }) => (
        <CampoTexto
          etiqueta={etiqueta}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error}
          keyboardType={teclado}
          multiline={multilinea}
          numberOfLines={multilinea ? 4 : undefined}
          textAlignVertical={multilinea ? 'top' : undefined}
        />
      )}
    />
  );
}
