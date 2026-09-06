# Bossa

Next.js + Prisma/PostgreSQL + Better Auth. Autenticación por email y contraseña, sesiones persistidas y acceso por membresías de batería.

## Desarrollo

1. `npm install`
2. Copiar `.env.example` a `.env.local` y completar `DATABASE_URL`, `BETTER_AUTH_URL` y un `BETTER_AUTH_SECRET` aleatorio (`openssl rand -base64 32`).
3. `npx prisma generate`
4. `npm run db:migrate`
5. `npm run db:seed`
6. `npm run dev`

Abrir http://localhost:3000/login. Si cambiás el puerto, ajustar `BETTER_AUTH_URL`. Reiniciar Next.js después de generar un nuevo cliente Prisma.

Usuario local de prueba: **director@zumzum.com**, contraseña **ZumZum2026!**, nombre **Tomás Schiro**, director de **Zum Zum**. Se puede definir `SEED_DIRECTOR_PASSWORD` antes del primer seed. El seed es idempotente, no cambia contraseñas existentes y se rechaza con `NODE_ENV=production`.

## Autenticación y aislamiento

- `Usuario` contiene nombre y email. Better Auth administra el hash en `Account.password`, con `issuer=local:credential`, además de sesiones y verificaciones. No hay registro público ni OAuth.
- `Membresia` tiene usuario, batería y rol `director`, con unicidad por usuario/batería. Para asignar otro director se debe crear su cuenta de credenciales y su membresía desde un proceso administrativo; el navegador no puede autoconcederse acceso.
- `requireBateria()` verifica sesión y membresías en el servidor. Usa la primera membresía ordenada por fecha/ID, o una selección válida en la cookie HTTP-only `bossa-bateria`. La cookie no concede permisos. Sin membresías se muestra `/sin-bateria`.
- Todas las lecturas y escrituras de `actions.ts` filtran por esa batería, incluso al operar por ID. En entidades de Carnaval se comprueba la batería de la edición y del ritmista. Las consultas nuevas deben aplicar la misma regla; nunca tomar el ámbito de un parámetro del cliente.
- Los registros históricos existentes conservan su autor original; el cambio aplica a nuevas operaciones.
- El autor de pagos, beneficios y entregas se obtiene exclusivamente de la sesión. Las reversiones mantienen el comportamiento de eliminación y guardan el registro original y el autor en `Auditoria`, dentro de la misma transacción.
- El selector de batería reinicia el estado visual para evitar conservar fichas de la batería anterior. El login y logout hacen una navegación completa para limpiar la UI cacheada.
- Presupuesto todavía es una pantalla protegida “Próximamente”, sin consultas implementadas.

## Verificación

Con `npm run dev` ejecutándose:

```bash
npm run test:auth
npx tsc --noEmit
npm run lint
npm run build
```

La prueba Playwright usa la base configurada. Crea dos baterías y usuarios temporales, verifica protección de pantallas y acciones, login, persistencia y autor del pago, lecturas y escrituras cruzadas, cookie falsificada, autoría del servidor, auditoría, selector y logout. Elimina los registros temporales al finalizar. Guarda evidencia en `test-results/auth-movimiento.png` y `test-results/auth-report.json`. `TEST_BASE_URL` permite probar otro puerto (debe coincidir con `BETTER_AUTH_URL`).

La implementación utiliza el [adaptador Prisma de Better Auth](https://www.better-auth.com/docs/adapters/prisma) y su [autenticación por email y contraseña](https://www.better-auth.com/docs/authentication/email-password).

En este entorno se verificó la compilación con `npm run build -- --webpack`. Turbopack puede fallar con `binding to a port: Operation not permitted`; ese error del entorno no aparece con Webpack.

## Naipes

`/naipes` permite agregar, renombrar y ordenar el catálogo de cada batería, con auditoría del usuario autenticado. No permite nombres duplicados (sin distinguir mayúsculas) ni editar IDs ajenos. Renombrar actualiza el naipe de referencia del padrón; los nombres históricos de Carnaval se conservan. Los selectores de alta, filtros y plantilla CSV usan el catálogo de la batería. Los filtros de Carnaval incluyen además los nombres históricos presentes en esa edición.

Verificación: `npm run test:naipes` con el servidor de desarrollo iniciado. Crea una batería temporal y limpia sus registros al finalizar; guarda capturas de desktop/móvil e informe en `test-results/naipes-*`.

## Agenda y recordatorios

`/agenda` incluye calendario mensual, listado y filtros de ensayos, beneficios, presentaciones, fechas clave y cumpleaños. Los eventos pertenecen a una edición de la batería autenticada; las ediciones inactivas son de consulta. La fecha puede pertenecer al año de preparación del Carnaval. Alta, edición, cancelación y restauración conservan autoría y auditoría. No se borran eventos al cancelarlos.

Los avisos se muestran exclusivamente dentro de Bossa: resumen en Agenda y contador accesible desde todas las pantallas. Se actualizan al volver a la ventana y cada minuto mientras está visible. Cada evento permite anticipación de 0, 1, 3, 7, 14 o 30 días; el aviso permanece desde ese momento hasta el día del evento inclusive. Las fechas clave proponen 7 días. Los eventos cancelados y las ediciones inactivas no generan avisos.

Los cumpleaños se calculan automáticamente desde el padrón completo de la batería, con aviso desde 7 días antes y la edad que cumple el ritmista. Para nacidos el 29/2 se usa el 28/2 en años no bisiestos. Las fechas se manejan como días de calendario, con hoy y horarios de Argentina, evitando corrimientos por UTC. No se configuran emails, WhatsApp ni notificaciones del navegador.

`npm run test:agenda` verifica reglas de fechas y 11 escenarios Playwright, con baterías temporales que se limpian al terminar. Evidencia: `test-results/agenda-report.json`, `agenda-desktop.png` y `agenda-mobile.png`.

## Configuración

`/configuracion` permite editar nombre y comparsa de la batería, su paleta (principal claro/oscuro y acento), el nombre del director y su contraseña. La paleta tiene vista previa, validación hexadecimal y color de texto calculado para los botones. Los colores se aplican a la batería seleccionada, incluso en diálogos. Restablecer carga la paleta inicial en el formulario; requiere guardar para aplicarla.

La cuenta muestra email de acceso de solo lectura y las membresías del director. Cambiar el nombre no reescribe autores históricos. Better Auth verifica la contraseña actual, cambia el hash e invalida las otras sesiones. Las contraseñas no se guardan en la auditoría. No se incluyen altas/bajas de directores.

`npm run test:configuracion` prueba persistencia, colores claros/oscuros, cuenta, contraseña, aislamiento y móvil con un usuario temporal; no cambia las credenciales del director del seed. Guarda evidencias en `test-results/configuracion-*`.

Agenda también está disponible desde Base de Datos en `/base-de-datos/agenda`. Comparte los datos y permisos de `/agenda`, conservando el módulo de navegación al cambiar de edición.

## Navegación y consistencia visual

Base de Datos y Carnaval muestran los mismos módulos (Dashboard, Ritmistas, Naipes, Inventario, Presupuesto y Agenda), más Configuración. El selector conserva el módulo abierto; Ritmistas alterna entre padrón histórico y participantes del Carnaval. Las rutas de los otros módulos comparten implementación y datos, sin duplicarlos.

Se unificaron alturas de controles, fondos para modo oscuro, encabezados y estados de módulos en preparación. El selector mantiene sus etiquetas en un solo renglón. En móvil hay selector superior y navegación inferior. Verificaciones visuales: `scripts/visual-review.mjs` y `scripts/navigation-review.mjs`, con capturas en `test-results/visual`.

## Ciclo de Carnaval

En 2026 se propone preparar 2027. Configuración permite preparar la edición, agregar o quitar noches y, opcionalmente, copiar participantes de la edición anterior con cuentas y entregas en cero. No copia movimientos ni beneficios. Las fechas se ordenan y guardan en PostgreSQL; aparecen en Agenda con recordatorios dentro de la app.

La última noche es inclusiva: desde el día siguiente, según el calendario de Argentina, la edición queda en consulta. El servidor bloquea cambios de movimientos, beneficios, entregas y eventos del ciclo cerrado. Sin noches cargadas, una edición preparada permanece abierta al cambiar de año. Las ediciones heredadas hasta 2026 se conservaron como históricas, sin alterar sus participantes ni sus cuentas.

El selector de Carnaval permite consultar ediciones propias en escritorio y móvil. Una cookie ajena no concede acceso. Para empezar, ir a Configuración y pulsar **Preparar Carnaval 2027**; las fechas reales quedan a cargo del director.

`npm run test:carnaval` comprueba fechas y el flujo Playwright con datos temporales: preparación, copia opcional, noches, autoría, aislamiento, consulta histórica y bloqueo tras el cierre.

## Ecualización y formación por naipe

Naipes muestra participantes reales de la edición elegida, filtro de confirmados, cantidades objetivo editables, porcentajes normalizados a 100%, faltantes/excedentes y comparación con la última edición anterior disponible. Es un balance de integrantes, no una medición acústica. No se precargan las metas de las imágenes de referencia. Las variantes de tamaño y voz de las familias conocidas se agrupan sin modificar los nombres históricos de los ritmistas.

Formación organiza un bloque por naipe: cantidad actual u objetivo, columnas, filas calculadas y posición inicial. Los bloques pueden moverse con flechas y se advierten las posiciones superpuestas. Los huecos permiten dejar pasillos; el plano no representa metros ni asigna ritmistas por nombre. Objetivos, seguimiento y posiciones se guardan juntos por edición, con auditoría y aislamiento por batería. En ediciones cerradas se permite ajustar objetivos, seguimiento y formación; sus participantes y movimientos históricos mantienen las restricciones de cierre.

El catálogo existente permanece dentro de “Administrar catálogo de naipes”. Ambas rutas de Naipes comparten el plan. Verificación: `npm run test:naipes-plan` con el servidor local iniciado.

Las fichas de naipe tienen URL propia por edición: `/naipes/[edicionId]/[naipe]` y su equivalente en Carnaval. Incluyen integrantes, instrumento, confirmación, nivel, teléfono y buscador. El enlace del naipe o doble clic en la fila abre esta página.
