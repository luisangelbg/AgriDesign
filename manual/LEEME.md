# Manual de usuario de AgriDesign

El manual se escribe por partes, en HTML, con la misma dinámica que los manuales de PCAPro y PopGeneticsPro. Primero en español; la versión en inglés viene después. Cuando esté completo, las partes se unen en un solo documento y se imprime a PDF.

```
manual/
  manual.css           hoja común: tamaño carta y marco de la portada
  interior.css         estilo de las páginas interiores: hojas blancas, vivos en verde bosque y negro, un color por bloque
  paginar.js           reparte el contenido en hojas tamaño carta (encabezados, números de página, índice)
  img/                 capturas de pantalla de la app
  herramientas/
    captura.html       abre la app, ejecuta una receta de pasos y deja la vista lista para la captura
    unir-manual.pl     une portada y partes en es/manual-completo.html para imprimir el manual completo
    reunir-reglas.pl   copia las reglas de decisión de los capítulos al apéndice B (perl herramientas/reunir-reglas.pl es)
  es/
    00-portada.html    portada blanca: título en español e inglés; un ensayo de campo en bloques al azar visto en
                       perspectiva, rodeado de maíz, chile, jitomate y café, y de una vaca, un borrego y una cabra;
                       abajo, medias con letras, un cuadro latino y una curva de respuesta (todo dibujado con
                       gráficos vectoriales originales; sin hélice de ADN)
    01-introduccion.html  créditos, cómo citar, índice general, cómo leer el manual y capítulo 1:
                       qué es AgriDesign, preguntas que responde, cinco ideas clave, experimentos y datos
                       que acepta, cómo abrirlo, recorrido por la interfaz, los siete ejemplos, flujo de
                       trabajo y cómo leer ANOVA, valores P y letras (capturas app-inicio, app-datos,
                       app-figura y app-anova en img/)
    02-bloque1.html    capítulo 2 · Bloque 1: la portada y la ruta, el simulador de bloques contra azar completo
                       (controles, tarjetas, cuatro prácticas con potencias calculadas por la app), galerías de
                       bloques, tipos de ensayo, diseños y métodos, los siete temas de teoría y cómo citar
                       (capturas b1-*.png en img/)
    03-bloque2.html    capítulo 3 · Bloque 2: la tarjeta de teoría y la tabla larga, formatos y portapapeles,
                       la revisión de la rejilla (con una tabla con errores a propósito), los ocho roles y cómo
                       los propone la app, la estructura detectada y sus comprobaciones, el convertidor de
                       tablas anchas y el ejemplo paso a paso (capturas b2-*.png en img/)
    04-bloque3.html    capítulo 4 · Bloque 3: mirar antes de probar (DE, EE, IC), estadísticos por tratamiento,
                       bloque y combinación con la tabla de dos vías, el CV y sus referencias, la interpretación
                       automática, las nueve figuras exploratorias y el editor, ejemplos de maíz y de jitomate
                       (capturas b3-*.png en img/)
    05-bloque4.html    capítulo 5 · Bloque 4: supuestos en los residuales, calificación A–D, las diez pruebas,
                       parcelas sospechosas, seis gráficos de residuales, transformaciones y Box–Cox (caso del
                       jitomate con aditividad fallida y Use), ruta no paramétrica con Friedman, ejemplos
                       (capturas b4-*.png en img/)
    06-bloque5.html    capítulo 6 · Bloque 5: los trece diseños y sus estratos de error, opciones (SS, α, once
                       pruebas con las letras del frijol), tabla de ANOVA e interpretación, medias ajustadas y
                       Dunnett, factorial de jitomate y parcela dividida con efectos simples, tendencia
                       polinomial, curva y óptimo, contrastes, respuestas transformadas (capturas b5-*.png)
    07-bloque6.html    capítulo 7 · Bloque 6: qué figura para qué resultado, la galería (11 tipos de figura,
                       mapas de campo de respuesta y residuales), estilos predefinidos, editor de estilo,
                       multipanel, formatos, resoluciones y tamaño de letra al ancho final (capturas b6-*.png)
    08-bloque7.html    capítulo 8 · Bloque 7: partes del informe, detalles y secciones, recorrido por el informe
                       del maíz, párrafo de métodos, PDF y paso al manuscrito, contenido del paquete ZIP
                       (capturas b7-*.png)
    09-bloque8.html    capítulo 9 · Bloque 8: planear antes de sembrar, los diez diseños del generador y la
                       semilla, opciones de acomodo, croquis y esqueleto del ANOVA, libreta de campo como
                       plantilla del Bloque 2, repeticiones y potencia (capturas b8-*.png)
    10-apendices.html  apéndices: A formatos de archivo y acomodo por diseño, B reglas de decisión reunidas
                       (las escribe herramientas/reunir-reglas.pl), C glosario inglés–español, D solución
                       de problemas con los mensajes de la app
  en/                  versión en inglés (pendiente)
```

## Ver una parte

Abre el HTML con doble clic. `paginar.js` arma las hojas en cuanto cargan las tipografías y las imágenes. Sin conexión a internet, el navegador usa tipografías del sistema; la paginación se ajusta sola.

## Colores por bloque

Son las franjas de la portada, en este orden, y el acento de cada capítulo (variables de `interior.css`; chips `.k0` … `.kx`).

| Parte | Color | Variable |
|---|---|---|
| Preliminares y capítulo 1 | verde bosque `#1f4d33` | `--b0` |
| 1 Inicio, simulador y teoría | verde campo `#2f7d4f` | `--b1` |
| 2 Datos y roles | verde azulado `#0f766e` | `--b2` |
| 3 Estadística descriptiva | azul cielo `#2b7bb9` | `--b3` |
| 4 Supuestos y transformaciones | ocre `#b7791f` | `--b4` |
| 5 Diseños y ANOVA | naranja tostado `#c2410c` | `--b5` |
| 6 Gráficos de resultados | carmín `#b4234a` | `--b6` |
| 7 Informe | grafito `#334155` | `--b7` |
| 8 Generador de diseños | café tierra `#8a5a2b` | `--b8` |
| Apéndices | negro `#111111` | `--bx` |

## Cómo escribir la siguiente parte

- **Un capítulo es una sección.** Cada capítulo va en `<section class="capitulo" id="cap-bN" data-pestana="BN" data-orden="N+1" style="--acento: var(--bN)">`. `data-orden` fija la altura de la pestaña de color en el borde de la hoja: 1 para el capítulo 1, 2 para el Bloque 1, y así sucesivamente.
- **Recuadros disponibles:** `caja nota`, `caja importante`, `caja teoria`, `caja ejemplo`, `caja regla` (con tabla) y `caja dato`. Para los pasos se usa `ol.pasos`, y para texto de la app `span.ui` y `span.ruta`.
- **Evitar `columns:`.** Las listas en dos columnas se hacen con rejilla (`display: grid`).
- **Capturas a menor ancho.** `<figure class="media">` va al 84 %; un capítulo puede definir `figure.chica` (70 %) y `figure.mini` (50 %) en su propio `<style>`.
- **Capturas sin controles.** Recorta la altura de la ventana para que la captura termine antes de la fila de exportación de la figura, o oculta los controles con `hide:.fig-editor;hide:.fig-tools`.
- **Validar los números.** Los valores que se citan como resultados de la app se comprueban antes de escribirlos.
- **Sin referencias bibliográficas** en el texto (decisión del autor para esta app): se nombran los métodos (Tukey, Levene, Shapiro–Wilk…), no los autores ni los años.
- **Espacio fijo antes de %.** Se escribe `95&nbsp;%`.

## Capturas de pantalla

Con el servidor local de la app en el puerto 8800 (`server.ps1`):

```
msedge --headless=new --hide-scrollbars --window-size=1400,900 --force-device-scale-factor=2 --virtual-time-budget=30000 --screenshot=img/nombre.png "http://localhost:8800/manual/herramientas/captura.html?w=1400&h=900&do=ex:0;step:5;run:anRun;scroll:%23anTable,24"
```

Los pasos de la receta van separados por `;`: `ex:N` (ejemplo N del Bloque 2, desde 0), `step:N`, `run:idBoton`, `wait:ms`, `scroll:selector,desfase`, `click:selector`, `open:selector`, `select:selector=valor`, `set:selector=valor`, `check:selector=true|false`, `cfg:figura.clave=valor`, `hide:selector`, `style:selector=css` (estilo en línea, p. ej. `style:%23transTable%20table=font-size:12px`), `frame:selector`, `scrollin:iframe|elemento,desfase`, `top` y `report` (al final; la página se vuelve el informe del Bloque 7 para imprimirlo con `--print-to-pdf`). En la dirección, `#` se escribe `%23`, la coma dentro de un valor `%2C` y los espacios `%20`.

## Cómo obtener el PDF

El PDF completo en español está en `manual/AgriDesign User's Manual.pdf` (163 hojas). Si se corrige una parte, se vuelve a generar con los pasos siguientes y se reemplaza ese archivo.

**Manual completo**, con el servidor local en marcha:

```
perl herramientas/unir-manual.pl es
Start-Process -Wait 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList '--headless=new','--disable-gpu','--no-pdf-header-footer','--virtual-time-budget=300000','--print-to-pdf=C:\ruta\sin\espacios\manual-es.pdf','http://localhost:8800/manual/es/manual-completo.html'
```

- `unir-manual.pl` escribe `es/manual-completo.html` con la portada, las partes de `01-introduccion.html` a `10-apendices.html` y los estilos propios de cada parte. Ese archivo no se edita: se corrigen las partes y se vuelve a generar.
- Hay que imprimirlo de una sola vez. Unir PDF sueltos pierde los enlaces del índice y reinicia la numeración.
- Edge no escribe el PDF si la ruta de `--print-to-pdf` tiene espacios; imprime en una carpeta sin espacios y copia el archivo.

**Una parte sola**, para revisarla (por ejemplo la portada):

```
Start-Process -Wait 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList '--headless=new','--disable-gpu','--no-pdf-header-footer','--virtual-time-budget=20000','--print-to-pdf=C:\Temp\portada.pdf','http://localhost:8800/manual/es/00-portada.html'
```

Desde el cuadro de impresión del navegador: destino **Guardar como PDF**, márgenes **Ninguno** y **Gráficos de fondo** activado.

## Tipografías

Cormorant (títulos), Crimson Pro (texto de las páginas interiores) y Jost (rótulos y tablas), las tres con licencia SIL Open Font License 1.1, cargadas desde el servicio público de fuentes web. Los números van en Jost.

Todo lo demás es original: ilustraciones, diagramas, el paginador y la herramienta de capturas. No se usan imágenes de terceros.
