import { describe, expect, it, vi } from 'vitest';

import type { AlternativasService } from '../../alternativas/alternativas.service';
import type { CatalogoService } from '../../catalogo/catalogo.service';
import type { HerramientasService } from '../../herramientas/herramientas.service';
import type { RagService } from '../../../infraestructura/rag/rag.service';
import { ejecutarTool, TOOLS_CHAT, type DependenciasTools } from './index';

const ID_VALIDO = '11111111-1111-4111-8111-111111111111';
const ID_VALIDO_2 = '22222222-2222-4222-8222-222222222222';

function depsFalsas(sobrescribir: Partial<{ [K in keyof DependenciasTools]: unknown }> = {}): DependenciasTools {
  return {
    catalogo: sobrescribir.catalogo as CatalogoService,
    herramientas: sobrescribir.herramientas as HerramientasService,
    alternativas: sobrescribir.alternativas as AlternativasService,
    rag: sobrescribir.rag as RagService,
  };
}

describe('catálogo de tools del chat', () => {
  it('expone las 10 tools con nombres únicos', () => {
    const nombres = TOOLS_CHAT.map((t) => t.name);
    expect(nombres).toEqual([
      'buscar_farmaco',
      'interacciones_de_un_farmaco',
      'listar_condiciones_clinicas',
      'listar_grupos_alergenicos',
      'interacciones_farmaco_farmaco',
      'condicion_alergia',
      'ajuste_renal',
      'ajuste_hepatico',
      'alternativas_terapeuticas',
      'ficha_tecnica',
    ]);
    expect(new Set(nombres).size).toBe(nombres.length);
  });
});

describe('ejecutarTool — dispatcher', () => {
  it('una tool desconocida tira un error claro (nunca un crash silencioso)', async () => {
    await expect(ejecutarTool('tool_que_no_existe', {}, depsFalsas())).rejects.toThrow(/desconocida/);
  });

  it('"buscar_farmaco" llama a CatalogoService.buscarPrincipiosActivos con la consulta validada', async () => {
    const buscarPrincipiosActivos = vi.fn().mockResolvedValue([{ id: ID_VALIDO, nombre: 'Enalapril' }]);
    const deps = depsFalsas({ catalogo: { buscarPrincipiosActivos } });

    const resultado = await ejecutarTool('buscar_farmaco', { consulta: 'enalapril' }, deps);

    expect(buscarPrincipiosActivos).toHaveBeenCalledWith('enalapril', 10);
    expect(resultado).toEqual([{ id: ID_VALIDO, nombre: 'Enalapril' }]);
  });

  it('"interacciones_de_un_farmaco" llama a CatalogoService.interaccionesDeUnFarmaco, no pide un segundo fármaco', async () => {
    const interaccionesDeUnFarmaco = vi.fn().mockResolvedValue({ farmaco: 'Paracetamol', total: 0, grupos: [] });
    const deps = depsFalsas({ catalogo: { interaccionesDeUnFarmaco } });

    await ejecutarTool('interacciones_de_un_farmaco', { principioActivoId: ID_VALIDO }, deps);

    expect(interaccionesDeUnFarmaco).toHaveBeenCalledWith(ID_VALIDO);
  });

  it('"interacciones_farmaco_farmaco" no reimplementa nada: llama directo a HerramientasService.interacciones', async () => {
    const interacciones = vi.fn().mockResolvedValue({ pares: [] });
    const deps = depsFalsas({ herramientas: { interacciones } });

    await ejecutarTool(
      'interacciones_farmaco_farmaco',
      { principioActivoIds: [ID_VALIDO, ID_VALIDO_2] },
      deps,
    );

    expect(interacciones).toHaveBeenCalledWith({ principioActivoIds: [ID_VALIDO, ID_VALIDO_2] });
  });

  it('"alternativas_terapeuticas" llama a AlternativasService.delCatalogo, no a paraPrescripcion/paraCandidato', async () => {
    const delCatalogo = vi.fn().mockResolvedValue({ farmacoOrigen: 'Enalapril', alternativas: [] });
    const deps = depsFalsas({ alternativas: { delCatalogo } });

    await ejecutarTool('alternativas_terapeuticas', { principioActivoId: ID_VALIDO }, deps);

    expect(delCatalogo).toHaveBeenCalledWith(ID_VALIDO);
  });

  it('"ficha_tecnica" sin resultados le avisa al modelo que no hay ficha indexada, no inventa', async () => {
    const buscar = vi.fn().mockResolvedValue([]);
    const deps = depsFalsas({ rag: { buscar } });

    const resultado = await ejecutarTool('ficha_tecnica', { pregunta: '¿algo sin ficha?' }, deps);

    expect(resultado).toEqual({ sinFichas: true, mensaje: 'Todavía no hay fichas técnicas indexadas.' });
  });

  it('una entrada inválida no llega al servicio real', async () => {
    const interacciones = vi.fn();
    const deps = depsFalsas({ herramientas: { interacciones } });

    await expect(
      ejecutarTool('interacciones_farmaco_farmaco', { principioActivoIds: [ID_VALIDO] }, deps),
    ).rejects.toThrow(/Entrada inválida/);
    expect(interacciones).not.toHaveBeenCalled();
  });
});
