import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { api, ErrorApi } from '@/api/cliente';
import { usePlan } from '@/api/plan';
import { decidirEntrada } from '@/dominio/plan-gratis';
import type { Inicio } from '@/api/tipos';
import { BloqueFormulario } from '@/ui/bloque-formulario';
import { CampoFecha } from '@/ui/campo-fecha';
import { Skeleton } from '@/ui/estados-sistema';
import { edadDeFecha, validarFecha } from '@/ui/fecha';
import { Boton, CampoTexto, Chip, Pantalla } from '@/ui/kit';
import { ResultadoClcr } from '@/ui/resultado-clcr';
import { useColores } from '@/ui/tema';
import { OPCIONES_SEXO, type Sexo } from '@gfh/shared-types';

/**
 * Crear paciente (2.5).
 *
 * Tres bloques y no una lista de doce campos: quién es, cómo está su función
 * renal, y dónde va. Cada uno declara si es obligatorio, así no hay que
 * descubrirlo tocando el botón.
 *
 * El Clcr aparece mientras se escribe. Esos tres números existen para
 * calcularlo, y antes el resultado sólo se veía después de crear al paciente.
 */
export default function CrearPaciente() {
  const col = useColores();

  const router = useRouter();
  const qc = useQueryClient();
  const { data: inicio } = useQuery({ queryKey: ['inicio'], queryFn: () => api.get<Inicio>('/inicio') });

  /**
   * El muro va ANTES del formulario, no después de enviarlo.
   *
   * Dejar llenar doce campos para recién ahí decir que hace falta pagar es
   * cobrarle al médico el trabajo dos veces: la segunda cuando vuelva a
   * escribir todo. Y va acá adentro y no en cada botón que trae a esta
   * pantalla, porque así el próximo acceso que agreguemos —un atajo, una
   * sugerencia, un deep link— queda cubierto sin que nadie tenga que
   * acordarse.
   */
  const { data: plan, isError: planFallo } = usePlan();
  const entrada = decidirEntrada(plan, planFallo);
  const bloqueado = entrada === 'paywall';

  useEffect(() => {
    // `replace` y no `push`: el formulario no tiene que quedar debajo del
    // paywall esperando a que lo cierren.
    if (bloqueado) router.replace('/paywall');
  }, [bloqueado, router]);

  const [c, setC] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    fechaNacimiento: '',
    alturaCm: '',
    pesoKg: '',
    creatininaMgDl: '',
  });
  const [sexo, setSexo] = useState<Sexo>('F');
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const campo = (k: keyof typeof c) => (v: string) => setC((p) => ({ ...p, [k]: v }));
  const numero = (v: string) => (v.trim() === '' ? undefined : Number(v.replace(',', '.')));

  const crear = async () => {
    setError(null);
    const fecha = validarFecha(c.fechaNacimiento);
    if (!fecha.valida || !fecha.fecha) {
      return setError(fecha.error ?? 'Revisá la fecha de nacimiento.');
    }
    setEnviando(true);
    try {
      await api.post('/pacientes', {
        nombre: c.nombre.trim(),
        apellido: c.apellido.trim(),
        ...(c.documento.trim() ? { documento: c.documento.trim() } : {}),
        fechaNacimiento: fecha.fecha.toISOString(),
        sexo,
        ...(grupoId ? { grupoId } : {}),
        ...(numero(c.alturaCm) !== undefined ? { alturaCm: numero(c.alturaCm) } : {}),
        ...(numero(c.pesoKg) !== undefined ? { pesoKg: numero(c.pesoKg) } : {}),
        ...(numero(c.creatininaMgDl) !== undefined
          ? { creatininaMgDl: numero(c.creatininaMgDl) }
          : {}),
      });
      await qc.invalidateQueries({ queryKey: ['inicio'] });
      // El conteo de pacientes es lo que decide el límite: sin esto, el médico
      // gratis podría abrir el formulario una segunda vez con el plan viejo en
      // caché.
      await qc.invalidateQueries({ queryKey: ['plan'] });
      router.back();
    } catch (e) {
      // El paywall lo abre el cliente HTTP, para CUALQUIER acción que exceda
      // el plan. Acá sólo hay que no pisarlo con un mensaje de error rojo.
      if (e instanceof ErrorApi && e.esLimiteDelPlanGratis) return;
      setError(e instanceof Error ? e.message : 'No se pudo crear el paciente.');
    } finally {
      setEnviando(false);
    }
  };

  const grupos = inicio?.grupos ?? [];
  const edad = edadDeFecha(c.fechaNacimiento);
  const listo =
    Boolean(c.nombre.trim()) && Boolean(c.apellido.trim()) && validarFecha(c.fechaNacimiento).valida;

  // Mientras no se sabe, no se muestra el formulario: aparecer y desaparecer es
  // peor que tardar un segundo. Si la consulta del plan falla se deja pasar —
  // el límite lo aplica igual el backend, y trabar por un dato de facturación
  // que no llegó sería inventar un muro que quizá no existe.
  if (entrada !== 'formulario') {
    return (
      <Pantalla>
        <Skeleton filas={4} />
      </Pantalla>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-paper"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="px-4 pb-4 pt-3"
        keyboardShouldPersistTaps="handled"
      >
        <BloqueFormulario titulo="Datos del paciente" exigencia="Obligatorio">
          {/* Nombre y apellido comparten fila: son cortos y se completan
              juntos. Apilados gastaban el doble de alto para nada. */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <CampoTexto etiqueta="Nombre" value={c.nombre} onChangeText={campo('nombre')} />
            </View>
            <View className="flex-1">
              <CampoTexto etiqueta="Apellido" value={c.apellido} onChangeText={campo('apellido')} />
            </View>
          </View>

          {/* La edad no se repite en la etiqueta: `CampoFecha` ya la muestra
              debajo del campo apenas la fecha es válida. */}
          <CampoFecha
            etiqueta="Fecha de nacimiento"
            valor={c.fechaNacimiento}
            onChange={campo('fechaNacimiento')}
          />

          <Text className="mb-1.5 text-eyebrow font-medio uppercase tracking-wider text-ink-suave">
            Sexo
          </Text>
          <View className="mb-4 flex-row gap-2">
            {/* Las siglas salen de `OPCIONES_SEXO`, no se escriben acá: en
                pantalla M es mujer y en la base es masculino, y ese cruce se
                resuelve en un solo lugar del sistema. */}
            {OPCIONES_SEXO.map((o) => (
              <Chip
                key={o.valor}
                texto={o.sigla}
                activo={sexo === o.valor}
                onPress={() => setSexo(o.valor)}
              />
            ))}
          </View>
          {sexo === 'OTRO' ? (
            <Text className="font-sans mb-3 px-1 text-eyebrow leading-4 text-ink-suave">
              Cockcroft-Gault contempla dos categorías: «otro» usa el mismo factor que hombre.
            </Text>
          ) : null}

          <CampoTexto
            etiqueta="Documento (opcional)"
            value={c.documento}
            onChangeText={campo('documento')}
          />
        </BloqueFormulario>

        <BloqueFormulario titulo="Función renal" exigencia="Recomendado">
          {/* Los tres en una fila: son números cortos y se leen como un
              conjunto, que es como se usan — los tres alimentan una fórmula. */}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <CampoTexto
                etiqueta="Altura"
                value={c.alturaCm}
                onChangeText={campo('alturaCm')}
                keyboardType="numeric"
                placeholder="cm"
              />
            </View>
            <View className="flex-1">
              <CampoTexto
                etiqueta="Peso"
                value={c.pesoKg}
                onChangeText={campo('pesoKg')}
                keyboardType="numeric"
                placeholder="kg"
              />
            </View>
            <View className="flex-1">
              <CampoTexto
                etiqueta="Creatinina"
                value={c.creatininaMgDl}
                onChangeText={campo('creatininaMgDl')}
                keyboardType="numeric"
                placeholder="mg/dL"
              />
            </View>
          </View>

          <ResultadoClcr
            edadAnios={edad}
            pesoKg={numero(c.pesoKg) ?? null}
            creatininaMgDl={numero(c.creatininaMgDl) ?? null}
            sexo={sexo}
          />
        </BloqueFormulario>

        <BloqueFormulario titulo="Grupo" exigencia="Opcional">
          {grupos.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              <Chip texto="Sin grupo" activo={grupoId === null} onPress={() => setGrupoId(null)} />
              {grupos
                .filter((g) => g.id !== null)
                .map((g) => (
                  <Chip
                    key={g.id}
                    texto={g.nombre}
                    activo={grupoId === g.id}
                    onPress={() => setGrupoId(g.id)}
                  />
                ))}
            </View>
          ) : (
            <Text className="font-sans text-meta text-ink-suave">
              Todavía no tenés grupos. El paciente va a quedar en «sin grupo».
            </Text>
          )}
        </BloqueFormulario>

        {error ? (
          <Text className="font-sans mb-1 px-1 text-meta" style={{ color: col.peligro }}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      {/* El botón no viaja con el scroll. Con tres bloques abiertos quedaba
          debajo del pliegue y había que volver al final para crear a alguien
          cuyos datos ya estaban completos arriba. */}
      <View className="border-t border-line bg-surface px-4 py-3">
        <Boton onPress={crear} cargando={enviando} deshabilitado={!listo}>
          Crear paciente
        </Boton>
      </View>
    </KeyboardAvoidingView>
  );
}
