import { describe, expect, it } from 'vitest';

import { esSubtitulo, parsearMarkdownLite } from './markdown-lite';

describe('parsearMarkdownLite', () => {
  it('un párrafo simple sin negrita da un solo run', () => {
    const bloques = parsearMarkdownLite('Todo bien, sin interacciones conocidas.');
    expect(bloques).toEqual([
      { tipo: 'parrafo', runs: [{ texto: 'Todo bien, sin interacciones conocidas.', negrita: false }] },
    ]);
  });

  it('separa negrita inline en runs', () => {
    const bloques = parsearMarkdownLite('Severidad **ALTA** según el motor.');
    expect(bloques).toEqual([
      {
        tipo: 'parrafo',
        runs: [
          { texto: 'Severidad ', negrita: false },
          { texto: 'ALTA', negrita: true },
          { texto: ' según el motor.', negrita: false },
        ],
      },
    ]);
  });

  it('una línea que empieza con "- " y las siguientes también arman una lista', () => {
    const bloques = parsearMarkdownLite('Interactúa con:\n\n- **AINES** — sangrado\n- **Quinolonas** — INR');
    expect(bloques).toEqual([
      { tipo: 'parrafo', runs: [{ texto: 'Interactúa con:', negrita: false }] },
      {
        tipo: 'lista',
        items: [
          [
            { texto: 'AINES', negrita: true },
            { texto: ' — sangrado', negrita: false },
          ],
          [
            { texto: 'Quinolonas', negrita: true },
            { texto: ' — INR', negrita: false },
          ],
        ],
      },
    ]);
  });

  it('separa bloques por línea en blanco (doble salto)', () => {
    const bloques = parsearMarkdownLite('Primer párrafo.\n\nSegundo párrafo.');
    expect(bloques).toHaveLength(2);
  });

  it('un solo salto de línea queda DENTRO del mismo párrafo, no lo separa', () => {
    const bloques = parsearMarkdownLite('Línea uno.\nLínea dos.');
    expect(bloques).toHaveLength(1);
    expect(bloques[0]).toMatchObject({ tipo: 'parrafo' });
  });

  it('ignora líneas vacías de más entre bloques', () => {
    const bloques = parsearMarkdownLite('Uno.\n\n\n\nDos.');
    expect(bloques).toHaveLength(2);
  });
});

describe('esSubtitulo', () => {
  it('un párrafo enteramente en negrita es subtítulo', () => {
    const [bloque] = parsearMarkdownLite('**Riesgo de sangrado**');
    expect(esSubtitulo(bloque!)).toBe(true);
  });

  it('negrita parcial dentro de un párrafo NO es subtítulo', () => {
    const [bloque] = parsearMarkdownLite('Severidad **ALTA** hoy.');
    expect(esSubtitulo(bloque!)).toBe(false);
  });

  it('una lista nunca es subtítulo', () => {
    const [bloque] = parsearMarkdownLite('- **AINES** — sangrado');
    expect(esSubtitulo(bloque!)).toBe(false);
  });
});
