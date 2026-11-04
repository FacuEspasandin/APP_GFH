import { RANGOS, type RangoGravedad } from '@gfh/shared-types';
import { Redirect, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useAviso } from '@/ui/aviso';
import { CasillaAceptacion } from '@/ui/casilla';
import { EncabezadoModal } from '@/ui/encabezado-app';
import { EncabezadoHerramienta } from '@/ui/encabezado-herramienta';
import { Skeleton } from '@/ui/estados-sistema';
import { HojaInferior, OpcionHoja } from '@/ui/hoja-inferior';
import {
  AvisoNeutro,
  AvisoPeligro,
  BarraAccion,
  Boton,
  CampoTexto,
  Chip,
  Estado,
  Eyebrow,
  FilaAccion,
  Pantalla,
  Segmentado,
  TituloConEtiqueta,
} from '@/ui/kit';
import { GrupoOpciones, Opcion } from '@/ui/lista-opciones';
import { Pestanas } from '@/ui/pestanas';
import { BadgeConteo, EtiquetaEstado } from '@/ui/severidad';
import { Superficie } from '@/ui/superficie';
import { TarjetaHero, useColoresHero } from '@/ui/tarjeta-hero';
import { useColores } from '@/ui/tema';

/**
 * Catálogo de piezas del kit, en claro y oscuro, con sus estados.
 *
 * Es la referencia contra la que se revisa cualquier pantalla: si una pieza se
 * ve mal acá, se ve mal en todos lados, y se arregla en la pieza. Sólo existe en
 * builds de desarrollo; en uno de producción redirige al inicio.
 *
 * Quedan afuera a propósito `EncabezadoApp` y `MenuInferior` (dependen de la
 * ruta y de la barra de estado) y los estados de pantalla completa
 * (`SinConexion`, `ErrorGenerico`): se revisan en sus pantallas.
 */
export default function Componentes() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Catalogo />;
}

const GRAVEDADES: readonly RangoGravedad[] = [0, 1, 2, 3, 4, 5];

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <View className="mb-6">
      <Eyebrow>{titulo}</Eyebrow>
      {nota ? <Text className="mb-2 text-meta text-ink-suave">{nota}</Text> : null}
      {children}
    </View>
  );
}

function Catalogo() {
  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();
  const { avisar } = useAviso();
  const col = useColores();
  const hero = useColoresHero();

  const [chipSuave, setChipSuave] = useState(true);
  const [chipSolido, setChipSolido] = useState('a');
  const [segmento, setSegmento] = useState<'uno' | 'dos' | 'tres'>('uno');
  const [pestana, setPestana] = useState<'a' | 'b' | 'c'>('a');
  const [marcada, setMarcada] = useState(false);
  const [hoja, setHoja] = useState(false);
  const [texto, setTexto] = useState('');

  return (
    <View className="flex-1 bg-paper">
      <EncabezadoModal titulo="Catálogo de piezas" onCerrar={() => router.back()} />
      <Pantalla>
        <Seccion titulo="Tema" nota="Cambia sólo este teléfono: no toca la preferencia de la cuenta.">
          <Segmentado
            opciones={[
              { valor: 'light', etiqueta: 'Claro' },
              { valor: 'dark', etiqueta: 'Oscuro' },
            ]}
            valor={colorScheme === 'dark' ? 'dark' : 'light'}
            onCambiar={(v) => setColorScheme(v)}
          />
        </Seccion>

        <Seccion titulo="Botón" nota="Píldora en los tres tamaños. Tocá uno para ver el estado presionado.">
          <View className="gap-3">
            <Boton onPress={() => {}}>Primario normal</Boton>
            <Boton variante="secundario" onPress={() => {}}>
              Secundario normal
            </Boton>
            <Boton variante="destructivo" onPress={() => {}}>
              Destructivo normal
            </Boton>
            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <Boton variante="secundario" icono="editar" onPress={() => {}}>
                  Editar
                </Boton>
              </View>
              <View className="flex-1">
                <Boton variante="destructivoSuave" icono="prohibido" onPress={() => {}}>
                  Suspender
                </Boton>
              </View>
            </View>
            <Boton tamano="grande" icono="check" onPress={() => {}}>
              Primario grande con ícono
            </Boton>
            <Boton tamano="grande" variante="secundario" onPress={() => {}}>
              Secundario grande
            </Boton>
            <View className="flex-row gap-3">
              <Boton tamano="chico" onPress={() => {}}>
                Chico
              </Boton>
              <Boton tamano="chico" variante="secundario" onPress={() => {}}>
                Chico
              </Boton>
            </View>
            <Boton deshabilitado onPress={() => {}}>
              Deshabilitado
            </Boton>
            <Boton cargando onPress={() => {}}>
              Cargando
            </Boton>
          </View>
        </Seccion>

        <Seccion titulo="Chip" nota="Suave: varias a la vez. Sólido: una entre varias.">
          <View className="mb-3 flex-row flex-wrap gap-2">
            <Chip texto="Suave activo" activo onPress={() => {}} />
            <Chip texto="Suave inactivo" onPress={() => {}} />
            <Chip texto="Se prende" activo={chipSuave} onPress={() => setChipSuave((v) => !v)} />
          </View>
          <View className="flex-row flex-wrap gap-2">
            {['a', 'b', 'c'].map((k) => (
              <Chip
                key={k}
                variante="solido"
                texto={`Sólido ${k.toUpperCase()}`}
                activo={chipSolido === k}
                onPress={() => setChipSolido(k)}
              />
            ))}
          </View>
        </Seccion>

        <Seccion titulo="Segmentado">
          <View className="gap-3">
            <Segmentado
              opciones={[
                { valor: 'uno', etiqueta: 'Uno' },
                { valor: 'dos', etiqueta: 'Dos' },
                { valor: 'tres', etiqueta: 'Tres' },
              ]}
              valor={segmento}
              onCambiar={setSegmento}
            />
            <Segmentado
              compacto
              opciones={[
                { valor: 'uno', etiqueta: 'mg/dL' },
                { valor: 'dos', etiqueta: 'µmol/L' },
              ]}
              valor={segmento === 'tres' ? 'dos' : 'uno'}
              onCambiar={(v) => setSegmento(v)}
            />
          </View>
        </Seccion>

        <Seccion titulo="Pestañas">
          <Pestanas
            pestanas={[
              { clave: 'a', titulo: 'Resumen' },
              { clave: 'b', titulo: 'Interacciones', conteo: 4 },
              { clave: 'c', titulo: 'Alertas', conteo: 12 },
            ]}
            activa={pestana}
            onCambiar={setPestana}
          />
        </Seccion>

        <Seccion
          titulo="Campo de texto"
          nota="Normal, con rango, implausible (se calcula igual), inválido (no se calcula) y error."
        >
          <CampoTexto etiqueta="Normal" placeholder="Escribí algo" value={texto} onChangeText={setTexto} />
          <CampoTexto etiqueta="Peso · en rango" rango={RANGOS.pesoKg} valor={70} value="70" editable={false} />
          <CampoTexto etiqueta="Peso · implausible" rango={RANGOS.pesoKg} valor={400} value="400" editable={false} />
          <CampoTexto etiqueta="Peso · inválido" rango={RANGOS.pesoKg} valor={0} value="0" editable={false} />
          <CampoTexto etiqueta="Con error" error="Ese correo ya está en uso" value="a@b.c" editable={false} />
          <CasillaAceptacion marcada={marcada} onAlternar={() => setMarcada((v) => !v)}>
            <Text className="text-body text-ink">Entiendo y acepto cómo se tratan mis datos.</Text>
          </CasillaAceptacion>
        </Seccion>

        <Seccion titulo="Etiqueta de estado" nota="Siempre con la palabra: el color no es el único portador.">
          <View className="flex-row flex-wrap gap-2">
            {GRAVEDADES.map((g) => (
              <EtiquetaEstado key={g} rango={g} />
            ))}
          </View>
          <View className="mt-3 flex-row gap-2">
            {[0, 1, 3, 8].map((n) => (
              <BadgeConteo key={n} n={n} />
            ))}
          </View>
          <Superficie className="mt-3 px-3.5 py-3">
            <TituloConEtiqueta titulo="Warfarina + ibuprofeno" etiqueta={<EtiquetaEstado rango={1} />} />
          </Superficie>
        </Seccion>

        <Seccion titulo="Superficie" nota="Tres elevaciones. En oscuro la marca un filo, no la sombra.">
          <View className="gap-3.5">
            {(['plana', 'media', 'alta'] as const).map((e) => (
              <Superficie key={e} elevacion={e} className="px-3.5 py-4">
                <Text className="text-fila font-medio text-ink">{`Elevación ${e}`}</Text>
                <Text className="text-meta text-ink-suave">Relleno 16, esquina de tarjeta.</Text>
              </Superficie>
            ))}
          </View>
        </Seccion>

        <Seccion titulo="Tarjeta protagonista" nota="Una por pantalla como máximo.">
          <TarjetaHero>
            <Text className="text-eyebrow font-fuerte uppercase" style={{ color: hero.suave, opacity: hero.opacidadSuave }}>
              Depuración estimada
            </Text>
            <Text className="text-display font-extra" style={{ color: hero.texto }}>
              54 mL/min
            </Text>
            <Text className="text-body" style={{ color: hero.suave, opacity: hero.opacidadSuave }}>
              Cockcroft-Gault · 72 años · 68 kg
            </Text>
          </TarjetaHero>
        </Seccion>

        <Seccion titulo="Filas">
          <FilaAccion titulo="Fila de acción" detalle="Con una línea de detalle" onPress={() => {}} />
          <FilaAccion titulo="Fila destructiva" destructiva onPress={() => {}} />
          <GrupoOpciones>
            <Opcion primera titulo="Tema" valor="Sistema" icono="sol" onPress={() => {}} />
            <Opcion titulo="Dispositivos" valor="3" icono="dispositivo" onPress={() => {}} />
            <Opcion titulo="Sin acción" valor="Sólo lectura" icono="info" />
            <Opcion titulo="Cerrar sesión" icono="salir" destructiva onPress={() => {}} />
          </GrupoOpciones>
        </Seccion>

        <Seccion titulo="Avisos">
          <AvisoNeutro>Falta el dato de función hepática: la categoría queda en neutro.</AvisoNeutro>
          <AvisoPeligro
            titulo="Esto no se puede deshacer"
            detalle="Se borran el paciente y todo su historial de forma permanente."
          />
          <View className="mt-3.5 flex-row gap-2">
            <Boton tamano="chico" variante="secundario" onPress={() => avisar('Guardado', 'exito')}>
              Éxito
            </Boton>
            <Boton tamano="chico" variante="secundario" onPress={() => avisar('No se pudo guardar', 'error')}>
              Error
            </Boton>
            <Boton tamano="chico" variante="secundario" onPress={() => avisar('Sincronizando', 'info')}>
              Info
            </Boton>
          </View>
        </Seccion>

        <Seccion titulo="Estado vacío">
          <Superficie>
            <Estado
              titulo="Todavía no hay pacientes"
              detalle="Creá el primero para ver su cockpit."
              accion="Crear paciente"
              onAccion={() => {}}
            />
          </Superficie>
        </Seccion>

        <Seccion titulo="Encabezados">
          <Superficie className="mb-3 overflow-hidden">
            <EncabezadoModal titulo="Carga de tratamiento" onCerrar={() => {}} />
          </Superficie>
          <Superficie className="mb-3 overflow-hidden">
            <EncabezadoModal variante="marca" onCerrar={() => {}} />
          </Superficie>
          <View className="-mx-margen overflow-hidden">
            <EncabezadoHerramienta icono="calculadora" titulo="Cockcroft-Gault">
              Estima la depuración de creatinina a partir de edad, peso y creatinina.
            </EncabezadoHerramienta>
          </View>
        </Seccion>

        <Seccion titulo="Carga" nota="El esqueleto del cockpit.">
          <View className="-mx-margen">
            <Skeleton filas={1} />
          </View>
        </Seccion>

        <Seccion titulo="Hoja inferior y barra de acción">
          <Boton variante="secundario" onPress={() => setHoja(true)}>
            Abrir hoja inferior
          </Boton>
          <View className="-mx-margen mt-3.5">
            <BarraAccion>
              <Boton onPress={() => {}}>Guardar</Boton>
            </BarraAccion>
          </View>
        </Seccion>

        <Text className="mb-6 text-center text-meta" style={{ color: col.tenue }}>
          {`Tema activo: ${colorScheme === 'dark' ? 'oscuro' : 'claro'}`}
        </Text>
      </Pantalla>

      <HojaInferior visible={hoja} onCerrar={() => setHoja(false)} titulo="Agregar">
        <OpcionHoja titulo="Fármaco" detalle="Buscar y agregar al tratamiento" icono="capsula" onPress={() => setHoja(false)} />
        <OpcionHoja titulo="Condición" detalle="Diagnósticos del paciente" icono="pulso" onPress={() => setHoja(false)} />
        <OpcionHoja titulo="Eliminar" icono="basura" destructiva onPress={() => setHoja(false)} />
        <OpcionHoja titulo="No disponible" icono="prohibido" deshabilitada />
      </HojaInferior>
    </View>
  );
}
