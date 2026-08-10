import { Body, type Type, ValidationPipe } from '@nestjs/common';

import { fabricaDeErroresDeValidacion } from './mensajes-validacion';

/**
 * `@Cuerpo(Dto)` — reemplazo de `@Body()` que dice explícitamente contra qué
 * clase validar.
 *
 * Por qué existe: `ValidationPipe` averigua el tipo del parámetro leyendo
 * `design:paramtypes`, metadata que emite `tsc` con `emitDecoratorMetadata`.
 * Nuestro runtime es `tsx` (esbuild) y Vitest, y ninguno de los dos la emite.
 * Sin esa metadata el pipe recibe `metatype === undefined` y **devuelve el
 * cuerpo tal cual, sin validar y sin avisar**. El tsconfig tiene la opción en
 * `true`, así que todo parece correcto mientras nada se valida.
 *
 * Ese agujero dejó pasar contraseñas de 3 caracteres y emails que no son
 * emails, y es el mismo motivo por el que la inyección de dependencias lleva
 * `@Inject()` a mano en todo el backend. La decisión acá es la misma: no
 * depender de metadata implícita, declarar el tipo.
 *
 * `whitelist` descarta lo que el DTO no declara y `forbidNonWhitelisted` lo
 * convierte en 400: un campo de más casi siempre es un cliente desactualizado o
 * alguien probando, y en ninguno de los dos casos conviene aceptarlo callado.
 */

const pipes = new Map<Type, ValidationPipe>();

export function Cuerpo(tipo: Type): ParameterDecorator {
  let pipe = pipes.get(tipo);

  if (!pipe) {
    pipe = new ValidationPipe({
      expectedType: tipo,
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: fabricaDeErroresDeValidacion,
    });
    pipes.set(tipo, pipe);
  }

  return Body(pipe);
}
