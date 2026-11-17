/**
 * Arma la demo web en `apps/mobile/dist-demo/` (carpeta que se sube a Vercel).
 *
 *   EXPO_PUBLIC_API_URL=https://gfh-backend.onrender.com pnpm --filter @gfh/mobile demo-web
 *
 * - Exporta la app para web con baseUrl /app (ver app.config.js, GFH_DEMO_WEB).
 * - Le pone alrededor la página con el marco de teléfono (demo-web/marco.html → index.html).
 * - Copia la config de Vercel y la puerta de acceso.
 * - Conserva `.vercel/` y `node_modules/` de la carpeta de salida, para no perder el
 *   vínculo con el proyecto entre un armado y otro.
 *
 * Sólo sube a Vercel lo que está en `dist-demo/`: nada del código fuente.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '..');
const salida = path.join(raiz, 'dist-demo');
const plantilla = path.join(raiz, 'demo-web');

if (!process.env.EXPO_PUBLIC_API_URL) {
  console.error('Falta EXPO_PUBLIC_API_URL (la URL del backend). Ej.: https://gfh-backend.onrender.com');
  process.exit(1);
}

fs.mkdirSync(salida, { recursive: true });
for (const nombre of fs.readdirSync(salida)) {
  if (nombre === '.vercel' || nombre === 'node_modules') continue;
  fs.rmSync(path.join(salida, nombre), { recursive: true, force: true });
}

const r = spawnSync(
  'pnpm',
  ['exec', 'expo', 'export', '--platform', 'web', '--output-dir', path.join(salida, 'app'), '--clear'],
  { cwd: raiz, stdio: 'inherit', shell: true, env: { ...process.env, GFH_DEMO_WEB: '1' } },
);
if (r.status !== 0) process.exit(r.status ?? 1);

fs.copyFileSync(path.join(plantilla, 'marco.html'), path.join(salida, 'index.html'));
for (const archivo of ['vercel.json', 'middleware.js', 'package.json']) {
  fs.copyFileSync(path.join(plantilla, archivo), path.join(salida, archivo));
}

// Control: el navegador no debe recibir el motor clínico ni sus reglas.
const dirJs = path.join(salida, 'app', '_expo', 'static', 'js', 'web');
const bundle = fs.readdirSync(dirJs).find((f) => f.endsWith('.js'));
const texto = fs.readFileSync(path.join(dirJs, bundle), 'utf8');
const prohibidas = ['evaluarCockpit', 'procesarReglasInteraccion', 'Claritromicina', 'Espironolactona'];
// Control: la URL del backend quedó incrustada (Metro cachea y puede arrastrar la de otro build).
if (!texto.includes(process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, ''))) {
  console.error('\nERROR: el bundle no contiene EXPO_PUBLIC_API_URL. No se debe subir.');
  process.exit(1);
}
const halladas = prohibidas.filter((p) => texto.includes(p));
if (halladas.length > 0) {
  console.error(`\nERROR: el bundle web contiene ${halladas.join(', ')}. No se debe subir.`);
  process.exit(1);
}
console.log(`\nListo: ${salida}\nBundle ${bundle} sin motor ni reglas.`);
