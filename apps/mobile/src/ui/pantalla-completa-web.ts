import { Platform } from 'react-native';

/**
 * Hace que la versión web se comporte como app al agregarla a la pantalla de
 * inicio del teléfono: sin barra del navegador, con la status bar en verde de
 * marca y sin zoom accidental al tocar dos veces un dato clínico.
 *
 * Se inyecta en runtime y no desde `app/+html.tsx` porque ese archivo sólo lo
 * aplica Expo con renderizado estático; en modo SPA (`web.output: "single"`)
 * el dev server usa su propia plantilla y lo ignora. iOS lee estas etiquetas en
 * el momento en que el usuario elige "Agregar a inicio", así que inyectarlas
 * después de montar funciona igual.
 */
export function activarPantallaCompletaWeb(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const meta = (nombre: string, contenido: string) => {
    let etiqueta = document.querySelector<HTMLMetaElement>(`meta[name="${nombre}"]`);
    if (!etiqueta) {
      etiqueta = document.createElement('meta');
      etiqueta.name = nombre;
      document.head.appendChild(etiqueta);
    }
    etiqueta.content = contenido;
  };

  meta(
    'viewport',
    'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  );
  meta('mobile-web-app-capable', 'yes');
  meta('apple-mobile-web-app-capable', 'yes');
  meta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  meta('apple-mobile-web-app-title', 'GFH');
  meta('theme-color', '#1F5E4A');

  document.documentElement.lang = 'es';
  document.title = 'GFH';

  const estilo = document.createElement('style');
  estilo.textContent = `
    html, body { background-color: #F3F6F3; overscroll-behavior: none; }
    body { -webkit-tap-highlight-color: transparent; }
  `;
  document.head.appendChild(estilo);
}
