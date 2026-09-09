import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import assert from 'node:assert/strict';
const prisma = new PrismaClient();
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const suffix = Date.now();
const superAdminId = `superadmin-user-${suffix}`;
const superAdminEmail = `${superAdminId}@example.com`;
const normalId = `normal-user-${suffix}`;
const normalEmail = `${normalId}@example.com`;
const nombreBateria = `Batería nueva ${suffix}`;
const directorEmail = `director-${suffix}@example.com`;
const segundoEmail = `segundo-${suffix}@example.com`;
let browser;
let bateriaId;
const checks = [];
const pass = (s) => { checks.push(s); console.log('PASS', s); };

try {
  await prisma.usuario.create({ data: { id: superAdminId, email: superAdminEmail, nombre: 'Super Admin', esSuperAdmin: true, accounts: { create: { issuer: 'local:credential', providerId: 'credential', accountId: superAdminId, password: await hashPassword('Inicial2026!') } } } });
  const bateriaExistente = await prisma.bateria.create({ data: { id: `superadmin-existing-${suffix}`, nombre: 'Batería existente', ediciones: { create: { anioCarnaval: 2026, activa: true } } } });
  await prisma.usuario.create({ data: { id: normalId, email: normalEmail, nombre: 'Usuario Normal', accounts: { create: { issuer: 'local:credential', providerId: 'credential', accountId: normalId, password: await hashPassword('Inicial2026!') } }, membresias: { create: { bateriaId: bateriaExistente.id, rol: 'director' } } } });

  browser = await chromium.launch();

  const anon = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const anonPage = await anon.newPage();
  anonPage.setDefaultTimeout(20000);
  await anonPage.goto(base + '/superadmin');
  await anonPage.waitForURL('**/login');
  pass('Panel de superadmin exige autenticación');
  await anon.close();

  const normalContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  assert.equal((await normalContext.request.post(base + '/api/auth/sign-in/email', { data: { email: normalEmail, password: 'Inicial2026!' } })).status(), 200);
  const notFoundRes = await normalContext.request.get(base + '/superadmin/baterias');
  assert.equal(notFoundRes.status(), 404);
  pass('Usuario sin esSuperAdmin recibe 404 en el panel');
  await normalContext.close();

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: superAdminEmail, password: 'Inicial2026!' } })).status(), 200);
  await page.goto(base + '/superadmin');
  await page.waitForURL('**/superadmin/baterias');
  await page.getByRole('heading', { name: 'Baterías', exact: true }).waitFor();
  pass('Superadmin entra al panel con sidebar propio (Baterías / Usuarios) y ve el listado');

  await page.getByRole('link', { name: 'Usuarios', exact: true }).click();
  await page.waitForURL('**/superadmin/usuarios');
  await page.getByRole('heading', { name: 'Usuarios', exact: true }).waitFor();
  await page.getByText('Usuario Normal', { exact: true }).waitFor();
  pass('Nav lateral navega a la vista global de Usuarios');

  await page.getByRole('link', { name: 'Baterías', exact: true }).click();
  await page.waitForURL('**/superadmin/baterias');

  await page.getByRole('button', { name: 'Crear batería', exact: true }).click();
  await page.getByLabel('Nombre de la batería', { exact: true }).fill(nombreBateria);
  await page.getByLabel('Comparsa (opcional)', { exact: true }).fill('Comparsa Nueva');
  await page.getByLabel('Nombre', { exact: true }).fill('Director Nuevo');
  await page.getByLabel('Email', { exact: true }).fill(directorEmail);
  await page.getByLabel('Contraseña inicial', { exact: true }).fill('Segura2026!');
  await page.getByRole('button', { name: 'Crear batería', exact: true }).last().click();
  await page.waitForURL('**/superadmin/baterias/*');
  pass('Crear batería con su primer director redirige al detalle de la batería nueva');

  bateriaId = page.url().split('/').pop();
  await page.getByRole('heading', { name: nombreBateria, exact: true }).waitFor();
  await page.getByText('Director Nuevo', { exact: true }).waitFor();
  await page.getByText(directorEmail, { exact: true }).waitFor();
  pass('El detalle de la batería muestra al director recién creado');

  const bateriaDb = await prisma.bateria.findUniqueOrThrow({ where: { id: bateriaId }, include: { membresias: true } });
  assert.equal(bateriaDb.nombre, nombreBateria);
  assert.equal(bateriaDb.membresias.length, 1);
  assert.equal(bateriaDb.membresias[0].rol, 'director');
  pass('La batería y su primera membresía director quedaron persistidas correctamente en DB');

  await page.goto(base + '/superadmin/baterias');
  await page.getByText(nombreBateria, { exact: true }).waitFor();
  await page.getByText('1', { exact: true }).first().waitFor();
  pass('La batería nueva aparece en el listado de Baterías');

  await page.goto(base + `/superadmin/baterias/${bateriaId}`);
  await page.getByRole('button', { name: 'Agregar usuario', exact: true }).click();
  const agregarForm = page.getByRole('form', { name: 'Agregar usuario', exact: true });
  await agregarForm.getByLabel('Nombre', { exact: true }).fill('Segundo Usuario');
  await agregarForm.getByLabel('Email', { exact: true }).fill(segundoEmail);
  await agregarForm.getByLabel('Contraseña inicial', { exact: true }).fill('Segura2026!');
  await agregarForm.getByLabel('Rol', { exact: true }).selectOption('admin');
  await agregarForm.getByRole('button', { name: 'Agregar', exact: true }).click();
  await page.getByText('Segundo Usuario', { exact: true }).waitFor();
  pass('Se agregó un segundo usuario (admin) a la misma batería desde su detalle');

  await page.goto(base + '/superadmin/usuarios');
  const grupoBateria = page.locator('section', { has: page.getByRole('heading', { name: new RegExp(nombreBateria) }) });
  await grupoBateria.waitFor();
  const grupoToggle = grupoBateria.getByRole('button');
  const grupoLista = grupoBateria.locator('ul');
  const inicialmenteAbierto = (await grupoToggle.getAttribute('aria-expanded')) === 'true';
  if (!inicialmenteAbierto) {
    await assert.rejects(grupoLista.locator('li').first().waitFor({ timeout: 500 }));
    pass('El grupo de una batería no visitada primero arranca compactado (colapsado)');
    await grupoToggle.click();
  }
  const filaDirector = grupoLista.locator('li', { has: page.getByText('Director Nuevo', { exact: true }) });
  await filaDirector.getByText('Director', { exact: true }).waitFor();
  const filaSegundo = grupoLista.locator('li', { has: page.getByText('Segundo Usuario', { exact: true }) });
  await filaSegundo.getByText('Administrador', { exact: true }).waitFor();
  pass('Expandir el grupo de la batería muestra ambos usuarios con sus roles correctos');

  await grupoToggle.click();
  await assert.rejects(grupoLista.locator('li').first().waitFor({ timeout: 500 }));
  pass('Volver a plegar el grupo oculta sus usuarios (compactar funciona en ambos sentidos)');

  const membresia = await prisma.membresia.findFirstOrThrow({ where: { bateriaId, usuario: { email: segundoEmail } } });
  await page.goto(base + `/superadmin/baterias/${bateriaId}`);
  const fila = page.locator('li', { has: page.getByText('Segundo Usuario', { exact: true }) });
  await fila.getByLabel(`Rol de Segundo Usuario en ${nombreBateria}`).selectOption('director');
  await page.waitForTimeout(800);
  assert.equal((await prisma.membresia.findUniqueOrThrow({ where: { id: membresia.id } })).rol, 'director');
  pass('Cambiar rol desde el detalle de la batería actualiza la DB');

  page.once('dialog', (dialog) => dialog.accept());
  await page.reload();
  const filaTrasReload = page.locator('li', { has: page.getByText('Segundo Usuario', { exact: true }) });
  await filaTrasReload.getByRole('button', { name: 'Quitar acceso', exact: true }).click();
  await page.waitForTimeout(800);
  assert.equal(await prisma.membresia.findUnique({ where: { id: membresia.id } }), null);
  pass('Quitar acceso desde el detalle elimina la membresía');

  const audit = await prisma.auditoria.findMany({ where: { bateriaId } });
  assert(audit.some((a) => a.accion === 'crearBateria'));
  assert(audit.some((a) => a.accion === 'crearUsuario'));
  assert(audit.some((a) => a.accion === 'editarRolMembresia'));
  assert(audit.some((a) => a.accion === 'quitarAcceso'));
  pass('Auditoría registra crearBateria, crearUsuario, editarRolMembresia y quitarAcceso');
} finally {
  await browser?.close();
  const idsBaterias = [bateriaId, `superadmin-existing-${suffix}`].filter(Boolean);
  await prisma.auditoria.deleteMany({ where: { bateriaId: { in: idsBaterias } } });
  await prisma.membresia.deleteMany({ where: { bateriaId: { in: idsBaterias } } });
  await prisma.usuario.deleteMany({ where: { email: { in: [superAdminEmail, normalEmail, directorEmail, segundoEmail] } } });
  await prisma.bateria.deleteMany({ where: { id: { in: idsBaterias } } });
  await prisma.$disconnect();
}
