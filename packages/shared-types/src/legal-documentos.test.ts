import { describe, expect, it } from 'vitest';

import { DIAS_DE_GRACIA_BAJA } from './enums';
import { EMAIL_CONTACTO, TIPOS_CONSENTIMIENTO, VERSION_CONSENTIMIENTO, urlPublica } from './legal';
import {
  CONSENTIMIENTO_FOTO,
  CONSENTIMIENTO_VERA,
  DOCUMENTOS_LEGALES,
  PRIVACIDAD,
  type DocumentoLegal,
} from './legal-documentos';

/** Todo el texto de un documento, en una cadena, para buscar adentro. */
function textoDe(doc: DocumentoLegal): string {
  return [
    doc.titulo,
    doc.resumen,
    ...doc.secciones.flatMap((s) => [s.titulo, ...(s.parrafos ?? []), ...(s.items ?? []), ...(s.cierre ?? [])]),
  ].join('\n');
}

const TODO = [
  ...DOCUMENTOS_LEGALES.map(textoDe),
  ...[CONSENTIMIENTO_VERA, CONSENTIMIENTO_FOTO].map((c) =>
    [c.titulo, ...c.puntos, c.aceptacion, c.siNoAcepta].join('\n'),
  ),
].join('\n');

describe('los documentos legales', () => {
  it('hay tres y cada sección tiene título y algo para leer', () => {
    expect(DOCUMENTOS_LEGALES.map((d) => d.clave)).toEqual(['terminos', 'privacidad', 'metodologia']);
    for (const doc of DOCUMENTOS_LEGALES) {
      expect(doc.secciones.length).toBeGreaterThan(3);
      for (const s of doc.secciones) {
        expect(s.titulo.trim()).not.toBe('');
        const contenido = (s.parrafos?.length ?? 0) + (s.items?.length ?? 0) + (s.cierre?.length ?? 0);
        expect(contenido, `${doc.clave} / ${s.titulo}`).toBeGreaterThan(0);
      }
    }
  });

  /*
   * Regla no negociable 7: la app nunca muestra de dónde sale el catálogo de
   * monografías. Un documento público que lo nombre es una filtración.
   */
  it('nunca nombra al proveedor del catálogo', () => {
    expect(TODO).not.toMatch(/farmanuario/i);
  });

  /*
   * Apple lee esto como una aplicación sin terminar. La metodología dice de
   * dónde sale cada dato; no pide disculpas por él.
   */
  it('no dice «borrador», «preliminar» ni «pendiente de validación»', () => {
    expect(TODO).not.toMatch(/borrador|preliminar|pendiente de validaci|sin validar|no (fue|fueron) validad/i);
  });

  it('la privacidad dice el plazo de gracia que usa el código, no otro', () => {
    expect(textoDe(PRIVACIDAD)).toContain(`${DIAS_DE_GRACIA_BAJA} días`);
  });

  it('la privacidad nombra a los dos proveedores que reciben datos por inteligencia artificial', () => {
    const t = textoDe(PRIVACIDAD);
    expect(t).toContain('Anthropic');
    expect(t).toContain('Google Cloud Vision');
  });

  it('todos dicen cómo escribirnos', () => {
    for (const doc of DOCUMENTOS_LEGALES) expect(textoDe(doc)).toContain(EMAIL_CONTACTO);
  });
});

describe('los consentimientos', () => {
  it('cada tipo tiene versión', () => {
    for (const tipo of TIPOS_CONSENTIMIENTO) expect(VERSION_CONSENTIMIENTO[tipo]).toMatch(/^\d+\.\d+$/);
  });

  it('el texto lleva la versión que el backend exige', () => {
    expect(CONSENTIMIENTO_VERA.version).toBe(VERSION_CONSENTIMIENTO.VERA);
    expect(CONSENTIMIENTO_FOTO.version).toBe(VERSION_CONSENTIMIENTO.FOTO);
  });

  it('dicen a quién se envía lo que se escribe o fotografía', () => {
    expect(CONSENTIMIENTO_VERA.puntos.join(' ')).toContain('Anthropic');
    expect(CONSENTIMIENTO_FOTO.puntos.join(' ')).toContain('Google Cloud Vision');
  });

  it('dicen que la foto no se guarda y que se puede retirar el permiso', () => {
    expect(CONSENTIMIENTO_FOTO.puntos.join(' ')).toMatch(/no los guarda/);
    expect(CONSENTIMIENTO_FOTO.puntos.join(' ')).toContain('Perfil → Privacidad');
    expect(CONSENTIMIENTO_VERA.puntos.join(' ')).toContain('Perfil → Privacidad');
  });
});

describe('la dirección pública', () => {
  it('sin dominio no inventa una dirección', () => {
    expect(urlPublica('privacidad')).toBeNull();
  });
});
