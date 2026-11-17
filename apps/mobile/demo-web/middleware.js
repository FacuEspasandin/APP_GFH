// Puerta con usuario y contraseña delante de toda la demo (HTTP Basic).
// Las credenciales salen de las variables de entorno del proyecto en Vercel
// (DEMO_ACCESO_USUARIO y DEMO_ACCESO_CLAVE); nunca van en el código.
// Sin las dos variables la demo NO se abre: falla cerrado.
import { next } from '@vercel/functions';

export const config = { matcher: '/:path*' };

function pedirClave() {
  return new Response('Acceso restringido', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="GFH demostracion", charset="UTF-8"', 'Cache-Control': 'no-store' },
  });
}

function iguales(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export default function middleware(request) {
  const usuario = process.env.DEMO_ACCESO_USUARIO;
  const clave = process.env.DEMO_ACCESO_CLAVE;
  if (!usuario || !clave) return new Response('Demo no configurada', { status: 503 });

  const cabecera = request.headers.get('authorization') ?? '';
  if (!cabecera.startsWith('Basic ')) return pedirClave();

  let credenciales = '';
  try {
    credenciales = atob(cabecera.slice(6));
  } catch {
    return pedirClave();
  }
  const i = credenciales.indexOf(':');
  if (i < 0) return pedirClave();

  const okUsuario = iguales(credenciales.slice(0, i), usuario);
  const okClave = iguales(credenciales.slice(i + 1), clave);
  if (!(okUsuario && okClave)) return pedirClave();

  return next();
}
