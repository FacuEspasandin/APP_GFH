#!/usr/bin/env node
// Busca clases de Tailwind escritas en className que NO existen en el CSS que genera la configuración.
// NativeWind las ignora sin avisar: la pantalla queda sin ese estilo y nadie se entera
// (así estuvieron meses `text-titulo` y `rounded-input`).
// Uso (desde la raíz): node scripts/clases-inexistentes.cjs      Sale 1 si encuentra alguna.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const MOBILE = path.join(__dirname, '..', 'apps', 'mobile');
const SALIDA = path.join(os.tmpdir(), 'gfh-clases-out.css');
execSync(`npx tailwindcss -c tailwind.config.js -i global.css -o "${SALIDA}"`, { cwd: MOBILE, stdio: 'ignore' });
const css = fs.readFileSync(SALIDA, 'utf8');

const existentes = new Set();
for (const m of css.matchAll(/(?:^|,)\s*\.((?:\\.|[^\s{,:>+~.[#])+)/gm)) {
  existentes.add(m[1].replace(/\\(.)/g, '$1'));
}

function archivos(d) {
  const out = [];
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) out.push(...archivos(p));
    else if (n.endsWith('.tsx')) out.push(p);
  }
  return out;
}

// Sólo las familias de utilidades que usa la app; el resto (flex, items-center…) no puede quedar sin definir.
const PREFIJO = /^-?(?:m[trblxy]?|p[trblxy]?|w|h|min-w|min-h|max-w|max-h|gap|gap-x|gap-y|text|bg|border|border-[trbl]|rounded|rounded-(?:t|b|l|r|tl|tr|bl|br)|font|tracking|leading|opacity|space-x|space-y)-/;

const faltan = new Map();
for (const p of [...archivos(path.join(MOBILE, 'app')), ...archivos(path.join(MOBILE, 'src'))]) {
  const s = fs.readFileSync(p, 'utf8');
  const cadenas = [];
  for (const m of s.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g)) cadenas.push(m[1] ?? m[2] ?? m[3]);
  for (const m of s.matchAll(/(?:\?|:)\s*'([a-z0-9:/\-[\]%.\s]+)'/g)) cadenas.push(m[1]);
  for (const c of cadenas) {
    for (const t of c.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter(Boolean)) {
      if (!PREFIJO.test(t) || existentes.has(t)) continue;
      if (!faltan.has(t)) faltan.set(t, new Set());
      faltan.get(t).add(path.relative(MOBILE, p).split(path.sep).join('/'));
    }
  }
}

for (const [t, a] of [...faltan].sort()) {
  const lista = [...a];
  console.log(`${t.padEnd(26)} ${lista.slice(0, 3).join(', ')}${lista.length > 3 ? ` … (+${lista.length - 3})` : ''}`);
}
console.log(faltan.size ? `\n✘ ${faltan.size} clase(s) inexistente(s).` : '✔ Todas las clases existen.');
process.exit(faltan.size ? 1 : 0);
