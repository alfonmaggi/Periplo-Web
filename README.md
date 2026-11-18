# Periplo Ediciones – sitio web

HTML, CSS y JS puros (sin dependencias). Abrí `index.html` o usá la extensión **Live Server** de VS Code.

## Páginas
`index.html` (inicio) · `catalogo.html` · `producto.html` (ficha de "Mi bosque") · `sobre.html` · `contacto.html`

## Cómo está armado
- Los mockups miden 1512 px de ancho. En el CSS **1rem = 10 px del mockup** y `html { font-size: 100vw / 151.2 }`,
  así el sitio escala y se ve igual que el wireframe en cualquier pantalla de escritorio (tope 1920 px).
- Cada elemento se ubica con variables (`--x`, `--y`, `--w`, `--h`, en px del mockup), por ejemplo
  `style="--x:62;--y:2688;--w:298;--h:400"`.
- Tipografías: **Struggle** (títulos, texto real con `.st`) y **Epilogue** (textos), ambas en `assets/fonts`.
  Los títulos curvados (`titulo-hero.png`, `lema-footer.png`, `titulo-productos.png`) siguen siendo imágenes hasta que lleguen los SVG.

## Pendiente / a reemplazar
- Las tapas, fotos, logo e ilustraciones se recortaron de los wireframes (baja resolución): reemplazalas por los archivos originales con el mismo nombre.
- Datos de contacto y cifras de ejemplo (mail, teléfono, 14 años, 120 libros…).
- Versión mobile: no hay mockups, así que por ahora el sitio escala proporcionalmente.
- Formularios, buscador, filtros y carrito: la parte visual está lista, falta conectarlos a un backend.

## Assets finales ya integrados (inicio)
`header-wave.svg`, `isotipo.svg`, `stat-1..5.svg`, `btn-destino-1..5.svg`, `estanteria.webp` (fila de libros),
`fondo-destinos.jpg` + `vidrio-destinos.svg` (fondo y panel de Destinos).

## Interacciones
- El isotipo del menú y el logo del footer llevan a `index.html`.
- Todos los botones y links tienen hover (nav, buscador, botones de Destinos, filtros, pills, carrito, cantidad, íconos de contacto/footer, libros).
- Libros con tapa limpia (`book--art`): al hacer hover la curva lila sube (CSS, `.book__lift`). Los libros que todavía usan la tapa provisoria (con la curva "horneada") solo se levantan un poco; cuando lleguen sus tapas limpias se activa la animación automáticamente (agregar a `art.json`/`ART` en `build.py`).

## Ficha de producto (Mi bosque)
Visor: `mi-bosque-visor-0..4.webp` (todas con el mismo lienzo de 789×544); las miniaturas (`mi-bosque-th1..4.png`) cambian la imagen y un segundo clic vuelve a la imagen inicial.

## Carrito
`js/main.js`: "Agregar al carrito" suma la cantidad elegida; el contador aparece sobre el ícono del menú y el carrito se abre como panel lateral (cantidades, quitar, total, envío gratis desde $65.000). Se guarda en `sessionStorage` (clave `periplo-cart`) y se mantiene entre páginas. Para sumar otro libro basta con agregar `data-add data-id data-name data-price data-img` a su botón. "Iniciar compra" todavía no está conectado a un pago.

## Puntos de venta (`puntos-de-venta.html`)
- Mapa propio en SVG (sin librerías ni servicios externos): geometría en `js/mapa-data.js` (Natural Earth, proyección Mercator), puntos en `js/puntos-data.js`, lógica en `js/puntos.js`.
- Pestañas Mundo / Argentina / Buenos Aires, botones +/−, arrastrar para mover. Los puntos cercanos se agrupan y al tocar un grupo el mapa se acerca y filtra el listado.
- Cada punto del listado es un botón: centra el mapa, abre la ficha ("Cómo llegar" abre Google Maps) y se marca en el listado. Hay buscador y filtros por zona.
- Para agregar o editar un punto: modificar `puntos_data.py` y regenerar, o editar directamente `js/puntos-data.js` y el listado del HTML. Las ubicaciones están aproximadas por barrio/ciudad.
