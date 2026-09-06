# Bossa — Handoff completo para Claude Code

Este documento junta todo lo definido en la etapa de planificación y diseño. Pensado para pegar directo en Claude Code y arrancar el desarrollo.

---

## 0. Cómo usar este documento

Pegale este archivo completo a Claude Code al arrancar el proyecto, junto con el archivo `brand-tokens.css` (sección 4, más abajo, ya incluido igual). Si tenés capturas del resultado final de Claude Design, adjuntalas también — son la referencia visual pantalla por pantalla.

**Sugerencia de orden de trabajo** (útil si vas paso a paso con Code, dado que estás arrancando en desarrollo):
1. Setup del proyecto (Next.js + TypeScript + Tailwind + shadcn/ui) y carga de los design tokens
2. Modelo de datos en Supabase (sección 3)
3. Nav + layout general (sidebar desktop / nav inferior mobile) con el módulo Base de Datos y Carnaval [año] vacíos
4. Módulo Base de Datos: Naipes → Ritmistas (histórico) → Inventario
5. Módulo Carnaval [año]: Dashboard → Ritmistas de la edición → Presupuesto → Agenda
6. Ficha individual de ritmista (la pantalla más compleja, con cuenta corriente)
7. Ajustes de modo claro/oscuro y personalización de paleta por batería

---

## 1. Qué es Bossa

Sistema de gestión para baterías de carnaval (percusión de comparsa). Proyecto piloto: la batería de la Comparsa Zum Zum. Lo usan directores sin formación técnica, desde el celular, muchas veces en medio de un ensayo — tiene que ser simple e intuitivo, no una herramienta de desarrollador.

Arquitectura pensada para multi-batería a futuro (hoy solo existe Zum Zum, pero el modelo de datos no debe asumir una sola batería).

---

## 2. Estructura funcional

### Capa 1 — Batería (institución)
Espacio propio por institución: nombre, comparsa, directores con acceso, paleta de colores propia. Los datos de una batería no se mezclan con los de otra.

### Capa 2 — Base de Datos (padrón permanente, sin año)

**Naipes**: agrupaciones de ritmistas por instrumento — Caixas, Tamborins, Repique, Chocalho, Surdos, Frigideiras, Cuicas. Editable por batería. A futuro: responsable/capitán por naipe.

**Ritmistas (padrón general)**:
- Nombre y apellido, DNI, teléfono, fecha de nacimiento (edad calculada)
- Naipe de referencia (el naipe real y con valor histórico vive en cada edición)
- Nivel: Principiante / Avanzado (filtrable)
- Antigüedad: calculada, no se carga a mano (primera edición en la que participó)
- Talle de remera, talle de calzado

**Inventario — instrumentos**: tipo, código, estado (bueno/regular/necesita reparación/de baja). Sin asignación a persona.

**Inventario — repuestos**: categorías Cueros, Bordonas, otros. Cada ítem (instrumento o repuesto) lleva etiqueta **Necesidad** (con prioridad urgente/deseable) o **Para venta**.

### Capa 3 — Ediciones de Carnaval (año a año)

Cada edición es una entidad propia ("Carnaval 2026", "Carnaval 2027"...). Por cada edición:

- **Ritmistas activos**: del padrón general, o nuevos (que se crean en el padrón general al mismo tiempo)
- **Naipe tocado esta edición**: puede diferir de otras ediciones — el historial completo se conserva
- **Cuenta corriente por ritmista**: movimientos de traje, remera, rifas, pagos, ajustes — cada uno con fecha y quién lo registró. Total / Pagado / Pendiente calculado automáticamente
- **Indumentaria — entregas**: Entregado/Pendiente por ítem (remera, pantalón, zapatillas, medias, gorra, accesorio), independiente del pago
- **Estado de llegada**: Confirmado / En duda / No confirmado (marcado manual del director, no es un juicio tajante)
- **Stock de indumentaria por talle**: cantidad disponible, entregada y pendiente por talle
- **Presupuesto**:
  - Caja general: ingresos (beneficios, otros) y egresos (repuestos, trajes, remeras, otros), saldo calculado
  - Presupuesto proyectado: desde ítems "Necesidad" del inventario, agrupado por prioridad (urgente/deseable/proyectos futuros), con costo estimado
  - Rifas: números asignados y vendidos por ritmista — lo vendido descuenta automáticamente su cuenta corriente
- **Agenda**: eventos (ensayo/beneficio/presentación) con fecha, lugar, descripción

**Navegación entre ediciones**: selector tipo "◂ 2026 ▸". Ediciones pasadas en modo consulta. Crear edición nueva permite copiar la lista de activos de la anterior, pero la parte financiera arranca en cero.

**Bajas**: nunca se borra a nadie del padrón — solo queda inactivo en ediciones siguientes, con su historial intacto.

---

## 3. Estructura de navegación — dos módulos

**Módulo A — Base de Datos**: Naipes · Ritmistas (histórico completo) · Inventario

**Módulo B — Carnaval [año]**: Dashboard · Ritmistas de esta edición · Presupuesto · Agenda — con selector de edición arriba de todo

Navegación responsive: nav lateral fijo en desktop, nav inferior en mobile — mismo sistema de diseño, dos layouts.

---

## 4. Modelo de datos sugerido (Supabase / Postgres)

Tablas principales (nombres orientativos, ajustar a convención del proyecto):

```
baterias
  id, nombre, comparsa, paleta_colores (jsonb), created_at

naipes
  id, bateria_id, nombre, orden

ritmistas
  id, bateria_id, nombre, apellido, dni, telefono, fecha_nacimiento,
  naipe_referencia_id, nivel (enum: principiante/avanzado),
  talle_remera, talle_calzado, created_at

instrumentos
  id, bateria_id, tipo, codigo, estado (enum), etiqueta (necesidad/venta), prioridad (urgente/deseable), costo_estimado

repuestos
  id, bateria_id, categoria (cueros/bordonas/otro), descripcion, etiqueta, prioridad, costo_estimado

ediciones
  id, bateria_id, anio_carnaval, activa (bool), fecha_creacion

ritmistas_edicion   -- tabla puente: ritmista activo en una edición
  id, edicion_id, ritmista_id, naipe_id (naipe tocado ESA edición),
  estado_llegada (confirmado/en_duda/no_confirmado),
  costo_traje, costo_remera

movimientos_cuenta_corriente
  id, ritmista_edicion_id, tipo (traje/remera/rifa/pago/ajuste),
  monto, fecha, registrado_por, descripcion

entregas_indumentaria
  id, ritmista_edicion_id, item (remera/pantalon/zapatillas/medias/gorra/accesorio),
  estado (entregado/pendiente), fecha_entrega, entregado_por

stock_indumentaria
  id, edicion_id, talle, cantidad_stock, cantidad_entregada

rifas
  id, ritmista_edicion_id, numeros_asignados, numeros_vendidos, monto_por_numero

caja_movimientos
  id, edicion_id, tipo (ingreso/egreso), categoria, concepto, monto, fecha, registrado_por

agenda_eventos
  id, edicion_id, tipo (ensayo/beneficio/presentacion), fecha, hora, lugar, descripcion
```

Notas:
- `ritmistas_edicion` es la tabla clave: conecta el padrón permanente con lo específico de cada Carnaval.
- El "Total/Pagado/Pendiente" de cada ritmista en una edición se calcula sumando `movimientos_cuenta_corriente`, no se guarda como campo fijo (evita inconsistencias).
- El saldo de caja general se calcula sumando `caja_movimientos`, mismo criterio.
- Toda tabla con carga manual lleva su `registrado_por` / `entregado_por` para el registro de auditoría multiusuario.

---

## 5. Stack técnico

Next.js + TypeScript + Tailwind + shadcn/ui, con Supabase como base de datos (coherente con RODEO). Los design tokens de la sección 4 abajo se cargan directo en la config de Tailwind.

---

## 6. Sistema de diseño — tokens de GoClub (fuente de verdad)

Bossa reusa el sistema de diseño de GoClub tal cual, solo personalizando `--primary` y los semantic tokens con la paleta de Zum Zum cuando corresponda. Modo por defecto: **claro**. Logo de Bossa (isotipo circular) se mantiene aparte, no se reemplaza por el de GoClub.

**Paleta institucional de Zum Zum** (para reemplazar `--primary` y afines):
`#00723F` (verde principal) · `#0D471B` (verde oscuro) · `#B4FFB1` (verde claro/acento) · `#CBEECF` (verde muy claro, fondos suaves) · `#0D1F1B` (texto oscuro) · `#FFFFFF` (blanco/fondo)

```css
/* GoClub — Design tokens (base, personalizar --primary/semantic con paleta de cada batería) */
:root {
  /* Surfaces */
  --bg: #FAFAF7;
  --bg-elevated: #FFFFFF;
  --bg-muted: #F2F1EC;
  --bg-subtle: #ECEAE3;
  --bg-inverse: #0A0A0A;

  /* Borders */
  --border: #E7E5DE;
  --border-strong: #D6D3CA;
  --border-focus: #2563EB;

  /* Foreground */
  --fg: #0A0A0A;
  --fg-secondary: #4A4A48;
  --fg-tertiary: #8B8A85;
  --fg-quaternary: #B5B3AC;
  --fg-inverse: #FAFAF7;

  /* Brand */
  --primary: #2563EB;
  --primary-hover: #1D4ED8;
  --primary-active: #1E40AF;
  --primary-soft: #EEF3FE;
  --primary-fg: #FFFFFF;

  /* Accent */
  --accent: #F59E0B;
  --accent-soft: #FDF3D9;
  --accent-fg: #0A0A0A;

  /* Semantic */
  --success: #16A34A;
  --success-soft: #ECFDF3;
  --warning: #B45309;
  --warning-soft: #FEF3C7;
  --danger:  #DC2626;
  --danger-soft: #FEF2F2;
  --info: #2563EB;
  --info-soft: #EEF3FE;

  /* Type */
  --font-sans: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  --font-mono: "Geist Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace;

  /* Radii */
  --r-xs: 4px;
  --r-sm: 6px;
  --r-md: 8px;
  --r-lg: 12px;
  --r-xl: 16px;
  --r-2xl: 20px;

  /* Shadows */
  --sh-xs: 0 1px 0 rgba(10,10,10,.04);
  --sh-sm: 0 1px 2px rgba(10,10,10,.06), 0 1px 1px rgba(10,10,10,.04);
  --sh-md: 0 4px 12px rgba(10,10,10,.08), 0 1px 2px rgba(10,10,10,.04);
  --sh-lg: 0 12px 32px rgba(10,10,10,.10), 0 2px 6px rgba(10,10,10,.06);
}
```

Componentes base ya definidos en `brand-tokens.css` (adjuntar el archivo completo a Code): `.gc-btn` (primary/secondary/ghost/danger, tamaños sm/lg), `.gc-input`/`.gc-select`/`.gc-textarea`, `.gc-card`, `.gc-badge` (success/warning/danger/info/accent/neutral), `.gc-nav`, `.gc-table`, `.gc-avatar`. Reusar estos componentes tal cual, no reinventarlos.

**Tipografía**: Geist para toda la UI (nada de monoespaciada salvo `.mono`/`.t-mono-xs`/`.t-mono-sm` para eyebrows y datos tabulares puntuales, según ya define el CSS).

**Modo claro/oscuro**: claro por defecto (`--bg`/`--bg-elevated`/`--fg`), toggle a oscuro reusando `--bg-inverse`/`--fg-inverse`.

---

## 7. Referencias de pantalla (mapeo directo desde GoClub)

Estas equivalencias ya se validaron visualmente contra capturas reales de GoClub — replicar la estructura, no solo la paleta:

**Listado de Ritmistas** (mapeo desde pantalla "Socios" de GoClub):
- Header: título + subtítulo, botones "Pendientes" / "Importar ritmistas" / "+ Registrar pago" / "+ Agregar ritmista" (este último en color primario sólido)
- 4 cards de métricas: Ritmistas totales · Confirmados (verde) · En duda/No confirmado (ámbar) · Deuda total (rojo)
- Buscador + dropdown de estado + botón Filtros + Exportar/Imprimir
- Fila de chips: dropdown de naipe + chips Todos/Confirmado/En duda/No confirmado con contador
- Tabla: ID · Nombre (avatar + nombre) · DNI · Contacto (íconos WhatsApp/mail) · Naipe esta edición · Estado (badge) · Deuda (monto) · Entrega (texto) · chevron

**Ficha individual de Ritmista** (mapeo desde ficha de "Socio" de GoClub):
- Card izquierda: avatar + nombre + badge de estado, DNI, teléfono, fecha de nacimiento/edad, talle remera/calzado
- Card "Naipe actual" + historial de naipes por edición
- Card negra destacada de saldo: "Saldo pendiente — Indumentaria", monto grande, Total/Pagado, con botones de acción (Registrar pago, Enviar recordatorio por WhatsApp, Link de pago si aplica)
- Tabs: Indumentaria (tabla con concepto/fecha/monto/estado en badge/acción revertir) · Beneficios/Rifas · Datos (nivel, antigüedad, historial completo)

**Dashboard de edición**: 4 cards de métricas (Ritmistas activos, Saldo de caja, Deuda total, % Confirmados), gráfico de composición por naipe (donut o barras, con colores por estado: verde=confirmado, ámbar=en duda, rojo=no confirmado), card de próximo evento, tabla comparativa con ediciones anteriores.

**Presupuesto**: tabs Caja actual / Previsión próximo Carnaval, cards de Caja general / Proyectado / % rifas vendidas, barra de prioridad (Urgente/Deseable/Proyectos futuros) con montos, tabla de rifas por ritmista, tabla de stock de indumentaria por talle (Stock/Entregado/Pendiente).

**Agenda**: calendario mensual en grilla (como el de Reservas de RODEO), chips de color por tipo de evento, vista alternativa en Listado.

---

## 8. Consideraciones transversales

- Multiusuario: cada movimiento y cada dato editado registra fecha y quién lo hizo
- Mobile-first en interacción, pero con nav lateral en desktop (ver sección 3)
- Datos sensibles (DNI, contacto): cuidado en permisos de acceso
- "Confirmado/En duda/No confirmado" debe sentirse informativo, no un juicio sobre la persona
- Multi-batería: el modelo de datos no debe asumir una sola batería, aunque hoy solo se use con Zum Zum
