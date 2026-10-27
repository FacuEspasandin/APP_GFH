#!/usr/bin/env node
// Auditoría visual de GFH Móvil: mide cuánto de la interfaz usa tokens y cuánto tiene valores escritos a mano.
// Funciona igual en Windows, Mac y Linux. Sin dependencias.
//
// Uso (desde la raíz del repositorio):
//   node scripts/auditar-visual.mjs                    muestra las métricas y las compara con la línea base
//   node scripts/auditar-visual.mjs --guardar-base     guarda las métricas de hoy como línea base
//   node scripts/auditar-visual.mjs --estricto         además exige los objetivos de docs/rediseno-visual/objetivos.json
//   node scripts/auditar-visual.mjs --detalle hexSueltos   lista archivo:línea de cada hallazgo de esa métrica
//   node scripts/auditar-visual.mjs --json             salida para otras herramientas
// Salida: 0 si no hay retrocesos respecto de la línea base (y, con --estricto, se cumplen los objetivos); 1 si hay; 2 si el uso es incorrecto.
//
// Para dejar un valor suelto a propósito, escribí «visual-ok: motivo» en un comentario en esa línea o en la anterior.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const tiene = (n) => args.includes(n);
const valor = (n, def) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : def; };

const RAIZ = resolve(valor('--raiz', process.cwd()));
const CARPETAS = valor('--carpetas', 'apps/mobile/app,apps/mobile/src/ui').split(',').map((c) => c.trim());
// Archivos que por diseño definen o consumen valores crudos (tokens, severidad clínica, color de la barra del navegador, pruebas).
const EXCLUIR = valor('--excluir', 'tokens.ts,tokens.test.ts,severidad.tsx,pantalla-completa-web.ts').split(',').map((c) => c.trim());
const RUTA_BASE = join(RAIZ, 'docs', 'rediseno-visual', 'linea-base.json');
const RUTA_OBJETIVOS = join(RAIZ, 'docs', 'rediseno-visual', 'objetivos.json');

const MARCA = new Set(['#005228', '#003d1e', '#e6efea', '#54b683', '#70c298', '#1b3327', '#1f5e4a', '#184a3b', '#e7f0ea']);

/** Cada métrica: «menor» = mientras más baja mejor; «mayor» = mientras más alta mejor. */
const METRICAS = {
  hexSueltos: { sentido: 'menor', texto: 'Colores hexadecimales escritos a mano (fuera de los tokens)' },
  hexMarca: { sentido: 'menor', texto: '…de ellos, el color de marca (se rompe en tema oscuro)' },
  coloresTailwindCrudos: { sentido: 'menor', texto: 'Colores crudos de Tailwind (bg-white, text-black…)' },
  valoresArbitrarios: { sentido: 'menor', texto: 'Valores arbitrarios de Tailwind (text-[32px], w-[220px]…)' },
  fontSizeSuelto: { sentido: 'menor', texto: 'Tamaños de letra escritos a mano (fontSize: N)' },
  textoMenorA12: { sentido: 'menor', texto: 'Textos de menos de 12 px (a mano)' },
  radioSuelto: { sentido: 'menor', texto: 'Radios escritos a mano (borderRadius: N)' },
  sombrasSueltas: { sentido: 'menor', texto: 'Sombras escritas a mano fuera de Superficie' },
  bordesLinea: { sentido: 'menor', texto: 'Bordes completos border-line (los separadores no cuentan)' },
  adopcionSuperficiePct: { sentido: 'mayor', texto: '% de pantallas que usan Superficie' },
};

function archivos(dir) {
  if (!existsSync(dir)) return [];
  const salida = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (n === 'node_modules' || n.startsWith('.')) continue;
    if (statSync(p).isDirectory()) salida.push(...archivos(p));
    else if (/\.(tsx|ts|jsx|js)$/.test(n) && !/\.test\./.test(n) && !EXCLUIR.includes(n)) salida.push(p);
  }
  return salida;
}

/** Reemplaza los comentarios por espacios (conserva las líneas) para no contar lo que está en comentarios. */
function sinComentarios(t) {
  return t
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
}

const hallazgos = Object.fromEntries(Object.keys(METRICAS).map((k) => [k, []]));
let pantallas = 0;
let pantallasConSuperficie = 0;

for (const carpeta of CARPETAS) {
  for (const f of archivos(join(RAIZ, carpeta))) {
    const original = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
    const ols = original.split('\n');
    const exentas = new Set();
    ols.forEach((l, i) => { if (l.includes('visual-ok:')) { exentas.add(i); exentas.add(i + 1); } });
    const lineas = sinComentarios(original).split('\n');
    const rel = relative(RAIZ, f).split(sep).join('/');
    const esPantalla = carpeta.endsWith('app') && /\.tsx$/.test(f) && !/_layout\.tsx$/.test(f);
    if (esPantalla) {
      pantallas++;
      // También cuentan las pantallas armadas con piezas del kit que ya traen Superficie por dentro
      // (las 33 herramientas sueltas son <Calculadora>).
      if (/\bSuperficie(?:Tocable)?\b|\bCalculadora\b|\bConsulta\b|\bResultadoConsulta\b/.test(original)) pantallasConSuperficie++;
    }
    const enSuperficie = /superficie\.tsx$/.test(f);
    lineas.forEach((l, i) => {
      if (exentas.has(i)) return;
      const anotar = (metrica, cuantos = 1, extra = '') => { for (let k = 0; k < cuantos; k++) hallazgos[metrica].push(`${rel}:${i + 1}${extra}`); };
      for (const m of l.matchAll(/#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b(?![0-9A-Fa-f])/g)) {
        anotar('hexSueltos', 1, ` ${m[0]}`);
        if (MARCA.has(m[0].toLowerCase())) anotar('hexMarca', 1, ` ${m[0]}`);
      }
      anotar('coloresTailwindCrudos', [...l.matchAll(/\b(?:bg|text|border)-(?:white|black|gray|slate|zinc|neutral|red|green|blue|yellow|orange|amber|emerald)(?:-\d+)?\b/g)].length);
      anotar('valoresArbitrarios', [...l.matchAll(/\b[a-z]+(?:-[a-z]+)*-\[[^\]\s]+\]/g)].length);
      for (const m of l.matchAll(/fontSize:\s*(\d+)/g)) { anotar('fontSizeSuelto'); if (Number(m[1]) < 12) anotar('textoMenorA12', 1, ` ${m[1]}px`); }
      for (const m of l.matchAll(/\btext-\[(\d+)px\]/g)) if (Number(m[1]) < 12) anotar('textoMenorA12', 1, ` ${m[1]}px`);
      anotar('radioSuelto', [...l.matchAll(/borderRadius:\s*\d+/g)].length);
      if (!enSuperficie) anotar('sombrasSueltas', [...l.matchAll(/\bshadow(?:Color|Opacity|Radius|Offset)\s*:/g)].length);
      // Sólo el borde completo: los separadores (border-t / border-b) y los de fila los permite 02-tokens-objetivo.
      anotar('bordesLinea', [...l.matchAll(/\bborder(?: border-dashed)? border-line\b|\bborder-dashed border-line\b/g)].length);
    });
  }
}

const hoy = Object.fromEntries(Object.entries(hallazgos).map(([k, v]) => [k, v.length]));
hoy.adopcionSuperficiePct = pantallas === 0 ? 0 : Math.round((pantallasConSuperficie / pantallas) * 100);
const info = { pantallas, pantallasConSuperficie };

const detalle = valor('--detalle', '');
if (detalle) {
  if (!hallazgos[detalle]) { process.stderr.write(`Métrica desconocida «${detalle}». Opciones: ${Object.keys(METRICAS).join(', ')}\n`); process.exit(2); }
  process.stdout.write(`${hallazgos[detalle].slice(0, 400).join('\n')}${hallazgos[detalle].length > 400 ? `\n… y ${hallazgos[detalle].length - 400} más` : ''}\n`);
  process.exit(0);
}

if (tiene('--guardar-base')) {
  mkdirSync(dirname(RUTA_BASE), { recursive: true });
  writeFileSync(RUTA_BASE, `${JSON.stringify({ fecha: new Date().toISOString().slice(0, 10), ...info, metricas: hoy }, null, 2)}\n`);
  process.stdout.write(`Línea base guardada en ${relative(RAIZ, RUTA_BASE).split(sep).join('/')}\n`);
}

const base = existsSync(RUTA_BASE) ? JSON.parse(readFileSync(RUTA_BASE, 'utf8')).metricas : null;
const objetivos = existsSync(RUTA_OBJETIVOS) ? JSON.parse(readFileSync(RUTA_OBJETIVOS, 'utf8')).metricas : null;

if (tiene('--json')) {
  process.stdout.write(`${JSON.stringify({ ...info, metricas: hoy, base, objetivos }, null, 2)}\n`);
  process.exit(0);
}

const peor = (k, a, b) => (METRICAS[k].sentido === 'menor' ? a > b : a < b);
let retrocesos = 0;
let sinObjetivo = 0;
const filas = Object.keys(METRICAS).map((k) => {
  const v = hoy[k];
  const b = base?.[k];
  const o = objetivos?.[k];
  let estado = '';
  if (b !== undefined && peor(k, v, b)) { estado = 'RETROCESO'; retrocesos++; }
  else if (b !== undefined && v !== b) estado = 'mejora';
  if (tiene('--estricto') && o !== undefined && peor(k, v, o)) { estado = estado === 'RETROCESO' ? estado : 'falta'; sinObjetivo++; }
  return { k, v, b, o, estado };
});

const ancho = Math.max(...Object.values(METRICAS).map((m) => m.texto.length));
process.stdout.write(`\nAuditoría visual — ${pantallas} pantallas (${pantallasConSuperficie} usan Superficie)\n\n`);
process.stdout.write(`${'Métrica'.padEnd(ancho)}  ${'hoy'.padStart(5)}  ${'base'.padStart(5)}  ${'meta'.padStart(5)}  estado\n`);
for (const f of filas) {
  process.stdout.write(`${METRICAS[f.k].texto.padEnd(ancho)}  ${String(f.v).padStart(5)}  ${String(f.b ?? '-').padStart(5)}  ${String(f.o ?? '-').padStart(5)}  ${f.estado}\n`);
}
process.stdout.write('\n');
if (!base) process.stdout.write('Todavía no hay línea base: corré «node scripts/auditar-visual.mjs --guardar-base» antes de empezar a cambiar cosas.\n');
if (retrocesos) { process.stderr.write(`✘ ${retrocesos} métrica(s) empeoraron respecto de la línea base. Corregilo antes de seguir (mirá el detalle con --detalle <métrica>).\n`); process.exit(1); }
if (sinObjetivo) { process.stderr.write(`✘ Faltan ${sinObjetivo} objetivo(s) para cerrar la etapa visual.\n`); process.exit(1); }
process.stdout.write(base ? '✔ Sin retrocesos respecto de la línea base.\n' : '');
