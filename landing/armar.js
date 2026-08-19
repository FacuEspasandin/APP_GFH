/**
 * Arma la landing en un solo archivo, con las fuentes adentro.
 *
 *   node landing/armar.js        → landing/dist/index.html
 *
 * Las IBM Plex se incrustan como data URI en vez de linkearlas a un CDN:
 * la landing tiene que verse igual sin red y sin depender de que Google siga
 * sirviendo el archivo. El precio es un HTML de ~1,5 MB, que para una página
 * sola es aceptable.
 *
 * El .css y el .html de `src/` son la fuente; `dist/` se regenera y no se
 * commitea. Antes de esto la landing vivía sólo en el directorio temporal de
 * una sesión, que se borra.
 */
const fs = require('node:fs');
const path = require('node:path');

const AQUI = __dirname;
const FUENTES = path.join(AQUI, '..', 'node_modules', '@expo-google-fonts');

const CARAS = [
  { familia: 'IBM Plex Sans', peso: 300, archivo: 'ibm-plex-sans/300Light/IBMPlexSans_300Light.ttf' },
  { familia: 'IBM Plex Sans', peso: 400, archivo: 'ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf' },
  { familia: 'IBM Plex Sans', peso: 600, archivo: 'ibm-plex-sans/600SemiBold/IBMPlexSans_600SemiBold.ttf' },
  { familia: 'IBM Plex Sans', peso: 700, archivo: 'ibm-plex-sans/700Bold/IBMPlexSans_700Bold.ttf' },
  { familia: 'IBM Plex Mono', peso: 400, archivo: 'ibm-plex-mono/400Regular/IBMPlexMono_400Regular.ttf' },
  { familia: 'IBM Plex Mono', peso: 600, archivo: 'ibm-plex-mono/600SemiBold/IBMPlexMono_600SemiBold.ttf' },
];

const TITULO = 'GFH — la app que verifica si un fármaco es seguro para tu paciente';

function caraCss({ familia, peso, archivo }) {
  const ruta = path.join(FUENTES, archivo);
  if (!fs.existsSync(ruta)) {
    console.error(`falta la fuente: ${archivo}\n(¿corriste pnpm install?)`);
    process.exit(1);
  }
  const b64 = fs.readFileSync(ruta).toString('base64');
  return `@font-face{font-family:"${familia}";font-weight:${peso};font-style:normal;font-display:swap;src:url(data:font/ttf;base64,${b64}) format("truetype")}`;
}

const fuentes = CARAS.map(caraCss).join('\n');
const estilos = fs.readFileSync(path.join(AQUI, 'src', 'estilos.css'), 'utf8');
const cuerpo = fs.readFileSync(path.join(AQUI, 'src', 'cuerpo.html'), 'utf8');

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITULO}</title>
<style>
${fuentes}
${estilos}
</style>
</head>
<body>
${cuerpo}
</body>
</html>
`;

const salida = path.join(AQUI, 'dist');
fs.mkdirSync(salida, { recursive: true });
fs.writeFileSync(path.join(salida, 'index.html'), html);

console.log(`landing/dist/index.html · ${Math.round(Buffer.byteLength(html) / 1024)} KB`);
