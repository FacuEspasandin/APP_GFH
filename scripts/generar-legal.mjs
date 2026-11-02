/**
 * Arma las páginas públicas de los documentos legales.
 *
 *   pnpm legal        →  landing/dist/{privacidad,terminos,metodologia,soporte}.html
 *
 * Son las direcciones que se cargan en App Store Connect (política de
 * privacidad, soporte) y a las que enlaza la landing. El texto sale de
 * `packages/shared-types/src/legal-documentos.ts`, el mismo que lee la app:
 * una sola fuente, así el documento publicado y el de la aplicación no se
 * despegan.
 *
 * Cada página es un solo archivo, sin dependencias externas ni scripts: se ve
 * igual sin red, y un revisor de Apple la abre sin que nada la bloquee. Claro y
 * oscuro con `prefers-color-scheme`.
 *
 * Se corre con tsx porque importa TypeScript: `node --import tsx scripts/generar-legal.mjs`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as compartido from '../packages/shared-types/src/index.ts';

/* shared-types no es un módulo ESM, así que tsx lo carga como CommonJS y los
   `export *` no se ven como exportaciones con nombre: salen colgados de
   `default`. */
const {
  DOCUMENTOS_LEGALES,
  EMAIL_CONTACTO,
  RESPONSABLE,
  RUTAS_PUBLICAS,
  SOPORTE,
  VIGENTE_DESDE,
} = compartido.default ?? compartido;

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(AQUI, '..', 'landing', 'dist');

const escapar = (t) =>
  String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const PAGINAS = [...DOCUMENTOS_LEGALES, SOPORTE];

/** El enlace de la navegación, sin la barra inicial: las cuatro páginas viven juntas. */
const archivo = (clave) => RUTAS_PUBLICAS[clave].replace(/^\//, '');

const ESTILOS = `
:root{--fondo:#f7f8f6;--papel:#ffffff;--tinta:#1c2421;--suave:#55625c;--linea:#dde3df;--marca:#1f5e4a;--acento:#17604a}
@media (prefers-color-scheme:dark){:root{--fondo:#101513;--papel:#171d1a;--tinta:#e8eeea;--suave:#9aa8a1;--linea:#2a342f;--marca:#5fb596;--acento:#6cc2a3}}
*{box-sizing:border-box}
body{margin:0;background:var(--fondo);color:var(--tinta);font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
header{background:var(--marca);color:#fff;padding:14px 20px}
header .in{max-width:760px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
header strong{letter-spacing:.14em;font-size:15px}
nav{display:flex;gap:16px;flex-wrap:wrap;font-size:14px}
nav a{color:#fff;text-decoration:none;opacity:.8}
nav a[aria-current="page"],nav a:hover{opacity:1;text-decoration:underline}
main{max-width:760px;margin:0 auto;padding:32px 20px 56px}
h1{font-size:30px;line-height:1.2;margin:0 0 8px}
.resumen{color:var(--suave);margin:0 0 4px}
.vigencia{font:13px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--suave);margin:0 0 28px}
section{background:var(--papel);border:1px solid var(--linea);border-radius:12px;padding:18px 20px;margin:0 0 14px}
h2{font-size:17px;line-height:1.3;margin:0 0 10px}
p{margin:0 0 10px}
ul{margin:0 0 10px;padding-left:20px}
li{margin:0 0 6px}
a{color:var(--acento)}
footer{max-width:760px;margin:0 auto;padding:0 20px 40px;color:var(--suave);font-size:14px}
footer p{margin:0 0 6px}
`;

function seccion(s) {
  const partes = [`<h2>${escapar(s.titulo)}</h2>`];
  for (const p of s.parrafos ?? []) partes.push(`<p>${escapar(p)}</p>`);
  if (s.items?.length) partes.push(`<ul>${s.items.map((i) => `<li>${escapar(i)}</li>`).join('')}</ul>`);
  for (const p of s.cierre ?? []) partes.push(`<p>${escapar(p)}</p>`);
  return `<section>${partes.join('')}</section>`;
}

function pagina(doc) {
  const nav = PAGINAS.map(
    (d) =>
      `<a href="${archivo(d.clave)}"${d.clave === doc.clave ? ' aria-current="page"' : ''}>${escapar(d.titulo)}</a>`,
  ).join('');

  const responsable = [RESPONSABLE.nombre, RESPONSABLE.domicilio, RESPONSABLE.identificacion]
    .filter(Boolean)
    .map(escapar)
    .join(' · ');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${escapar(doc.titulo)} — GFH</title>
<meta name="description" content="${escapar(doc.resumen)}">
<style>${ESTILOS}</style>
</head>
<body>
<header><div class="in"><strong>GFH</strong><nav aria-label="Documentos">${nav}</nav></div></header>
<main>
<h1>${escapar(doc.titulo)}</h1>
<p class="resumen">${escapar(doc.resumen)}</p>
<p class="vigencia">Vigente desde ${escapar(VIGENTE_DESDE)}</p>
${doc.secciones.map(seccion).join('\n')}
</main>
<footer>
<p>${responsable}</p>
<p>Contacto: <a href="mailto:${escapar(EMAIL_CONTACTO)}">${escapar(EMAIL_CONTACTO)}</a></p>
</footer>
</body>
</html>
`;
}

mkdirSync(SALIDA, { recursive: true });
for (const doc of PAGINAS) {
  const destino = join(SALIDA, archivo(doc.clave));
  writeFileSync(destino, pagina(doc), 'utf8');
  console.log(`  ${archivo(doc.clave)}`);
}
console.log(`\nListo en ${SALIDA}`);
