// Prueba la ficha pública /inscripcion y el panel de revisión con el servidor de desarrollo
// corriendo. Usa DNIs aleatorios y una batería temporal; borra todo lo que crea al terminar.
// PW_CHANNEL=msedge (o chrome) usa el navegador instalado en vez del Chromium de Playwright.
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const prisma = new PrismaClient();
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const stamp = Date.now();
const dniAleatorio = () => String(90000000 + Math.floor(Math.random() * 9999999));
const conPuntos = (d) => d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const DNI = { adulto: dniAleatorio(), menor: dniAleatorio(), bot: dniAleatorio(), fotoFalsa: dniAleatorio(), naipeFalso: dniAleatorio(), limite: dniAleatorio(), interno: dniAleatorio() };
const dnisTest = Object.values(DNI).flatMap((d) => [d, conPuntos(d)]);
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const otraBateriaId = `inscripcion-test-${stamp}`;
let browser;
const checks = [];
function pass(message) { checks.push(message); console.log('PASS', message); }

/** Reescribe partes de un multipart/form-data ya armado por el navegador (como haría un bot). */
function reescribirMultipart(body, contentType, cambiar) {
  const boundary = '--' + /boundary=(.+)$/.exec(contentType)[1];
  const partes = body.toString('latin1').split(boundary);
  return Buffer.from(partes.map((parte) => {
    const corte = parte.indexOf('\r\n\r\n');
    if (corte < 0) return parte;
    const cabecera = parte.slice(0, corte);
    const nombre = /name="([^"]*)"/.exec(cabecera)?.[1] ?? '';
    const nuevo = cambiar(nombre, parte.slice(corte + 4, -2));
    return nuevo === undefined ? parte : `${cabecera}\r\n\r\n${nuevo}\r\n`;
  }).join(boundary), 'latin1');
}

try {
  const user = await prisma.usuario.findUniqueOrThrow({ where: { email: 'director@zumzum.com' }, include: { membresias: true } });
  const bateria = await prisma.bateria.findFirstOrThrow({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  assert(user.membresias.some((m) => m.bateriaId === bateria.id), 'El director del seed debe dirigir la batería de /inscripcion');
  const naipe = await prisma.naipe.findFirstOrThrow({ where: { bateriaId: bateria.id }, orderBy: [{ orden: 'asc' }, { id: 'asc' }] });
  const ediciones = await prisma.edicion.findMany({ where: { bateriaId: bateria.id }, orderBy: { anioCarnaval: 'asc' } });
  const destino = ediciones.find((e) => e.activa) ?? ediciones.at(-1);
  assert(destino, 'La batería necesita una edición abierta o preparada');
  const enPadron = await prisma.ritmista.findFirstOrThrow({ where: { bateriaId: bateria.id } });

  browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  const publico = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await publico.newPage(); page.setDefaultTimeout(15000);

  async function completar(dni, { nacimiento = '1995-03-10', email = '', tutor = '' } = {}) {
    await page.goto(base + '/inscripcion');
    await page.getByLabel('Nombre', { exact: true }).fill('Test');
    await page.getByLabel('Apellido', { exact: true }).fill(`Inscripción ${stamp}`);
    await page.getByLabel('DNI', { exact: true }).fill(dni);
    await page.getByLabel('Teléfono', { exact: true }).fill('3772441826');
    if (email) await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Fecha de nacimiento', { exact: true }).fill(nacimiento);
    if (tutor) await page.getByLabel('Teléfono del tutor responsable', { exact: true }).fill(tutor);
    await page.locator('[data-campo="naipe"] [role="combobox"]').first().click();
    await page.getByRole('option', { name: naipe.nombre, exact: true }).click();
    await page.getByLabel('Talle de remera', { exact: true }).fill('l');
    await page.getByLabel('Calzado', { exact: true }).click();
    await page.getByRole('option', { name: '41', exact: true }).click();
    await page.locator('input[type="file"]:not([capture])').setInputFiles({ name: 'cara.png', mimeType: 'image/png', buffer: PNG_1PX });
    await page.getByAltText('Tu foto').waitFor();
  }
  const enviar = () => page.getByRole('button', { name: 'Enviar inscripción', exact: true }).click();
  const listo = () => page.getByRole('heading', { name: '¡Listo!', exact: true }).waitFor();

  // 1. Sin datos: errores en línea, sin asteriscos ni "(opcional)".
  await page.goto(base + '/inscripcion');
  const textoInicial = await page.locator('form').innerText();
  assert(!/\*|opcional/i.test(textoInicial));
  assert.equal(await page.getByText('Nivel', { exact: true }).count(), 0);
  assert.equal(await page.getByRole('link').count(), 0);
  await enviar();
  await page.getByText('Completá tu nombre.', { exact: true }).waitFor();
  await page.getByText('Sacate una foto o elegí una de la galería.', { exact: true }).waitFor();
  assert.equal(await page.getByText('Teléfono del tutor responsable').count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  pass('Página pública sin menú, links, Nivel ni marcas de opcional; valida campos y no desborda en celular');

  // 2. Adulto con mail: se envía directo y queda Pendiente con la foto en JPEG.
  await completar(DNI.adulto, { email: 'test@bossa.ar' });
  await enviar(); await listo();
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/inscripcion-listo-mobile.png' });
  const adulto = await prisma.inscripcion.findFirstOrThrow({ where: { dni: conPuntos(DNI.adulto) }, include: { foto: true } });
  assert.equal(adulto.estado, 'Pendiente'); assert.equal(adulto.email, 'test@bossa.ar'); assert.equal(adulto.telefonoTutor, null);
  assert.equal(adulto.talleRemera, 'L'); assert.equal(adulto.telefono, '3772-441826'); assert.equal(adulto.bateriaId, bateria.id);
  assert.equal(adulto.foto.mime, 'image/jpeg'); assert.deepEqual([...adulto.foto.datos.slice(0, 3)], [0xff, 0xd8, 0xff]);
  pass('Inscripción de adulto guardada como Pendiente, con foto comprimida a JPEG');

  // 3. DNI repetido: pendiente y padrón.
  for (const dni of [DNI.adulto, enPadron.dni.replace(/\D/g, '')]) {
    await completar(dni, { email: 'otro@bossa.ar' }); await enviar();
    await page.getByText('Ya hay una inscripción con este DNI. Hablá con un director.', { exact: true }).waitFor();
  }
  assert.equal(await prisma.inscripcion.count({ where: { dni: conPuntos(DNI.adulto) } }), 1);
  pass('DNI repetido (inscripción pendiente o ritmista del padrón) rechazado sin guardar');

  // 4. Menor sin mail: pide tutor, avisa por el mail y deja volver o seguir.
  await completar(DNI.menor, { nacimiento: '2012-08-01' });
  await enviar();
  await page.getByText('Como sos menor de 18, necesitamos el teléfono de tu tutor responsable.', { exact: true }).waitFor();
  await page.getByLabel('Teléfono del tutor responsable', { exact: true }).fill('3772000111');
  await enviar();
  await page.getByRole('dialog').getByText('¿No tenés mail?', { exact: true }).waitFor();
  await page.screenshot({ path: 'test-results/inscripcion-aviso-mail-mobile.png' });
  await page.getByRole('button', { name: 'Agregar mail', exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.id === 'email');
  await enviar();
  await page.getByRole('button', { name: 'Seguir sin mail', exact: true }).click();
  await listo();
  const menor = await prisma.inscripcion.findFirstOrThrow({ where: { dni: conPuntos(DNI.menor) } });
  assert.equal(menor.email, null); assert.equal(menor.telefonoTutor, '3772-000111');
  pass('Menor: tutor obligatorio; aviso de mail con Agregar mail (vuelve al campo) y Seguir sin mail');

  // 5. Honeypot completado por un bot: responde "¡Listo!" pero no guarda.
  await completar(DNI.bot, { email: 'bot@bossa.ar' });
  await page.evaluate(() => { document.getElementById('sitio_web').value = 'https://spam.example'; });
  await enviar(); await listo();
  assert.equal(await prisma.inscripcion.count({ where: { dni: conPuntos(DNI.bot) } }), 0);
  pass('Honeypot: el bot ve éxito y no se guarda nada');

  // 6. Envíos adulterados que saltean el formulario: archivo que no es imagen y naipe inexistente.
  async function adulterado(dni, cambiar, mensaje) {
    await completar(dni, { email: 'x@bossa.ar' });
    await page.route(base + '/inscripcion', async (route) => {
      const req = route.request();
      if (req.method() !== 'POST') return route.continue();
      await route.continue({ postData: reescribirMultipart(req.postDataBuffer(), req.headers()['content-type'], cambiar) });
    });
    await enviar();
    await page.getByText(mensaje, { exact: true }).waitFor();
    await page.unroute(base + '/inscripcion');
    assert.equal(await prisma.inscripcion.count({ where: { dni: conPuntos(dni) } }), 0);
  }
  await adulterado(DNI.fotoFalsa, (n) => (n.endsWith('foto') ? '<?php echo "no soy una foto"; ?>' : undefined), 'No pudimos usar esa foto. Probá con otra.');
  await adulterado(DNI.naipeFalso, (n) => (n.endsWith('naipe') ? 'Bombo legüero' : undefined), 'Elegí tu instrumento.');
  pass('El servidor vuelve a validar: rechaza archivos que no son imágenes y naipes fuera del catálogo');

  // 7. Límite de envíos por conexión.
  const hashes = ['::1', '127.0.0.1', '::ffff:127.0.0.1'].map((ip) => createHash('sha256').update(`${process.env.BETTER_AUTH_SECRET ?? ''}:${ip}`).digest('hex'));
  await prisma.inscripcion.createMany({ data: hashes.flatMap((ipHash) => Array.from({ length: 50 }, (_, i) => ({ bateriaId: bateria.id, nombre: 'Límite', apellido: `${stamp}-${i}`, dni: `L${stamp}${i}`, telefono: '0', fechaNacimiento: new Date('2000-01-01'), naipe: naipe.nombre, talleRemera: 'M', calzado: '40', ipHash, estado: 'Rechazada' }))) });
  await completar(DNI.limite, { email: 'x@bossa.ar' }); await enviar();
  await page.getByText('Se enviaron muchas inscripciones desde esta conexión. Probá de nuevo en un rato.', { exact: true }).waitFor();
  await prisma.inscripcion.deleteMany({ where: { nombre: 'Límite', apellido: { startsWith: `${stamp}-` } } });
  assert.equal(await prisma.inscripcion.count({ where: { dni: conPuntos(DNI.limite) } }), 0);
  pass('Límite de 50 envíos por hora desde la misma conexión');

  // 8. Fotos: nunca públicas, sin listado, y solo para la batería dueña.
  assert.equal((await publico.request.get(`${base}/api/fotos/${adulto.fotoId}`)).status(), 401);
  assert.equal((await publico.request.get(`${base}/api/fotos`)).status(), 404);
  const director = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  assert.equal((await director.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password: process.env.SEED_DIRECTOR_PASSWORD ?? 'ZumZum2026!' } })).status(), 200);
  const propia = await director.request.get(`${base}/api/fotos/${adulto.fotoId}`);
  assert.equal(propia.status(), 200); assert.equal(propia.headers()['content-type'], 'image/jpeg'); assert.match(propia.headers()['cache-control'], /private/);
  await prisma.bateria.create({ data: { id: otraBateriaId, nombre: 'Batería ajena de prueba' } });
  const fotoAjena = await prisma.fotoRitmista.create({ data: { bateriaId: otraBateriaId, mime: 'image/png', datos: PNG_1PX } });
  const ajena = await prisma.inscripcion.create({ data: { bateriaId: otraBateriaId, nombre: 'Ajena', apellido: 'Prueba', dni: conPuntos(dniAleatorio()), telefono: '3772-441826', fechaNacimiento: new Date('2000-01-01'), naipe: 'Caixas', talleRemera: 'M', calzado: '40', ipHash: 'test', fotoId: fotoAjena.id } });
  assert.equal((await director.request.get(`${base}/api/fotos/${fotoAjena.id}`)).status(), 404);
  pass('Fotos: 401 sin sesión, sin listado, 404 para otra batería, privadas para el director dueño');

  // 9. Panel: contador, ficha con foto, nivel obligatorio, aprobar y rechazar.
  const panel = await director.newPage(); panel.setDefaultTimeout(15000);
  await panel.goto(base + '/ritmistas/carnaval');
  const boton = panel.getByRole('link', { name: /Inscripciones pendientes/ });
  await boton.waitFor();
  const pendientes = await prisma.inscripcion.count({ where: { bateriaId: bateria.id, estado: 'Pendiente' } });
  assert((await boton.innerText()).includes(String(pendientes)));
  await boton.click();
  await panel.getByRole('heading', { name: 'Inscripciones', exact: true }).waitFor();
  await panel.getByText(`${base}/inscripcion`).waitFor();
  await panel.screenshot({ path: 'test-results/inscripcion-panel-desktop.png' });
  // Tarjetas de esta corrida, de la más nueva a la más vieja: [0] el menor, [1] el adulto.
  const tarjetas = panel.locator('li button').filter({ hasText: `Inscripción ${stamp}` });
  await tarjetas.nth(1).click();
  const dialogo = panel.getByRole('dialog');
  await dialogo.getByText(conPuntos(DNI.adulto), { exact: true }).waitFor();
  await dialogo.getByRole('img', { name: /Foto de Test/ }).waitFor();
  assert(await dialogo.getByRole('button', { name: 'Elegí un nivel', exact: true }).isDisabled());
  await panel.screenshot({ path: 'test-results/inscripcion-ficha-desktop.png' });
  await dialogo.getByRole('button', { name: 'Principiante', exact: true }).click();
  await dialogo.getByRole('button', { name: 'Aprobar', exact: true }).click();
  await dialogo.waitFor({ state: 'detached' });
  const aprobada = await prisma.inscripcion.findUniqueOrThrow({ where: { id: adulto.id } });
  assert.equal(aprobada.estado, 'Aprobada'); assert.equal(aprobada.revisadoPorId, user.id); assert.equal(aprobada.revisadoPor, user.nombre);
  const nuevo = await prisma.ritmista.findUniqueOrThrow({ where: { id: aprobada.ritmistaId }, include: { ritmistasEdicion: true, historial: true } });
  assert.equal(nuevo.nivel, 'Principiante'); assert.equal(nuevo.email, 'test@bossa.ar'); assert.equal(nuevo.fotoId, adulto.fotoId); assert.equal(nuevo.bateriaId, bateria.id);
  assert.equal(nuevo.ritmistasEdicion.length, 1); assert.equal(nuevo.ritmistasEdicion[0].edicionId, destino.id); assert.equal(nuevo.ritmistasEdicion[0].estadoLlegada, 'NoConfirmado');
  assert.equal(nuevo.historial[0].desde, destino.anioCarnaval);
  assert.equal(await prisma.auditoria.count({ where: { entidadId: adulto.id, accion: 'aprobarInscripcion', usuarioId: user.id } }), 1);
  pass(`Aprobar con nivel: pasa al padrón y al Carnaval ${destino.anioCarnaval} como No confirmado, con foto y auditoría`);

  await tarjetas.first().click();
  await dialogo.getByText('3772-000111', { exact: true }).waitFor();
  await dialogo.getByRole('button', { name: 'Rechazar', exact: true }).click();
  await dialogo.getByRole('button', { name: 'Sí, rechazar', exact: true }).click();
  await dialogo.waitFor({ state: 'detached' });
  const rechazada = await prisma.inscripcion.findUniqueOrThrow({ where: { id: menor.id } });
  assert.equal(rechazada.estado, 'Rechazada'); assert.equal(rechazada.ritmistaId, null);
  assert.equal(await prisma.ritmista.count({ where: { dni: conPuntos(DNI.menor) } }), 0);
  await panel.getByRole('tab', { name: /Rechazadas/ }).click();
  await panel.locator('li button').filter({ hasText: `Inscripción ${stamp}` }).first().waitFor();
  pass('Rechazar (con confirmación) la deja marcada como Rechazada, sin crear ritmista');

  // 10. Acciones internas por ID ajeno o sin sesión: rechazadas.
  const manifest = JSON.parse(await readFile('.next/dev/server/server-reference-manifest.json', 'utf8'));
  const actionId = (name) => Object.entries(manifest.node).find(([, v]) => v.exportedName === name)[0];
  for (const [ctx, nombre, input] of [[director, 'aprobarInscripcion', { id: ajena.id, nivel: 'Avanzado' }], [director, 'rechazarInscripcion', { id: ajena.id }], [publico, 'getInscripciones', null], [publico, 'rechazarInscripcion', { id: menor.id }]]) {
    const res = await ctx.request.post(base + '/ritmistas/carnaval/inscripciones', { headers: { 'Next-Action': actionId(nombre), 'Content-Type': 'text/plain', Origin: base }, data: JSON.stringify(input ? [input] : []), maxRedirects: 0 });
    const body = await res.text();
    const bloqueada = res.status() >= 300 || Boolean(res.headers()['x-action-redirect']) || /No encontramos esa inscripción/.test(body);
    assert(bloqueada, `${nombre} debería rechazarse`);
    assert(!body.includes(conPuntos(DNI.adulto)));
  }
  assert.equal((await prisma.inscripcion.findUniqueOrThrow({ where: { id: ajena.id } })).estado, 'Pendiente');
  pass('Aprobar/rechazar por ID de otra batería y leer/escribir sin sesión: rechazados');

  // 11. Formulario interno: Email y Teléfono del tutor (solo menores).
  await panel.goto(base + '/ritmistas/carnaval');
  await panel.getByRole('button', { name: '+ Agregar ritmista', exact: true }).click();
  const alta = panel.getByRole('dialog');
  await alta.getByPlaceholder('Nombre', { exact: true }).fill('Interno');
  await alta.getByPlaceholder('Apellido', { exact: true }).fill(`Alta ${stamp}`);
  await alta.getByPlaceholder('00.000.000').fill(DNI.interno);
  await alta.getByPlaceholder('nombre@mail.com').fill('mal@');
  assert(await alta.getByRole('button', { name: 'Guardar ritmista', exact: true }).isDisabled());
  await alta.getByPlaceholder('nombre@mail.com').fill('interno@bossa.ar');
  assert.equal(await alta.getByText('Teléfono del tutor', { exact: true }).count(), 0);
  await alta.locator('input[type="date"]').fill('2013-02-02');
  await alta.getByText('Teléfono del tutor', { exact: true }).waitFor();
  await alta.getByPlaceholder('3772-441826').nth(1).fill('3772999888');
  await alta.getByRole('button', { name: 'Guardar ritmista', exact: true }).click();
  await alta.waitFor({ state: 'detached' });
  const interno = await prisma.ritmista.findFirstOrThrow({ where: { dni: conPuntos(DNI.interno) } });
  assert.equal(interno.email, 'interno@bossa.ar'); assert.equal(interno.telefonoTutor, '3772-999888');
  pass('Formulario interno guarda Email y Teléfono del tutor (solo visible para menores)');

  await writeFile('test-results/inscripcion-report.json', JSON.stringify({ ok: true, checks }, null, 2));
  console.log(`\n${checks.length} verificaciones OK`);
} finally {
  await browser?.close();
  const inscripciones = await prisma.inscripcion.findMany({ where: { OR: [{ dni: { in: dnisTest } }, { bateriaId: otraBateriaId }, { nombre: 'Límite', apellido: { startsWith: `${stamp}-` } }] }, select: { id: true, fotoId: true } });
  const ritmistas = await prisma.ritmista.findMany({ where: { dni: { in: dnisTest } }, select: { id: true, fotoId: true } });
  await prisma.ritmista.deleteMany({ where: { id: { in: ritmistas.map((r) => r.id) } } });
  await prisma.inscripcion.deleteMany({ where: { id: { in: inscripciones.map((i) => i.id) } } });
  await prisma.fotoRitmista.deleteMany({ where: { id: { in: [...inscripciones, ...ritmistas].map((x) => x.fotoId).filter(Boolean) } } });
  await prisma.auditoria.deleteMany({ where: { entidadId: { in: inscripciones.map((i) => i.id) } } });
  await prisma.bateria.deleteMany({ where: { id: otraBateriaId } });
  await prisma.$disconnect();
}
