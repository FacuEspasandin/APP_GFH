import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

/**
 * Los 24 íconos de línea del sistema (design-tokens §5).
 *
 * Tres reglas del documento que no son estéticas:
 *
 *  · `stroke="currentColor"` — acá se traduce a la prop `color`. Es lo que
 *    permite que el mismo ícono se vea blanco sobre el header verde y verde
 *    sobre fondo blanco sin mantener dos versiones.
 *  · `viewBox="0 0 24 24"` siempre, tamaño de render entre 15 y 21 px.
 *  · El grosor sube cuando el ícono es chico, para que no se vea débil: 2.2 a
 *    los 15 px, 1.6 a los 21. Se calcula solo desde `tamano`.
 *
 * Y una que sí es de significado: **nunca emoji, nunca texto Unicode haciendo
 * de ícono**. Un emoji cambia de forma según el sistema operativo y en una
 * pantalla clínica eso es ruido.
 */

export type NombreIcono =
  | 'atras'
  | 'chevron'
  | 'chevronArriba'
  | 'mas'
  | 'mas-opciones'
  | 'editar'
  | 'compartir'
  | 'menu'
  | 'estrella'
  | 'cerrar'
  | 'check'
  | 'casa'
  | 'herramientas'
  | 'buscar'
  | 'usuario'
  | 'interacciones'
  | 'alerta'
  | 'capsula'
  | 'info'
  | 'sinConexion'
  | 'reloj'
  | 'pulso'
  | 'prohibido'
  | 'carpeta'
  | 'camara'
  | 'pacientes'
  | 'grupos'
  | 'barras'
  | 'gota'
  | 'embarazo'
  | 'lactancia'
  | 'higado'
  // Perfil: la pantalla de ajustes necesita un ícono por fila, y ninguno de
  // los clínicos sirve para 'contraseña' o 'cerrar sesión'.
  | 'candado'
  | 'dispositivo'
  | 'sol'
  | 'campana'
  | 'documento'
  | 'salir'
  | 'basura'
  | 'ayuda';

interface Props {
  nombre: NombreIcono;
  /** Entre 15 (chevrons) y 21 (tab bar, FAB). */
  tamano?: number;
  color?: string;
}

/** Más grueso cuanto más chico, para que la línea no se vea débil. */
function grosor(tamano: number): number {
  if (tamano <= 16) return 2.2;
  if (tamano <= 19) return 1.9;
  return 1.6;
}

export function Icono({ nombre, tamano = 20, color = 'currentColor' }: Props) {
  const comun: Comun = {
    stroke: color,
    strokeWidth: grosor(tamano),
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };

  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      {trazos(nombre, comun)}
    </Svg>
  );
}

type Comun = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: 'none';
};

function trazos(nombre: NombreIcono, c: Comun) {
  switch (nombre) {
    case 'atras':
      return (
        <>
          <Path d="M19 12H5" {...c} />
          <Polyline points="12 19 5 12 12 5" {...c} />
        </>
      );
    case 'chevron':
      return <Polyline points="9 18 15 12 9 6" {...c} />;
    case 'chevronArriba':
      return <Polyline points="18 15 12 9 6 15" {...c} />;
    case 'mas':
      return (
        <>
          <Path d="M12 5v14" {...c} />
          <Path d="M5 12h14" {...c} />
        </>
      );
    // Los tres puntos del cockpit. Van RELLENOS y no de contorno: a 20 px
    // tres circunferencias vacías se leen como manchas.
    case 'mas-opciones':
      return (
        <>
          <Circle cx="5" cy="12" r="1.9" fill={c.stroke} stroke="none" />
          <Circle cx="12" cy="12" r="1.9" fill={c.stroke} stroke="none" />
          <Circle cx="19" cy="12" r="1.9" fill={c.stroke} stroke="none" />
        </>
      );
    case 'editar':
      return (
        <>
          <Path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" {...c} />
          <Path d="M15 5l4 4" {...c} />
        </>
      );
    case 'compartir':
      return (
        <>
          <Path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" {...c} />
          <Polyline points="16 6 12 2 8 6" {...c} />
          <Path d="M12 2v14" {...c} />
        </>
      );
    case 'menu':
      return (
        <>
          <Circle cx="12" cy="5" r="1" {...c} />
          <Circle cx="12" cy="12" r="1" {...c} />
          <Circle cx="12" cy="19" r="1" {...c} />
        </>
      );
    case 'estrella':
      return (
        <Path
          d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9Z"
          {...c}
        />
      );
    case 'cerrar':
      return (
        <>
          <Path d="M18 6L6 18" {...c} />
          <Path d="M6 6l12 12" {...c} />
        </>
      );
    case 'check':
      return <Polyline points="20 6 9 17 4 12" {...c} />;
    case 'pacientes':
      // Dos personas: la lista es de gente, no de fichas.
      return (
        <>
          <Path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...c} />
          <Circle cx="9" cy="7" r="3.2" {...c} />
          <Path d="M22 20v-2a4 4 0 0 0-3-3.8" {...c} />
          <Path d="M16.5 4.2a4 4 0 0 1 0 5.6" {...c} />
        </>
      );
    case 'grupos':
      // Capas apiladas: un grupo contiene, no es una cosa.
      return (
        <>
          <Rect x="3" y="4" width="18" height="5" rx="2" {...c} />
          <Rect x="3" y="12" width="18" height="5" rx="2" {...c} />
          <Path d="M6 20h12" {...c} />
        </>
      );
    case 'barras':
      // Las tres barras del botón central.
      return (
        <>
          <Path d="M4 7h16" {...c} />
          <Path d="M4 12h16" {...c} />
          <Path d="M4 17h16" {...c} />
        </>
      );
    case 'gota':
      return <Path d="M12 3c3.5 3.2 5.5 6 5.5 9a5.5 5.5 0 0 1-11 0c0-3 2-5.8 5.5-9Z" {...c} />;
    // Embarazo: el contorno de un vientre con el feto adentro. No es la gota
    // del riñón ni el pulso: las cuatro restricciones de la ficha se ven juntas
    // y tienen que distinguirse de un vistazo.
    case 'embarazo':
      return (
        <>
          <Path d="M13 21c-3.3 0-5.6-2.4-5.6-5.6 0-3.2 2-5.2 2-8.4" {...c} />
          <Circle cx="9.6" cy="4.2" r="1.9" {...c} />
          <Circle cx="12.6" cy="15" r="2.6" {...c} />
        </>
      );
    // Lactancia: la gota de leche, más redonda que la del riñón y con el
    // reflejo adentro para que no se confundan a 18 px.
    case 'lactancia':
      return (
        <>
          <Path d="M12 20.5c-3.4 0-6-2.5-6-5.7C6 11 9 7.6 12 3.5c3 4.1 6 7.5 6 11.3 0 3.2-2.6 5.7-6 5.7Z" {...c} />
          <Path d="M9.3 15.2a2.8 2.8 0 0 0 2.2 2.6" {...c} />
        </>
      );
    case 'higado':
      return (
        <>
          <Path d="M4 6h16v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" {...c} />
          <Path d="M9 6V4" {...c} />
        </>
      );
    case 'casa':
      return (
        <>
          <Path d="M3 10.5L12 3l9 7.5" {...c} />
          <Path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" {...c} />
        </>
      );
    case 'herramientas':
      // Grid 2×2.
      return (
        <>
          <Rect x="3" y="3" width="7.5" height="7.5" rx="1.5" {...c} />
          <Rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" {...c} />
          <Rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" {...c} />
          <Rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" {...c} />
        </>
      );
    case 'buscar':
      return (
        <>
          <Circle cx="11" cy="11" r="7" {...c} />
          <Path d="M20 20l-3.6-3.6" {...c} />
        </>
      );
    case 'usuario':
      return (
        <>
          <Circle cx="12" cy="8" r="4" {...c} />
          <Path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6" {...c} />
        </>
      );
    case 'interacciones':
      // Flechas cruzadas.
      return (
        <>
          <Path d="M4 8h11" {...c} />
          <Polyline points="12 5 15 8 12 11" {...c} />
          <Path d="M20 16H9" {...c} />
          <Polyline points="12 13 9 16 12 19" {...c} />
        </>
      );
    case 'alerta':
      return (
        <>
          <Path d="M12 3.5L22 20H2Z" {...c} />
          <Path d="M12 9.5v4.5" {...c} />
          <Path d="M12 17.2v.1" {...c} />
        </>
      );
    case 'capsula':
      return (
        <>
          <Path d="M8.5 3.5h7a5 5 0 0 1 0 10h-7a5 5 0 0 1 0-10Z" {...c} />
          <Path d="M12 3.5v10" {...c} />
        </>
      );
    case 'info':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...c} />
          <Path d="M12 11v5" {...c} />
          <Path d="M12 8v.1" {...c} />
        </>
      );
    case 'sinConexion':
      return (
        <>
          <Path d="M3 8.5c1.6-1.2 3.4-2 5.3-2.4" {...c} />
          <Path d="M15.5 6.7c1.9.5 3.7 1.4 5.5 2.8" {...c} />
          <Path d="M7 13c1-.8 2.1-1.3 3.2-1.6" {...c} />
          <Path d="M12 18.5v.1" {...c} />
          <Path d="M3 3l18 18" {...c} />
        </>
      );
    case 'reloj':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...c} />
          <Polyline points="12 7 12 12 15.5 14" {...c} />
        </>
      );
    case 'pulso':
      return <Polyline points="2 12 7 12 10 4 14 20 17 12 22 12" {...c} />;
    case 'prohibido':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...c} />
          <Path d="M5.6 5.6l12.8 12.8" {...c} />
        </>
      );
    case 'carpeta':
      return (
        <Path
          d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"
          {...c}
        />
      );
    case 'camara':
      return (
        <>
          <Path d="M3 8.5a2 2 0 0 1 2-2h2.5L9 4.5h6L16.5 6.5H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" {...c} />
          <Circle cx="12" cy="13" r="3.5" {...c} />
        </>
      );

    case 'candado':
      return (
        <>
          <Rect x="4" y="10.5" width="16" height="10" rx="2" {...c} />
          <Path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" {...c} />
        </>
      );
    case 'dispositivo':
      return (
        <>
          <Rect x="6" y="2.5" width="12" height="19" rx="2" {...c} />
          <Path d="M12 18h.01" {...c} />
        </>
      );
    case 'sol':
      return (
        <>
          <Circle cx="12" cy="12" r="4" {...c} />
          <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...c} />
        </>
      );
    case 'campana':
      return (
        <>
          <Path d="M18 8.5a6 6 0 0 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5" {...c} />
          <Path d="M13.7 20.5a2 2 0 0 1-3.4 0" {...c} />
        </>
      );
    case 'documento':
      return (
        <>
          <Path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z" {...c} />
          <Polyline points="14 2.5 14 8 19.5 8" {...c} />
        </>
      );
    case 'salir':
      return (
        <>
          <Path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...c} />
          <Polyline points="16 16.5 20.5 12 16 7.5" {...c} />
          <Path d="M20.5 12H9.5" {...c} />
        </>
      );
    case 'basura':
      return (
        <>
          <Path d="M3.5 6.5h17" {...c} />
          <Path d="M8.5 6.5V4.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" {...c} />
          <Path d="M18.5 6.5l-.9 13a2 2 0 0 1-2 1.9H8.4a2 2 0 0 1-2-1.9l-.9-13" {...c} />
        </>
      );
    case 'ayuda':
      return (
        <>
          <Circle cx="12" cy="12" r="9" {...c} />
          <Path d="M9.2 9.3a3 3 0 0 1 5.8 1c0 2-2.9 2.6-2.9 4" {...c} />
          <Path d="M12 17.3h.01" {...c} />
        </>
      );
  }
}
