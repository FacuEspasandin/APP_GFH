# Los assets de la app

Se generan, no se dibujan a mano:

```bash
node ../../scripts/hacer-iconos.js
```

| Archivo | Tamaño | Para qué |
|---|---|---|
| `icon.png` | 1024×1024 | iOS. **Sin transparencia** — iOS redondea las esquinas él mismo, así que el fondo va sólido |
| `adaptive-icon.png` | 1024×1024 | Android, capa de adelante. El lanzador la enmascara con la forma que quiera y **recorta hasta un tercio de cada lado**, por eso la letra va más chica: tiene que caer entera en la zona segura del centro |
| `splash-icon.png` | 512×512 | La marca sobre el fondo del splash, que lo pone Expo desde `backgroundColor` |
| `favicon.png` | 48×48 | La versión web |

La paleta es la del producto: fondo `#1F5E4A` —el verde de marca, el mismo que
`app.json` ya declaraba para el splash— y la letra en menta `#4FD1A5`. No al
revés: un ícono menta entero se lee como app de consumo, y esto es una
herramienta clínica.

La fuente va incrustada en el generador como data URI. Sin eso Chrome cae a la
del sistema y la «G» sale distinta en cada máquina que corra el script.

## Lo que esto no es

Una identidad de marca. Es una letra bien puesta, coherente con la landing, que
permite compilar y publicar. Si en algún momento pasa por un diseñador, lo único
que hay que respetar son los tamaños y la zona segura de Android.
