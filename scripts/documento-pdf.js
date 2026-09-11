/**
 * Exporta docs/documento-funcional-presentacion.html a PDF.
 *
 *   pnpm documento:pdf
 *
 * El HTML fuente es un fragmento (sin <html>/<head>) pensado para el tool
 * de Artifact; acá se envuelve en un documento completo antes de abrirlo,
 * mismo criterio que separa landing/src/cuerpo.html de landing/dist/*.html.
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

function buscarChrome() {
  const encontrado = CANDIDATOS_CHROME.find((p) => fs.existsSync(p));
  if (!encontrado) {
    console.error('No encontré Chrome. Definí CHROME_PATH con la ruta al ejecutable.');
    process.exit(1);
  }
  return process.env.CHROME_PATH ?? encontrado;
}

const FUENTE = path.resolve(__dirname, '..', 'docs', 'documento-funcional-presentacion.html');
const TEMP = path.resolve(__dirname, '..', 'docs', '.documento-completo-temp.html');
const SALIDA = path.resolve(__dirname, '..', 'docs', 'documento-funcional-GFH.pdf');

(async () => {
  const fragmento = fs.readFileSync(FUENTE, 'utf8');
  const completo = `<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body>${fragmento}</body></html>`;
  fs.writeFileSync(TEMP, completo);

  const browser = await puppeteer.launch({ executablePath: buscarChrome(), headless: 'new' });
  const page = await browser.newPage();
  await page.goto(`file://${TEMP}`, { waitUntil: 'networkidle0', timeout: 60000 });
  // Las Google Fonts cargan por red; sin esta espera el PDF sale con la
  // fuente de sistema en la primera pasada de render.
  if (await page.evaluate(() => !!document.fonts)) {
    await page.evaluate(() => document.fonts.ready);
  }
  await new Promise((r) => setTimeout(r, 500));

  await page.pdf({
    path: SALIDA,
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' },
  });

  await browser.close();
  fs.unlinkSync(TEMP);
  console.log(`listo → ${SALIDA}  (${Math.round(fs.statSync(SALIDA).size / 1024)} KB)`);
})().catch((e) => {
  console.error('FALLO:', e.message);
  process.exit(1);
});
