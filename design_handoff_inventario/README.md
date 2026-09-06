# Handoff: Inventario (Instrumentos + Repuestos)

## Overview
Módulo de Inventario de la app Bossa. Vive dentro de **Base de Datos** (padrón permanente, sin año — a diferencia de Carnaval [año]). Tiene dos entidades en tabs: **Instrumentos** y **Repuestos**, cada una con dashboard de stock, tabla agrupada clickeable, ficha de detalle por grupo, y dialogs de alta/edición.

## About the Design Files
Los archivos de este bundle son **referencias de diseño en HTML** (un prototipo interactivo hecho como Design Component), no código de producción. La tarea es **recrear este diseño en el stack real del proyecto** (React/Vue/lo que ya use el codebase, o el framework más apropiado si no hay uno) usando sus propios componentes y patrones, no copiar el HTML tal cual.

## Fidelity
**Alta fidelidad (hifi)**: colores, tipografía, espaciados y estados están definidos con valores exactos (ver Design Tokens, compartidos con el resto de la app — ver también `design_handoff_ritmistas/README.md` del mismo proyecto). Recrear pixel-a-pixel usando las librerías/componentes ya existentes en el codebase de destino.

## Data Model

### Instrumento
| Campo | Tipo | Notas |
|---|---|---|
| tipo | string | Uno de 7 valores por defecto (Caixa, Repique, Surdo, Tamborim, Chocalho, Frigideira, Cuica) o uno creado a medida por la batería (combobox con "crear nuevo") |
| marca | string, opcional | Puede estar vacío → se muestra "—" |
| pulgadas | string | Tamaño/subtipo libre (ej. `14"`, `3ra`). Puede estar vacío → "—" |
| tipoCaixa | `'Vazada' \| 'Con cilindro'` | **Solo aplica si tipo === 'Caixa'**; en el resto siempre "—" y no se persiste |
| estado | `'Bueno' \| 'Regular' \| 'Necesita reparación' \| 'De baja'` | Badge pill |
| cantidad | number | Unidades de esta variante exacta (no es "1 instrumento = 1 fila"; una fila agrupa N unidades idénticas) |
| etiqueta | `'Sin etiqueta' \| 'Necesidad' \| 'Para venta'` | Deriva el badge visible (ver abajo) |
| prioridad | `'Urgente' \| 'Deseable'` | **Solo relevante si etiqueta === 'Necesidad'** |

### Repuesto
| Campo | Tipo | Notas |
|---|---|---|
| categoria | `'Cueros' \| 'Bordonas' \| 'Otro'` | Select fijo (no combobox) |
| descripcion | string | Texto libre |
| cantidad | number | |
| etiqueta | igual que Instrumento | |
| prioridad | igual que Instrumento | |

### Etiqueta → Badge derivado
- `etiqueta === 'Necesidad' && prioridad === 'Urgente'` → **"Necesidad urgente"**, rojo (`--danger`)
- `etiqueta === 'Necesidad' && prioridad === 'Deseable'` → **"Necesidad deseable"**, ámbar (`--warning`)
- `etiqueta === 'Para venta'` → **"Para venta"**, verde (`--success`)
- `etiqueta === 'Sin etiqueta'` → sin badge (celda vacía)

### Orden de listas
Las filas/grupos con "Necesidad urgente" siempre van primero.

## Screens / Views

### 1. Inventario — Dashboard + tabla agrupada (`section: 'inventario'`, sin grupo abierto)
**Propósito**: entender de un vistazo el estado del stock (200-300 instrumentos reales) sin leer fila por fila, y navegar a detalle por tipo/categoría.

**Layout**:
- Tabs "Instrumentos" / "Repuestos" (mismo patrón que tabs de ficha: subrayado 2px color primario en el activo).
- Grid de 4 metric cards compactas (`grid-template-columns: repeat(auto-fit, minmax(130px,1fr))`, `gap:10px`): **Total en stock** (card con fondo `--primary` soft), **Necesidad urgente** (número en rojo), **Necesidad deseable** (ámbar), **Para venta** (verde). Todos son sumas de `cantidad`, no conteo de filas.
- Card con gráfico de barra apilada horizontal (`height:14px`, `border-radius`) con 4 segmentos (Necesidad urgente / deseable / Para venta / Sin etiqueta, proporcional a unidades) + leyenda con punto de color + label + conteo debajo.
- Header de sección: label "UNIDADES POR TIPO" (o "...POR CATEGORÍA" en Repuestos) a la izquierda; a la derecha, toggle segmentado "Todos / Necesidad / Para venta" (filtra la tabla de abajo) + botón primario "+ Agregar instrumento" / "+ Agregar repuesto".
- **Tabla agrupada** (una fila por tipo/categoría, no por instrumento individual): columnas Tipo/Categoría (link subrayado), Cantidad (suma), Distribución (mini barra apilada por estado — solo Instrumentos; en Repuestos muestra "N variantes"), chevron. **Fila entera clickeable → abre la ficha de detalle del grupo.**

### 2. Ficha de detalle por grupo (ej. "Surdo") — reemplaza el contenido de la sección
**Propósito**: ver el stock detallado de todas las variantes de un tipo/categoría (ej. Surdo 1ra/2da/3ra con sus estados) y gestionar altas/ediciones ahí mismo.

**Layout**:
- Botón "← Volver a Inventario" arriba.
- Header: avatar/ícono cuadrado (iniciales del tipo, bg `--primary` soft) + nombre del grupo + subtítulo "N variantes en stock" + botón primario "+ Agregar variante" (Instrumentos) / "+ Agregar repuesto" (Repuestos), alineado a la derecha.
- Grid de metric cards (`repeat(auto-fit,minmax(150px,1fr))`): "Total en stock" (destacada) + una card por cada estado presente en ese grupo con su conteo (ej. Bueno: 45, Regular: 15) — en Repuestos, solo "Variantes: N".
- Label "VARIANTES EN STOCK".
- **Desktop**: tabla con columnas Marca, Pulgadas, Tipo de caixa, Estado (badge), Cantidad, Etiqueta (badge), acciones (editar/eliminar, iconos SVG lápiz/tacho). En Repuestos: Descripción, Cantidad, Etiqueta, acciones.
- **Mobile**: cards apiladas (título = marca+pulgadas o descripción, badges de estado/etiqueta, meta "Cantidad: N", acciones arriba a la derecha).

### 3. Dialog alta/edición de Instrumento
**Propósito**: crear o editar una variante de instrumento.

**Layout** (modal ancho 520px, no el modal angosto de 420px usado en otros dialogs de la app):
- Header con ícono cuadrado 42px (iniciales "IN", bg `--primary` soft — **sin emoji**), título ("Nuevo instrumento" / "Editar instrumento"), subtítulo "Instrumento del padrón de inventario", botón cerrar `✕`. Separado del body por `border-bottom`.
- Body con scroll interno, dividido en 3 secciones con label uppercase pequeño (`letter-spacing:0.06em`, color muted):
  1. **Identificación**: 
     - **Tipo de instrumento**: combobox real (input de texto + dropdown de sugerencias que filtra por substring de los 7 tipos default + tipos custom creados antes; si el texto no matchea ninguno, aparece opción "+ Crear "X""; al crear, el tipo queda disponible para futuras variantes). Chevron `▾` decorativo a la derecha del input.
     - **Tipo de caixa** (select Vazada/Con cilindro): **solo visible si Tipo === "Caixa"**, aparece/desaparece dinámicamente.
     - Marca (input, opcional) + Pulgadas/tamaño (input) en fila de 2 columnas.
  2. **Stock**: Estado (select 4 opciones) + Cantidad (input number) en fila de 2 columnas.
  3. **Etiqueta**: Etiqueta (select Sin etiqueta/Necesidad/Para venta) → **Prioridad (select Urgente/Deseable) solo visible si Etiqueta === "Necesidad"**.
- Footer fijo (no scrollea con el body) con `border-top`: "Cancelar" (secundario) + "Guardar instrumento" (primario), ambos `flex:1`.

### 4. Dialog alta/edición de Repuesto
Misma estructura que el de Instrumento (header con iniciales "RP", 3 secciones, footer fijo), pero:
- **Identificación**: Categoría (select fijo Cueros/Bordonas/Otro, no combobox) + Descripción (input texto libre).
- **Stock**: solo Cantidad (no hay Estado en Repuestos).
- **Etiqueta**: igual que Instrumento (Prioridad condicional a Necesidad).

## Interactions & Behavior
- Click en fila de la tabla agrupada → `invGroupFicha = {tab, name}`, muestra la ficha de detalle de ese grupo (no es un modal, reemplaza el contenido de la sección igual que la ficha de Ritmistas).
- "+ Agregar instrumento"/"+ Agregar repuesto" desde el dashboard abre el dialog con Tipo/Categoría vacío; desde la ficha de detalle de un grupo, abre el dialog con el Tipo/Categoría pre-rellenado con el grupo actual.
- Combobox de Tipo: `onFocus` abre el dropdown; escribir filtra en tiempo real; click en una opción o en "+ Crear" selecciona y cierra el dropdown. No hay validación de duplicados más allá de comparar contra tipos existentes (case-insensitive).
- Condicionales del form: "Tipo de caixa" ligado a `tipo === 'Caixa'`; "Prioridad" ligado a `etiqueta === 'Necesidad'`. Deben ocultarse (no solo deshabilitarse) cuando no aplican, y su valor no debería persistir si la condición dejó de cumplirse (en el prototipo, `tipoCaixa` se limpia a "" al guardar si `tipo !== 'Caixa'`).
- Guardar en modo "add" agrega un registro nuevo (id incremental); en modo "edit" reemplaza el registro existente por id.
- Eliminar fila: sin confirmación en el prototipo — **recomendado agregar confirmación en producción** (borrado destructivo).
- Toggle "Todos/Necesidad/Para venta" y tabs "Instrumentos/Repuestos" filtran/cambian la fuente de datos de la tabla agrupada y recalculan métricas + gráfico.
- No hay loading/error states (prototipo con datos mock in-memory).

## State Management
- `inventarioTab: 'instrumentos' | 'repuestos'`
- `invEtiquetaFilter: 'Todos' | 'Necesidad' | 'Para venta'` — filtra la tabla agrupada
- `customTipos: string[]` — tipos de instrumento creados a mano, se suman a los 7 default en el combobox
- `instrumentosRaw`, `repuestosRaw`: arrays de datos (fuente de verdad)
- `invGroupFicha: {tab, name} | null` — controla la ficha de detalle por grupo
- `instrumentoDialogOpen` / `repuestoDialogOpen`: `null | {mode: 'add'} | {mode: 'edit', id}`
- `draftInst` / `draftRep`: buffers de edición del dialog activo
- `tipoComboOpen: boolean` — visibilidad del dropdown del combobox
- Derivados (no state): totales/breakdown por tipo, segmentos del gráfico, orden urgente-primero — todo se recalcula desde `instrumentosRaw`/`repuestosRaw` en cada render, no se persiste aparte.

## Design Tokens
Mismos tokens que el resto de la app (`brand-tokens.css`, sistema "GoClub" adoptado por Bossa) — ver detalle completo en `design_handoff_ritmistas/README.md`. Puntos específicos de Inventario:
- Badges de estado/etiqueta: mismo patrón pill (`border-radius:999px`, `height:20px`, bg soft + texto sólido) usado en Ritmistas.
- Gráfico de barra apilada: mismos colores semánticos (`--danger`, `--warning`, `--success`) + gris neutro (`--border-strong`) para "sin etiqueta"/"resto".
- Iconos de acciones (editar/eliminar): SVG inline `stroke="currentColor"`, 14×14, **no emoji**.
- Modal ancho (dialogs de Inventario): 520px vs. 420px de los modales cortos (ej. alta rápida de Ritmistas) — usar el ancho mayor cuando el form tiene ≥3 secciones/6+ campos.

## Assets
Ninguna imagen — solo SVG inline (iconos de editar/eliminar). Sin logos ni fotos.

## Files
- `Bossa App.dc.html` — prototipo completo de la app. Las secciones de Inventario están marcadas `section === 'inventario'`, con las banderas derivadas `showInventarioList` / `showInventarioGroupFicha`, y los dialogs bajo `instrumentoDialogOpen` / `repuestoDialogOpen`.
