import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { api } from '@/api/cliente';
import { Boton, CampoTexto, Pantalla } from '@/ui/kit';

/** Crear grupo (2.4). Un grupo es organización libre: no tiene semántica clínica. */
export default function CrearGrupo() {
  const router = useRouter();
  const qc = useQueryClient();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const crear = async () => {
    setEnviando(true);
    setError(null);
    try {
      await api.post('/grupos', { nombre: nombre.trim() });
      await qc.invalidateQueries({ queryKey: ['inicio'] });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el grupo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla>
      <CampoTexto
        etiqueta="Nombre del grupo"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Consultorio, Sala 3, Seguimiento…"
      />
      {error ? (
        <Text className="font-sans mb-3 text-meta" style={{ color: '#991B1B' }}>
          {error}
        </Text>
      ) : null}
      <Boton onPress={crear} cargando={enviando} deshabilitado={nombre.trim().length === 0}>
        Crear grupo
      </Boton>
    </Pantalla>
  );
}
