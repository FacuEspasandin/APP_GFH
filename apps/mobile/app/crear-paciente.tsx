import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { api, ErrorApi } from '@/api/cliente';
import type { Inicio } from '@/api/tipos';
import { CampoFecha } from '@/ui/campo-fecha';
import { validarFecha } from '@/ui/fecha';
import { AvisoNeutro, Boton, CampoTexto, Chip, Eyebrow, Pantalla } from '@/ui/kit';

/** Crear paciente (2.5). El Clcr se calcula solo si hay peso y creatinina. */
export default function CrearPaciente() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: inicio } = useQuery({ queryKey: ['inicio'], queryFn: () => api.get<Inicio>('/inicio') });

  const [c, setC] = useState({
    nombre: '',
    apellido: '',
    documento: '',
    fechaNacimiento: '',
    alturaCm: '',
    pesoKg: '',
    creatininaMgDl: '',
  });
  const [sexo, setSexo] = useState<'M' | 'F' | 'OTRO'>('F');
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
      router.back();
    } catch (e) {
      // El límite del plan gratis no es un error: es el momento de vender. Va
      // al paywall, no a un mensaje rojo — y NO a la pantalla de bloqueo, que
      // significa otra cosa ("perdiste el acceso" vs "esto se desbloquea").
      if (e instanceof ErrorApi && e.codigo === 'LIMITE_PLAN_GRATIS') {
        router.push('/paywall');
        return;
      }
      setError(e instanceof Error ? e.message : 'No se pudo crear el paciente.');
    } finally {
      setEnviando(false);
    }
  };

  const grupos = inicio?.grupos ?? [];

  return (
    <Pantalla>
      <CampoTexto etiqueta="Nombre" value={c.nombre} onChangeText={campo('nombre')} />
      <CampoTexto etiqueta="Apellido" value={c.apellido} onChangeText={campo('apellido')} />
      <CampoTexto etiqueta="Documento (opcional)" value={c.documento} onChangeText={campo('documento')} />
      <CampoFecha
        etiqueta="Fecha de nacimiento"
        valor={c.fechaNacimiento}
        onChange={campo('fechaNacimiento')}
      />

      <Eyebrow>Sexo</Eyebrow>
      <View className="mb-4 flex-row gap-2">
        {(['F', 'M', 'OTRO'] as const).map((s) => (
          <Chip key={s} texto={s} activo={sexo === s} onPress={() => setSexo(s)} />
        ))}
      </View>
      {sexo === 'OTRO' ? (
        <AvisoNeutro>
          Cockcroft-Gault contempla dos categorías: «otro» usa el mismo factor que masculino.
        </AvisoNeutro>
      ) : null}

      <Eyebrow>Datos para la función renal</Eyebrow>
      <CampoTexto etiqueta="Altura (cm)" value={c.alturaCm} onChangeText={campo('alturaCm')} keyboardType="numeric" />
      <CampoTexto etiqueta="Peso (kg)" value={c.pesoKg} onChangeText={campo('pesoKg')} keyboardType="numeric" />
      <CampoTexto
        etiqueta="Creatinina (mg/dL)"
        value={c.creatininaMgDl}
        onChangeText={campo('creatininaMgDl')}
        keyboardType="numeric"
      />
      <AvisoNeutro>
        Con peso y creatinina se calcula el Clcr. Sin eso, el ajuste renal queda en neutro.
      </AvisoNeutro>

      {grupos.length > 0 ? (
        <>
          <View className="mt-3" />
          <Eyebrow>Grupo (opcional)</Eyebrow>
          <View className="mb-4 flex-row flex-wrap gap-2">
            <Chip texto="Sin grupo" activo={grupoId === null} onPress={() => setGrupoId(null)} />
            {grupos.map((g) => (
              <Chip key={g.id} texto={g.nombre} activo={grupoId === g.id} onPress={() => setGrupoId(g.id)} />
            ))}
          </View>
        </>
      ) : (
        <Text className="font-sans mb-4 px-1 text-meta text-ink-suave">
          Todavía no tenés grupos. El paciente va a quedar en «sin grupo».
        </Text>
      )}

      {error ? (
        <Text className="font-sans mb-3 text-meta" style={{ color: '#991B1B' }}>
          {error}
        </Text>
      ) : null}

      <Boton
        onPress={crear}
        cargando={enviando}
        deshabilitado={!c.nombre.trim() || !c.apellido.trim() || !validarFecha(c.fechaNacimiento).valida}
      >
        Crear paciente
      </Boton>
    </Pantalla>
  );
}
