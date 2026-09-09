# Handoff: Presupuesto (rediseño)

## Overview
Rediseño visual del módulo Presupuesto de la app Bossa. Vive dentro de **Carnaval [edición]** (a diferencia de Inventario, que vive en Base de Datos). El módulo cubre 6 secciones reales de la batería en un único selector de tabs plano: **Caja general, Fantasía, Remeras, Beneficios, Beneficios distribuidos, Stock de indumentaria**. La lógica de datos/cálculos ya existe y está validada en producción — este handoff es **solo la capa visual**, no toca cómo se calcula nada.

## About the Design Files
El archivo de este bundle es una **referencia de diseño en HTML** (Design Component / prototipo interactivo), no código de producción. La tarea es **recrear este diseño en el stack real del proyecto** usando sus propios componentes (`Table`, `Dialog`, `Select` de shadcn ya disponibles) y patrones, no copiar el HTML tal cual.

## Fidelity
**Alta fidelidad (hifi)**: colores, tipografía y espaciados son los mismos tokens del resto de la app (`brand-tokens.css`, ver `design_handoff_ritmistas/README.md`). Recrear pixel-a-pixel con los componentes ya existentes en el codebase de destino.

## Qué cambió respecto a la versión anterior
La versión anterior repetía la misma receta de "tarjeta + tabla" en las 7 pestañas sin ninguna jerarquía ni diferenciación visual entre "estoy mirando plata" y "estoy mirando inventario". El rediseño:
1. Sacó la pestaña **"Repuestos e instrumentos"** de Presupuesto — ya existe como módulo propio (**Inventario**, en el sidebar); mantenerla ahí era una duplicación sin sentido.
2. Le dio a cada sección de plata un **hero card** consistente (banner negro, igual que el saldo total de Caja) con dos variantes según el tipo de dato: **balance** (Caja, Beneficios, Beneficios distribuidos — un número) o **progreso** (Fantasía, Remeras — gastado vs. presupuestado, con barra).
3. Reemplazó los badges de categoría con **borde de color sin significado** por badges neutros — el color ahora se reserva para el signo del monto (+/-), que es el dato que realmente importa en cada fila.
4. Agregó un **gráfico de torta (donut)** por sección con la distribución de categorías, y **conectó ese color al badge/dot de cada categoría** en las tarjetas de arriba — antes el color no comunicaba nada, ahora sí: "este punto = esta porción del gráfico".
5. **Stock de indumentaria** pasó a tener su propio dashboard (métricas + donut + tabla de talles con barra de progreso de entregas) en vez de compartir el layout genérico de plata.

## Data Model

### Sección de "plata" (Caja, Fantasía, Remeras, Beneficios, Beneficios distribuidos)
| Campo | Tipo | Notas |
|---|---|---|
| hero | `{type:'balance', label, value}` o `{type:'progress', label, spent, budget}` | Balance = un número (puede ser negativo, texto se recolorea a `--danger`). Progress = barra de gastado/presupuestado + monto restante (verde si sobra, rojo si excede) |
| categories | `{label, value}[]` | `value` puede ser negativo (gasto) o positivo (ingreso); alimenta tanto las tarjetas de arriba como el donut (usa `Math.abs`) |
| movements | `{concepto, categoria, fecha, monto, autor}[]` | Tabla de movimientos; `monto` colorea rojo/verde según signo |

### Stock de indumentaria
| Campo | Tipo | Notas |
|---|---|---|
| talles | `{talle, total, entregado}[]` | `pendiente` se deriva (`total - entregado`); barra de progreso por fila = `entregado/total` |
| metrics | Total remeras / Entregadas / Pendientes | mismas tarjetas que Inventario (`metricCardAccent` para el total) |

## Screens / Views

### Presupuesto (`section: 'presupuesto'`)
**Layout común a todas las pestañas**:
- Fila de tabs plana (scroll horizontal en mobile), pill sólida (`background: --fg`, texto invertido) en la activa, sin agrupar por categorías — 6 opciones entran cómodas en una fila.
- Contenido varía según si la pestaña es de "plata" o es "Stock de indumentaria" (única no-monetaria).

**Pestañas de plata** (Caja / Fantasía / Remeras / Beneficios / Beneficios distribuidos):
- **Hero card** negro (`balanceBanner`, igual estilo en las 5): balance = label + número grande; progreso = label + "gastado" grande + "de $X presupuestado" + barra de progreso blanca sobre track translúcido + línea de disponible/excedido en verde/rojo claro.
- Grid de tarjetas de categoría (`repeat(auto-fit,minmax(180px,1fr))`): cada una con un dot de color (mismo color que su porción del donut) + label, y el monto grande abajo (rojo si negativo, texto normal si positivo).
- Card con **donut chart** (conic-gradient CSS, sin SVG) + leyenda a la derecha con dot + label + monto, título "Distribución por categoría".
- Tabla de **Movimientos**: Concepto | Categoría (badge neutro) | Fecha | Monto (bold, coloreado, alineado a la derecha) | Registrado por.

**Stock de indumentaria**:
- Grid de métricas (Total remeras / Entregadas / Pendientes), mismo patrón visual que el dashboard de Inventario.
- Donut (Entregadas vs. Pendientes, verde/ámbar) + leyenda.
- Tabla "Talles y entregas": Talle | Total | Entregadas | Pendientes | Progreso (barra de fill verde sobre track gris).

## Interactions & Behavior
- Click en un tab → cambia `presTab`, recalcula hero/categorías/donut/tabla de esa sección (todo derivado, no hay fetch).
- El donut se construye con `conic-gradient` puro (sin librería de charts ni SVG dibujado a mano) — cada sección de color = `value/total * 360deg` acumulado.
- Los colores de categoría son una paleta fija derivada de los tokens de marca (`--fg`, `--primary` y tints/shades vía `color-mix`), **no** los colores semánticos (`--danger`/`--warning`/`--success`) — esos quedan reservados para significar urgencia/estado en Inventario y para el signo del monto acá. Evitar reusar rojo/ámbar/verde como paleta decorativa de categorías.
- No hay altas/ediciones de movimientos en este prototipo (a diferencia de Inventario) — es una vista de lectura. Si el producto real permite cargar movimientos, agregar el dialog siguiendo el mismo patrón (header con ícono + título, secciones, footer fijo) documentado en `design_handoff_inventario/README.md`.
- No hay loading/error states (datos mock in-memory).

## State Management
- `presTab: string` — key de la sección activa (`caja` por defecto). Ya no existe un nivel de "grupo" (plata/inventario) — se sacó tras el primer feedback.
- Todo lo demás (hero, categorías, donut, tabla) se deriva en cada render a partir de datos mock definidos en el componente — en producción, reemplazar por los datos reales de caja/fantasía/remeras/beneficios/stock que ya calcula el backend.

## Design Tokens
Mismos tokens que el resto de la app (`brand-tokens.css`). Puntos específicos de Presupuesto:
- Hero card: `background: --fg` (negro en claro, `#000` en oscuro), texto blanco, igual en las 5 pestañas de plata — es la firma visual del grupo "plata", no reusar en Stock de indumentaria.
- Badge de categoría en la tabla de movimientos: neutro (`background: --bg-subtle`, `color: --fg-secondary`) — nunca con borde de color por categoría.
- Monto en tabla: `font-family: Geist Mono`, `font-weight:700`, `font-size:14px` (más grande y pesado que el resto de columnas), color `--danger`/`--success` según signo.
- Donut: `conic-gradient` puro + "dona" hueca (`inset:20px` con `background: --bg-elevated` encima) para que combine con el resto de cards (sin relleno sólido tipo pie).

## Assets
Ninguna imagen — solo CSS (donut) y SVG inline (iconos de tabs, si aplica). Sin logos ni fotos.

## Files
- `Bossa App.dc.html` — prototipo completo de la app. La sección de Presupuesto está marcada `section === 'presupuesto'`; los datos y estilos viven en el objeto `pres` calculado en `renderVals()` (buscar `moneySectionsRaw`, `buildMoneySection`, `stockSection`).
