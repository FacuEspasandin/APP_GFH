/**
 * Capturas de la app real, en viewport de teléfono.
 *
 *   pnpm capturas            → guarda en .capturas/
 *   pnpm capturas oscuro     → las mismas pantallas en tema oscuro
 *
 * Para qué sirve: cerrar el bucle de trabajo visual. Sin esto, cambiar la UI
 * es a ciegas — se edita, se publica, y alguien tiene que mirar el teléfono
 * para saber si quedó bien. Con esto, cada cambio se revisa como imagen en la
 * misma vuelta.
 *
 * Requisitos: Metro corriendo, el backend LOCAL en :3333 (el desplegado tiene
 * CORS cerrado y el navegador no lo alcanza) y los datos demo cargados
 * (`pnpm --filter @gfh/backend dev:datos`).
 *
 * Maneja el Chrome instalado en la máquina vía puppeteer-core; no descarga
 * ningún navegador.
 */
const fs = require('node:fs');
const path = require('node:path');

let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch {
  console.error('Falta puppeteer-core. Instalalo con:  pnpm add -Dw puppeteer-core');
  process.exit(1);
}

const CANDIDATOS_CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];

const METRO = process.env.METRO_URL ?? 'http://localhost:8081';
const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333';
// La cuenta se puede cambiar para comparar planes:
//   GFH_EMAIL=gratis@gfh.app GFH_PASSWORD=GratisGFH2026! GFH_SALIDA=gratis pnpm capturas
const EMAIL = process.env.GFH_EMAIL ?? 'demo@gfh.app';
const PASSWORD = process.env.GFH_PASSWORD ?? 'DemoGFH2026!';

const oscuro = process.argv.includes('oscuro');
const carpeta = process.env.GFH_SALIDA ?? (oscuro ? 'oscuro' : 'claro');
const SALIDA = path.resolve(__dirname, '..', '.capturas', carpeta);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function buscarChrome() {
  const encontrado = CANDIDATOS_CHROME.find((p) => fs.existsSync(p));
  if (!encontrado) {
    console.error('No encontré Chrome. Definí CHROME_PATH con la ruta al ejecutable.');
    process.exit(1);
  }
  return process.env.CHROME_PATH ?? encontrado;
}

async function capturar(page, nombre) {
  await esperar(1400);
  const archivo = path.join(SALIDA, `${nombre}.png`);
  await page.screenshot({ path: archivo });
  console.log(`  ${nombre}.png  (${Math.round(fs.statSync(archivo).size / 1024)} KB)`);
}

/** Toca el primer elemento cuyo texto coincida exactamente. */
async function tocar(page, texto) {
  const ok = await page.evaluate((t) => {
    const nodos = [...document.querySelectorAll('div,span,a')].reverse();
    const n = nodos.find((e) => e.textContent.trim() === t && e.children.length <= 1);
    if (!n) return false;
    let objetivo = n;
    for (let i = 0; i < 6 && objetivo.parentElement; i += 1) {
      if (objetivo.getAttribute('role') === 'button' || objetivo.tagName === 'A') break;
      objetivo = objetivo.parentElement;
    }
    objetivo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  }, texto);
  if (!ok) console.log(`  (no encontré "${texto}")`);
  await esperar(1800);
  return ok;
}

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: buscarChrome(),
    headless: 'new',
    args: ['--hide-scrollbars'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true });
  // Explícito en vez de heredar la preferencia del sistema: si no, Chrome
  // headless reporta oscuro y las capturas salen con el chrome oscuro sobre
  // el cuerpo claro, que no representa a ninguno de los dos temas.
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: oscuro ? 'dark' : 'light' },
  ]);

  await page.goto(METRO, { waitUntil: 'networkidle2', timeout: 120000 });
  await esperar(3000);

  // La sesión se pide por API y se inyecta donde la guarda el cliente en web.
  // Llenar el formulario dependía de encontrar el botón por su texto y era
  // frágil; esto no depende del render.
  const entro = await page.evaluate(
    async (api, email, password) => {
      localStorage.clear();
      const r = await fetch(`${api}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identificador: email, password }),
      });
      const j = await r.json();
      if (!j.success) return false;
      localStorage.setItem('gfh.accessToken', j.data.accessToken);
      localStorage.setItem('gfh.refreshToken', j.data.refreshToken);
      return true;
    },
    API,
    EMAIL,
    PASSWORD,
  );

  if (!entro) {
    console.error(`No pude entrar con ${EMAIL}. ¿Corriste "pnpm --filter @gfh/backend dev:datos"?`);
    await browser.close();
    process.exit(1);
  }

  await page.goto(METRO, { waitUntil: 'networkidle2' });
  await esperar(4000);
  await capturar(page, '01-inicio');

  // El primero de la lista, sea quien sea: el paciente depende de la cuenta.
  const abrio = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a')].find((x) =>
      (x.getAttribute('href') ?? '').startsWith('/paciente/'),
    );
    if (!a) return false;
    a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  });
  if (!abrio) console.log('  (esta cuenta no tiene pacientes)');
  await esperar(2500);
  await capturar(page, '02-cockpit');

  await tocar(page, 'Interacciones');
  await capturar(page, '03-interacciones');
  await page.goBack({ waitUntil: 'networkidle2' }).catch(() => {});
  await esperar(2000);

  await tocar(page, 'Ajuste renal');
  await capturar(page, '04-ajuste-renal');
  await page.goBack({ waitUntil: 'networkidle2' }).catch(() => {});
  await esperar(2000);

  await tocar(page, 'Coumadin');
  await capturar(page, '05-hallazgos-farmaco');

  for (const [ruta, nombre] of [
    ['/grupos', '06-grupos'],
    ['/buscador', '07-buscador'],

    ['/perfil', '08-perfil'],
    ['/paywall', '09-paywall'],
  ]) {
    await page.goto(`${METRO}${ruta}`, { waitUntil: 'networkidle2' });
    await capturar(page, nombre);
  }

  await browser.close();
  console.log(`\nlisto → ${SALIDA}`);
})().catch((e) => {
  console.error('FALLO:', e.message);
  process.exit(1);
});
