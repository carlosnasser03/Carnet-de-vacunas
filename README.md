# Carnet

Carnet de vacunación digital para mascotas. Registra las dosis aplicadas,
calcula sola la siguiente fecha y lleva la bitácora de enfermedades y
medicamentos.

PWA sin build, sin dependencias y sin servidor: HTML, CSS y módulos ES nativos.
Los datos viven en `localStorage` del dispositivo.

## Cómo correrlo

Necesita `http://` (no `file://`): los módulos ES y el service worker no cargan
desde el sistema de archivos.

```bash
node tools/serve.mjs
```

Y abre <http://localhost:5173>. Cualquier servidor estático sirve igual.

Para instalarla como app: abre el sitio en el teléfono y usa "Agregar a la
pantalla de inicio".

## Estructura

```
index.html              Esqueleto y barra superior
css/styles.css          Sistema visual completo (tokens, componentes, impresión)

js/app.js               Ruteo, estado de interfaz y despacho de acciones
js/vistas.js            Funciones puras: datos + estado de UI -> HTML
js/hojas.js             Diálogos de captura (mascota, dosis, episodio)
js/ui.js                Primitivas de presentación (escapado, toast, insignias)

js/store.js             Estado y lógica de dominio. No conoce el navegador
js/persistencia.js      Adaptador de almacenamiento + durabilidad del origen
js/protocolos.js        Catálogo de vacunas y preventivos por especie
js/fecha.js             Aritmética y formato de fechas
js/calendario.js        Traduce filas del carnet a eventos con alarmas
js/ics.js               Escritura del archivo iCalendar
js/imagen.js            Reducción de fotos antes de guardarlas
js/instalar.js          Instalación en la pantalla de inicio

sw.js                   Service worker (red primero, caché de respaldo)
tools/serve.mjs         Servidor estático mínimo para desarrollo
tools/make-icons.mjs    Genera los PNG del manifest desde icons/icon.svg
PRODUCT.md              Usuarios, propósito, principios de diseño
DESIGN.md               Tema visual, paleta, tipografía, layout
```

### Dependencias entre módulos

Van en una sola dirección, sin ciclos:

```
app.js  ->  vistas.js, hojas.js, calendario.js, instalar.js
vistas.js, hojas.js  ->  store.js, ui.js, protocolos.js, fecha.js
store.js  ->  persistencia.js, protocolos.js, fecha.js
ui.js  ->  fecha.js
```

`ui.js` no conoce el dominio y `store.js` no conoce el navegador. El
almacenamiento entra por inyección: `store.usarAlmacen(otro)` acepta cualquier
objeto con `leer` / `escribir` / `borrar`, así que migrar a IndexedDB o meter un
doble en memoria para pruebas no toca la lógica de dominio.

Para regenerar los iconos después de tocar `icons/icon.svg`, hay que replicar la
geometría en el arreglo `FORMAS` de `tools/make-icons.mjs` y correr
`node tools/make-icons.mjs`. El script rasteriza a mano y codifica PNG con
`zlib`; no lee el SVG.

## Decisiones que vale la pena conocer

**El recordatorio se entrega por calendario, no por notificación push.** En iOS
las notificaciones web solo funcionan si el usuario instala la PWA en la pantalla
de inicio, y la mayoría no lo hace. Un archivo `.ics` entra al calendario que la
persona ya revisa todos los días, funciona en cualquier sistema y no necesita
permisos ni servidor. Las alarmas se disparan a las 9 de la mañana (una semana
antes y el día anterior); si la fecha ya venció, el evento se agenda para mañana
y se marca como atrasado, porque un evento con fecha pasada nunca suena.

**Solo aparecen los protocolos que la mascota ya tiene registrados.** La app no
muestra una lista de vacunas que "debería" tener: refleja lo que pasó y deriva la
siguiente fecha. Sugerir sin recetar.

**Los intervalos por defecto salen de las guías WSAVA y son todos editables.** La
frecuencia legal de la rabia cambia por país y los productos antiparasitarios van
de mensuales a trimestrales. Se ajustan desde Ajustes.

**La serie de cachorro se detecta por edad.** Si al momento de aplicar la dosis
la mascota tiene menos de 16 semanas, la sugerencia es un refuerzo a 3 semanas en
lugar del intervalo anual.

## Dónde viven los datos

Todo en el `localStorage` del navegador, bajo una sola llave: **`carnet.v1`**, un
único JSON con mascotas, dosis, eventos e intervalos. Unos 3 KB con dos mascotas;
las fotos son lo único que pesa.

El alcance es **por origen y por navegador**, no por persona:

| Situación | Qué pasa |
|---|---|
| Mismo navegador, mismo dispositivo | Al reabrir está todo |
| Otro dispositivo | Carnet vacío, sin relación con el primero |
| Otro navegador en el mismo dispositivo | También separado |
| Dos personas en un mismo teléfono | Comparten los mismos datos |
| Modo incógnito | Se borra al cerrar |

La app siempre abre en la lista de mascotas, no en la última pantalla visitada.

### Durabilidad

Por defecto el navegador guarda esto como *"mejor esfuerzo"* y puede borrarlo
para liberar espacio. El caso que más importa aquí: **Safari en iOS elimina el
almacenamiento de los sitios que no se visitan en 7 días**, y esta app se abre
tres o cuatro veces al año.

Tres mitigaciones, en orden de efectividad:

1. **Instalarla en la pantalla de inicio.** Deja de contar como sitio web y la
   regla de los 7 días no aplica. La app lo empuja por dos vías: un aviso
   descartable en la pantalla de inicio (solo cuando ya hay una mascota que
   perder) y una sección en Ajustes con los pasos exactos. En Chrome y Edge se
   instala con un botón usando `beforeinstallprompt`; en Safari de iOS no existe
   esa API, así que lo único posible es explicar los dos toques.
2. **`navigator.storage.persist()`**, que la app pide sola al crear el primer
   carnet y a mano desde Ajustes. Los navegadores lo conceden según señales de
   uso o instalación; **puede denegarse, y Ajustes muestra el resultado real** en
   vez de dar por hecho que funcionó.
3. **Exportar el respaldo JSON.** Es lo único que sobrevive a cambiar de
   teléfono, y por eso está a la vista y no escondido.

## Limitaciones reales

- **No hay cuenta ni sincronización.** Ver la sección anterior: los datos no
  viajan entre dispositivos por sí solos.
- **El almacenamiento es limitado.** Las fotos se reducen a 520 px antes de
  guardarse, pero `localStorage` ronda los 5 MB. Con muchas mascotas con foto se
  puede llenar; la app avisa cuando eso pasa.
- **Esto no sustituye a un veterinario.** Los intervalos son referencias
  generales, no una prescripción.

## Accesibilidad

Verificado con mediciones sobre la página renderizada, no a ojo:

- Contraste WCAG AA en todos los textos, en modo claro y oscuro (medido
  resolviendo cada color OKLCH a sRGB y calculando la razón real contra el fondo
  efectivo de cada elemento).
- Sin desbordamiento horizontal entre 320 px y 1265 px, en todas las vistas.
- El estado sanitario nunca depende solo del color: siempre lleva etiqueta de
  texto y una forma distinta (punto sólido, anillo hueco, barra).
- `prefers-reduced-motion` respetado en toda transición, incluido el giro del
  carnet.
- Hoja de estilos de impresión: el carnet y el historial salen legibles en papel,
  en blanco y negro, con ambas caras visibles.
