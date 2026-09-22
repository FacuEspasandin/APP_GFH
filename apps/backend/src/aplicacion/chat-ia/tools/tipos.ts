import type { Tool } from '@anthropic-ai/sdk/resources/messages';

import { AlternativasService } from '../../alternativas/alternativas.service';
import { CatalogoService } from '../../catalogo/catalogo.service';
import { HerramientasService } from '../../herramientas/herramientas.service';
import { RagService } from '../../../infraestructura/rag/rag.service';

/** Las tools nunca reimplementan lógica clínica: llaman directo a estos
 *  servicios reales, los mismos que usan los endpoints HTTP existentes. */
export interface DependenciasTools {
  catalogo: CatalogoService;
  herramientas: HerramientasService;
  alternativas: AlternativasService;
  rag: RagService;
}

export interface DefinicionTool {
  definicion: Tool;
  ejecutar: (deps: DependenciasTools, input: unknown) => Promise<unknown>;
}
