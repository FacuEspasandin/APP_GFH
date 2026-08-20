/**
 * Genera los assets de la app: ícono, ícono adaptativo, splash y favicon.
 *
 * Se dibujan en HTML y se capturan con puppeteer al tamaño exacto. La fuente va
 * incrustada como data URI: sin eso Chrome cae a la del sistema y la «G» sale
 * distinta en cada máquina que corra este script.
 *
 * La paleta es la del producto: fondo #1F5E4A —el verde de marca, el mismo que
 * ya declaraba `app.json` para el splash— y la letra en menta #4FD1A5. No al
 * revés: un ícono menta entero se lee como app de consumo, y esto es una
 * herramienta clínica.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const puppeteer = require('puppeteer-core');

const SALIDA = path.resolve(__dirname, '..', 'apps', 'mobile', 'assets');
const FUENTE = path.resolve(__dirname, '..', 'node_modules', '@expo-google-fonts', 'ibm-plex-sans', '700Bold', 'IBMPlexSans_700Bold.ttf');

const VERDE = '#1F5E4A';
const MENTA = '#4FD1A5';

const b64 = fs.readFileSync(FUENTE).toString('base64');

/**
 * @param lado      píxeles del lienzo
 * @param proporcion  alto de la letra respecto del lienzo
 * @param fondo     color o 'transparent'
 */
function pagina(lado, proporcion, fondo) {
  return `<style>
    @font-face{font-family:"Plex";src:url(data:font/ttf;base64,${b64}) format("truetype")}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${lado}px;height:${lado}px;background:${fondo}}
    .c{
      width:${lado}px;height:${lado}px;
      display:flex;align-items:center;justify-content:center;
      background:${fondo};
    }
    .g{
      font-family:"Plex";font-weight:700;
      font-size:${Math.round(lado * proporcion)}px;
      color:${MENTA};
      /* Óptico: la «G» de Plex tiene más masa abajo y sin esto queda hundida. */
      line-height:1;
      transform:translateY(-2%);
    }
  </style><div class="c"><span class="g">G</span></div>`;
}

const PIEZAS = [
  // iOS no admite transparencia y recorta las esquinas él mismo: fondo sólido y
  // sin bordes redondeados propios.
  { archivo: 'icon.png', lado: 1024, proporcion: 0.62, fondo: VERDE },

  // Android enmascara la capa de adelante con la forma que elija el lanzador, y
  // recorta hasta el 33% de cada lado. La letra va más chica para caer entera
  // dentro de la zona segura del centro.
  { archivo: 'adaptive-icon.png', lado: 1024, proporcion: 0.42, fondo: 'transparent' },

  // El splash lo compone Expo sobre `backgroundColor`, así que acá va sólo la
  // marca, transparente y con aire.
  { archivo: 'splash-icon.png', lado: 512, proporcion: 0.5, fondo: 'transparent' },

  { archivo: 'favicon.png', lado: 48, proporcion: 0.72, fondo: VERDE },
];

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });

  let html = '';
  const srv = http.createServer((_q, r) => {
    r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    r.end(html);
  });
  await new Promise((r) => srv.listen(8786, r));

  const b = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--hide-scrollbars', '--force-device-scale-factor=1'],
  });

  for (const p of PIEZAS) {
    html = pagina(p.lado, p.proporcion, p.fondo);
    const page = await b.newPage();
    await page.setViewport({ width: p.lado, height: p.lado, deviceScaleFactor: 1 });
    await page.goto('http://localhost:8786/', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({
      path: path.join(SALIDA, p.archivo),
      omitBackground: p.fondo === 'transparent',
    });
    const kb = Math.round(fs.statSync(path.join(SALIDA, p.archivo)).size / 1024);
    console.log(`  ${p.archivo.padEnd(20)} ${p.lado}×${p.lado}  ${kb} KB`);
    await page.close();
  }

  await b.close();
  srv.close();
})().catch((e) => {
  console.error('FALLO:', e.message);
  process.exit(1);
});
