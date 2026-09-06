# Handoff: Ritmistas (listado + ficha)

## Overview
Listado y ficha de "ritmistas" (miembros de una batería de carnaval) para la app Bossa. Existen dos contextos que comparten look & feel pero muestran datos distintos:
- **Base de Datos → Ritmistas**: padrón histórico, atemporal (todas las ediciones).
- **Carnaval [año] → Ritmistas**: estado de esa edición específica (confirmación, deuda de indumentaria, beneficios/rifas).

## About the Design Files
Los archivos de este bundle son **referencias de diseño en HTML** (un prototipo interactivo hecho como Design Component), no código de producción. La tarea es **recrear este diseño en el stack real del proyecto** (React/Vue/lo que ya use el codebase, o el framework más apropiado si no hay uno) usando sus propios componentes y patrones, no copiar el HTML tal cual.

## Fidelity
**Alta fidelidad (hifi)**: colores, tipografía, espaciados y estados están definidos con valores exactos (ver Design Tokens). Recrear pixel-a-pixel usando las librerías/componentes ya existentes en el codebase de destino.

## Screens / Views

### 1. Ritmistas — Base de Datos (`section: 'ritmistasDb'`)
**Propósito**: ver y buscar el padrón histórico completo, filtrar por naipe, abrir la ficha de un ritmista.

**Layout**:
- Barra superior: input de búsqueda (flex:1) + botón primario "+ Nuevo ritmista", `gap:10px`.
- Fila de chips de filtro por naipe (Todos, Caixas, Repiques, Surdos, Tamborins, Chocalho, Frigideiras, Cuicas), `gap:8px`.
- **Desktop**: tabla (`<table>`) con columnas: N°, Nombre y Apellido (avatar circular 28px + nombre, subrayado sutil = link), DNI, Naipe (histórico), Talle de Remera, Calzado, Ediciones, chevron `›`. Fila completa clickeable → abre ficha.
- **Mobile**: lista de filas apiladas (avatar + nombre + naipe histórico + n° ediciones), sin tabla.

### 2. Ritmistas — Carnaval [edición] (`section: 'ritmistasEd'`)
**Propósito**: gestionar el roster de la edición activa: confirmación, naipe asignado, contacto, abrir ficha.

**Layout**:
- Fila de acciones (alineada a la derecha): "Pendientes" (filtra a No confirmado), "Importar ritmistas", "+ Registrar pago", botón primario "+ Agregar ritmista".
- 3 metric cards en grid (`grid-template-columns: repeat(auto-fit, minmax(180px,1fr))`, `gap:12px`):
  1. **Ritmistas totales**: número grande, estático.
  2. **Naipe** (con flechas ‹ › en el header de la card): cicla entre los 7 naipes, muestra cuántos ritmistas tiene ese naipe en la edición.
  3. **Estado** (mismas flechas ‹ ›): cicla entre Confirmado / En duda / No confirmado, número coloreado según el estado (verde/ámbar/rojo).
- Fila de filtros: dropdown "Todos los estados" (Confirmado/En duda/No confirmado) + chips de naipe (mismo componente que en Base de Datos, con conteo `Nombre · n`).
- Input de búsqueda "Filtrar ritmistas...".
- **Desktop**: tabla con columnas: ID (código `CX-01` = abreviatura de naipe + índice), Nombre (avatar+link), DNI, Contacto (ícono WhatsApp circular verde `#E7F9EC` bg que abre `wa.me/549<dni>`, ícono mail), Naipe esta edición, Estado (badge pill), chevron. Fila clickeable → abre ficha.
- **Mobile**: lista apilada con avatar, nombre, naipe + resumen de cuota, badge de estado.

### 3. Ficha de ritmista (pantalla completa, no modal) — ambos contextos
Se abre reemplazando el contenido de la sección (botón "← Volver" arriba, y "Editar"/"Guardar"/"Cancelar" a la derecha).

**Layout**: `display:flex; flex-wrap:wrap; gap:16px`.
- **Columna izquierda** (ancho fijo ~300-320px), dos cards apiladas (`flex-direction:column; gap:16px`):
  1. **Card identidad**: avatar 48px + nombre (editable) + badge de estado (solo en edición de Carnaval). Debajo: DNI, Teléfono, Fecha de nacimiento + edad calculada, y una fila de 2 columnas con Talle de remera / Calzado. Todos los campos son inputs cuando `editingFicha` está activo.
  2. **Card naipe/historial**: "Naipe actual" (editable en modo edición), texto de historial generado ("De 2023 a 2026 tocó Caixa."), y debajo una mini-tabla con el timeline año→naipe (solo Base de Datos; en Carnaval está vacío).
- **Columna derecha** (flex:3, min-width 380px):
  1. **Banner de saldo** (fondo negro/`--fg`, texto blanco): "Saldo pendiente — indumentaria" (label), monto grande en mono, sub-línea "Total X · Pagado Y". Solo tiene sentido en ficha de edición (en histórico se muestra "—").
  2. **Tabs**: "Indumentaria" / "Beneficios" (antes "Rifas" — se renombró a Beneficios).
     - Tab Indumentaria: lista de ítems (Remera oficial, Pantalón, Zapatillas, Medias, Gorra, Accesorio de naipe) con estado Entregado/Pendiente, más inputs editables de Total traje / Pagado.
     - Tab Beneficios: 3 metric cards (Beneficios asignados, Vendidos, Rendido), editables.

## Interactions & Behavior
- Click en fila de tabla o card mobile → abre la ficha (`fichaOpen` state, guarda `{type: 'db'|'ed', data: row}`).
- Botón "Editar" → todos los campos de la ficha pasan a `<input>` controlados por un objeto `draft`; "Guardar" persiste el draft sobre el registro (por DNI) y sale de edición; "Cancelar" descarta el draft.
- Flechas ‹ › en las cards de Naipe/Estado ciclan índice con wraparound (`(i - 1 + n) % n`).
- Filtros de naipe (chips) y estado (dropdown) se aplican sobre la lista antes de renderizarla; también recalculan las 3 metric cards según el naipe seleccionado.
- Ícono WhatsApp: `<a target="_blank" href="https://wa.me/549{dni sin puntos}">`, `stopPropagation` para no abrir la ficha al hacer click.
- No hay loading/error states (es un prototipo con datos mock in-memory).

## State Management
- `fichaOpen: {type, data} | null` — controla si se muestra la ficha.
- `fichaTab: 'indumentaria' | 'rifas'`.
- `editingFicha: boolean`, `draft: object` — buffer de edición.
- `naipeFilterDb`, `naipeFilterEd`, `estadoFilterEd`: strings de filtro ('Todos' = sin filtro).
- `naipeStatIndex`, `estadoStatIndex`: índices de las cards cicladas.
- `ritmistasDbRaw`, `ritmistasEdRaw`: arrays de datos (fuente de verdad; el guardado de la ficha hace `.map()` reemplazando por DNI).
- Cálculos derivados (no state): edad desde fecha de nacimiento, timeline parseado desde string `naipeHistory`, saldo/pendiente = total − pagado.

## Design Tokens
Tomados de `brand-tokens.css` (sistema "GoClub" adoptado por Bossa), modo claro por defecto:
- `--bg:#FAFAF7` `--bg-elevated:#FFFFFF` `--bg-muted:#F2F1EC` `--border:#E7E5DE` `--border-strong:#D6D3CA`
- `--fg:#0A0A0A` `--fg-secondary:#4A4A48` `--fg-tertiary:#8B8A85`
- `--primary`: color de marca, seleccionable por institución (swatch picker en Configuración) — no hardcodear.
- `--success:#16A34A` (bg soft `#ECFDF3`) · `--warning:#B45309` (bg soft `#FEF3C7`) · `--danger:#DC2626` (bg soft `#FEF2F2`)
- Radios: `--r-md:8px` (botones/inputs) `--r-lg:12px` (cards)
- Sombra card: `0 1px 2px rgba(10,10,10,.06), 0 1px 1px rgba(10,10,10,.04)`
- Tipografía: **Geist** (UI general, weight 400-800) + **Geist Mono** (todo número: montos, DNI, calzado, IDs, timeline) con `font-variant-numeric: slashed-zero` y letter-spacing ~0.02-0.05em.
- Badges de estado: pill (`border-radius:999px`, `height:20px`), bg = color soft, texto = color sólido, borde = mismo color soft.

## Assets
Ninguna imagen — solo SVG inline (ícono WhatsApp, ícono mail, íconos de nav). El logo institucional (aro + líneas tipo parche de tarol) se sube por el usuario en Configuración y se pinta con `currentColor` = `--primary`.

## Files
- `Bossa App.dc.html` — prototipo completo (incluye Dashboard, Naipes, Inventario, Presupuesto, Agenda además de Ritmistas/Ficha; las secciones relevantes están marcadas `section === 'ritmistasDb'`, `'ritmistasEd'`, y el bloque `fichaOpen`).
