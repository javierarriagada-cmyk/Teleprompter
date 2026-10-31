# Recuadro detrás del texto — análisis y láminas (t116u)

Solo documentación y capturas en `docs/pantallas/recuadro-detras/`. **No se tocó `src/` ni `android/`.** Las láminas salen del navegador (Vite + Chrome headless con la app real), no de un teléfono; **nada se probó en un teléfono**.

Viewports usados (de docs / tareas previas):

| Teléfono | Landscape dp | Origen |
|---|---|---|
| moto g86 | **915 × 411** | tarea 89 / memoria de pantallas |
| Redmi 13C | **800 × 360** | tarea 76 / tarea 82 |

Recuadro de hoy: **144 × 81**. Carril de hoy: `--carril-recuadro-h: 168px` (`styles-horizontal.css:31`).

---

## 1. Capas de Grabar de lado (apilamiento)

De atrás hacia adelante. Z-index del WebView; la cámara nativa va **detrás** del WebView.

| Capa | z-index | Archivo:línea | Notas |
|---|---|---|---|
| Cámara nativa (preview) | detrás del WebView | `src/lib/camara.ts:261` (`toBack: true`) | Se ve solo por el hueco del recuadro. |
| Hueco / recuadro (box-shadow opaco alrededor) | **0** | `RecuadroCamara.tsx:397–419` (`data-testid="recuadro-camara"`) | `zIndex: 0`. Pinta el suelo con `boxShadow: 0 0 0 9999px colorFondo`. |
| Destacado de lectura (subrayado) | **-1** *dentro* del contenedor | `TeleprompterView.tsx:1855–1863` | Contexto propio del contenedor. |
| Columna / texto (`contenedor-lectura`) | **1** | `TeleprompterView.tsx:1788–1832` | Ya está **encima** del hueco. |
| Banda de lectura | **2** | `TeleprompterView.tsx:1700–1709` | `pointer-events: none`. De lado solo sobre la columna (incluye carril hoy). |
| Panel de lectura | (sin z propio; con `textoSobreImagen`) | `TeleprompterView.tsx:1732` | Solo fondo de cámara a pantalla completa, no recuadro. |
| Velo de lectura | **3** | `TeleprompterView.tsx:1762–1775` | `pointer-events: none`. De lado solo sobre la columna; hoy **no** tiñe el hueco del recuadro. |
| Asa de arrastre del recuadro (LISTO) | **5** | `RecuadroCamara.tsx:379–395` + capa espejo `TeleprompterView.tsx:1591–1613` | Transparente, misma caja 144×81, `pointer-events: auto`, `touch-action: none`. Solo mientras es arrastrable. |
| Punto grabando | **10** | `styles.css` `.punto-grabando` (~1780) / montaje `TeleprompterView.tsx:1672` | |
| Empezar / controles de riel | **10** | `TeleprompterView.tsx:1380–1385`, `~2120` | Botones en rieles; el envoltorio del riel **no** arma stacking propio (`styles-horizontal.css:34–36`). |
| Fondo de riel (`.riel-fondo`) | debajo de los botones del riel | `TeleprompterView.tsx:1986`, `2048`; `styles-horizontal.css:58–75` | Capa de fondo del riel, no del texto. |
| Capa panel ficha (menús / paneles) | (compite con botones; sin z propio del envoltorio riel) | `TeleprompterView.tsx:2027–2028` | Fichas y paneles de ajuste. |
| Pastilla de tiempo | **12** | `BarraDeTiempo.tsx:122` | De lado en el riel derecho. |
| Avisos (`AvisoBreve`) | **999** | `AvisoBreve.tsx:138` | Encima de casi todo. |
| Menús (mantener apretado, etc.) | por encima de fichas | `styles.css` botones de menú / paneles | Flotan sobre la toma. |

**Conclusión de apilamiento hoy:** el texto (z1) **ya** pinta encima del hueco (z0). El carril de 168 px es lo que **aleja** la columna del recuadro; no es un problema de z-index del texto vs recuadro.

---

## 2. Qué habría que mover para que el recuadro quede detrás del texto

**No hace falta subir el texto ni bajar el hueco:** el orden z0 / z1 ya es el correcto.

Lo que hay que cambiar (en una tarea futura de código; **esta PR no lo implementa**) es:

1. **Quitar el carril** — poner `--carril-recuadro-h: 0` (o no sumarlo en `rellenoIzqH` / `rellenoDerH`, `TeleprompterView.tsx:1326–1327`) y usar el aire de columna sin recuadro (`--columna-aire-h: 28`, no el de 20 con recuadro).
2. **Tratamiento al cruzar** — añadir la clase ya existente `lectura-sobre-imagen` (opción «detrás» / texto sobre cámara) al contenedor cuando el renglón cruza el hueco, para la sombra de letra. **No inventar otro halo.**
3. **Velo y banda** — hoy su `left`/`right` también suman el carril (`TeleprompterView.tsx:1704–1705`, `1768–1769`). Sin carril, se ensanchan con la columna. Hay que **seguir sin teñir el hueco** (hoy el velo ya evita el carril a propósito; si la columna invade el hueco, el velo no debe tapar la cara — en las láminas de propuesta el velo se oculta en el arnés; en código habría que decidir máscara o no pintar sobre el rect del recuadro).

### Qué puede romperse — arrastre / hit-testing

Hoy el asa (z5) está **encima** del texto (z1) solo en LISTO, con la misma caja del recuadro. Comentario explícito en `RecuadroCamara.tsx:364–370`: el dedo debe mover el recuadro y no el texto.

- **Si se deja el asa z5:** el dedo **no** pierde el recuadro al arrastrar a otra esquina; el snap a las cuatro esquinas (`sigo_recuadro_esquina_h`) sigue igual. El texto debajo no come el pointer.
- **Si alguien bajara el asa bajo el texto:** el scroll/pan del `contenedor-lectura` se comería el gesto y el imán a esquinas fallaría. **No hay que tocar el asa.**
- **Grabando:** el asa no está (no arrastrable); el hueco z0 queda bajo el texto; no hay conflicto de pointer.
- **Renglón vivo cruzando el hueco:** legibilidad depende de `lectura-sobre-imagen`, no del z del asa.

Riesgo visual (no de pointer): en esquinas **arriba**, el renglón vivo (cerca del tercio superior) **cruza** el recuadro; abajo, casi nunca. Ver tabla y esquinas malas.

---

## 3. Tableta: `--carril-recuadro-h: 0` — ¿antecedente?

En `styles-tableta.css:401` (bloque `.layout-tab-h`) el carril lateral es **0**. Pero la tableta **no** deja el texto cruzar el recuadro: reserva una **franja vertical** `--tab-franja-recuadro-h: 192px` (`styles-tableta.css:51`, aplicada en `:191–196`):

- Recuadro abajo → `--tab-reserva-abajo: 192px` (el texto termina arriba del hueco).
- Recuadro arriba → `--tab-texto-arriba` incluye la franja (el texto empieza debajo del hueco).

Además el recuadro de tableta es más grande (256×144 de lado).

**Sirve solo a medias:** confirma que se puede vivir **sin carril lateral**. **No** es precedente de “texto encima del hueco con `lectura-sobre-imagen`”: en tableta el texto y el recuadro **no se solapan**; se apartan en el eje vertical. La propuesta del teléfono es otra: misma columna que sin recuadro y solape con el tratamiento «detrás».

---

## 4. Medidas — columna y caracteres por renglón

Fuente: capturas del arnés (`medidas.json`), letra 24, guion largo fijo. `charsApprox` ≈ ancho / (0.55 × fontSize).

| Dispositivo | Variante | Ancho columna (px) | ~caracteres/renglón | Notas |
|---|---|---|---|---|
| moto g86 915×411 | **Hoy** (carril 168 + aire 20) | **455** | **~39** | Casi como de pie. |
| moto g86 915×411 | **Propuesta** (sin carril + aire 28) | **607** | **~52** | Igual que sin recuadro. |
| Redmi 800×360 | **Hoy** (carril 168 + aire 20) | **340** | **~29** | Columna muy estrecha. |
| Redmi 800×360 | **Propuesta** (sin carril + aire 28) | **492** | **~42** | Igual que sin recuadro. |

Ganancia en g86: **+152 px** (~**+13** caracteres). En Redmi: **+152 px** (~**+13** caracteres). En ambos, hoy el carril deja la columna casi de pie; la propuesta recupera el ancho sin recuadro.

---

## 5. Renglón vivo vs recuadro (cuatro esquinas)

Marca naranja = banda / renglón vivo. Azul punteado = recuadro 144×81.

| Esquina | ¿Cruza el vivo el recuadro? (propuesta) | Lectura |
|---|---|---|
| der-abajo | **No** (en g86 medido) | Bien: el vivo está arriba; el hueco abajo a la derecha no lo tapa. |
| izq-abajo | **No** (esperado / medido en láminas) | Bien, mismo motivo. |
| der-arriba | **Sí** | **La más delicada:** el vivo cae sobre el hueco. Con `lectura-sobre-imagen` se lee, pero el contraste pelea con la cara/fondo de cámara. |
| izq-arriba | **Sí** (simétrico) | Igual de delicada. |

### Esquinas que se ven mal (no se disimulan)

- **Arriba derecha e izquierda (propuesta):** el renglón vivo **cruza** el recuadro. El lector puede perder la palabra un instante si la cámara es muy clara/oscura respecto de la letra, aun con el halo «detrás». Es el trade-off central de la propuesta: más ancho de columna a cambio de solape en las esquinas altas.
- **Abajo:** se ven tranquilas; el vivo no cruza.
- Controles visibles: los rieles siguen fuera del texto (nada de controles flotando, círculo o pastilla sobre renglones — rechazo de tarea 82).

---

## 6. Qué ya está rechazado (no vuelve)

- Controles flotando encima del texto.
- Círculo o pastilla tapando renglones.
- Pantalla vertical estirada de lado (tarea 82).

---

## 7. Láminas

Carpeta: `docs/pantallas/recuadro-detras/laminas/`

- `comparativa-{g86|redmi}-{oscuro|claro}-{listo|grabando|controles}.png` — hoy | propuesta, cuatro esquinas por hoja.
- Capturas crudas: `docs/pantallas/recuadro-detras/capturas/`.
- Arnés (no es src): `docs/pantallas/recuadro-detras/herramientas/capturar.cjs`.

Overrides **solo en el arnés** (nunca en src): `--carril-recuadro-h: 0`, aire 28, clase `lectura-sobre-imagen`, velo oculto en propuesta.
