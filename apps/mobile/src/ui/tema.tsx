import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useColorScheme } from 'nativewind';
import { createContext, useContext, useEffect, type ReactNode } from 'react';

import { api, haySesionSincrona } from '@/api/cliente';

export type Tema = 'CLARO' | 'OSCURO' | 'SISTEMA';

interface Configuracion {
  tema: Tema;
  notificacionesPush: boolean;
  umbralAdultoMayor: number;
}

interface ContextoTema {
  tema: Tema;
  oscuro: boolean;
  cambiar: (t: Tema) => void;
  configuracion: Configuracion | undefined;
}

const Ctx = createContext<ContextoTema>({
  tema: 'SISTEMA',
  oscuro: false,
  cambiar: () => {},
  configuracion: undefined,
});

/**
 * Tema de la app.
 *
 * La preferencia se guarda en el servidor (`ConfiguracionUsuario`), no en el
 * dispositivo: un médico que entra desde otro teléfono espera su mismo tema.
 *
 * `SISTEMA` delega en la preferencia del sistema operativo — que es lo que hace
 * NativeWind por default, así que en ese caso simplemente no forzamos nada.
 */
export function ProveedorTema({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['configuracion'],
    queryFn: () => api.get<Configuracion>('/perfil/configuracion'),
    // Sin sesión no hay a quién pedirle la configuración.
    enabled: haySesionSincrona(),
    staleTime: 5 * 60 * 1000,
  });

  const tema = data?.tema ?? 'SISTEMA';

  useEffect(() => {
    setColorScheme(tema === 'CLARO' ? 'light' : tema === 'OSCURO' ? 'dark' : 'system');
  }, [tema, setColorScheme]);

  const cambiar = (nuevo: Tema) => {
    // Optimista: el cambio de tema tiene que sentirse instantáneo. Si el PATCH
    // falla, el refetch lo revierte.
    qc.setQueryData(['configuracion'], (prev: Configuracion | undefined) =>
      prev ? { ...prev, tema: nuevo } : prev,
    );
    setColorScheme(nuevo === 'CLARO' ? 'light' : nuevo === 'OSCURO' ? 'dark' : 'system');
    void api
      .patch('/perfil/configuracion', { tema: nuevo })
      .catch(() => qc.invalidateQueries({ queryKey: ['configuracion'] }));
  };

  return (
    <Ctx.Provider value={{ tema, oscuro: colorScheme === 'dark', cambiar, configuracion: data }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTema = () => useContext(Ctx);

/** Colores de chrome (header, tab bar) que no salen de clases de Tailwind
 *  porque los consume React Navigation por `style`. */
export function coloresChrome(oscuro: boolean) {
  return {
    fondoHeader: oscuro ? '#14211C' : '#1F5E4A',
    textoHeader: '#FFFFFF',
    fondoPantalla: oscuro ? '#0C1613' : '#F3F6F3',
    tabInactivo: oscuro ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.62)',
  };
}
