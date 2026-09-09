// Requiere BLOB_READ_WRITE_TOKEN real en .env.local (Vercel dashboard → Storage → Blob).
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const prisma = new PrismaClient();
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const suffix = Date.now();
const id = `logo-test-${suffix}`;
const userId = `logo-user-${suffix}`;
const email = `${userId}@example.com`;
let browser;
const checks = [];
const pass = (s) => { checks.push(s); console.log('PASS', s); };

// PNG 1x1 rojo válido, mínimo.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

try {
  await prisma.bateria.create({ data: { id, nombre: 'Batería de logo', ediciones: { create: { anioCarnaval: 2026, activa: true } } } });
  await prisma.usuario.create({ data: { id: userId, email, nombre: 'Directora Logo', accounts: { create: { issuer: 'local:credential', providerId: 'credential', accountId: userId, password: await hashPassword('Inicial2026!') } }, membresias: { create: { bateriaId: id } } } });

  await mkdir('test-results', { recursive: true });
  const pngPath = 'test-results/logo-fixture.png';
  await writeFile(pngPath, PNG_1X1);
  const txtPath = 'test-results/logo-fixture-invalido.txt';
  await writeFile(txtPath, 'no es una imagen');

  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email, password: 'Inicial2026!' } })).status(), 200);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  await page.goto(base + '/configuracion');
  await page.getByRole('button', { name: 'Subir logo', exact: true }).waitFor();
  assert.equal(await page.locator('img[alt="Logo de la batería"]').count(), 0);
  pass('Configuración carga sin logo (placeholder por defecto)');

  await page.getByRole('button', { name: 'Subir logo', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(pngPath);
  await page.getByRole('status').filter({ hasText: 'Logo actualizado.' }).waitFor();

  const bateriaTrasSubida = await prisma.bateria.findUniqueOrThrow({ where: { id } });
  assert(bateriaTrasSubida.logoUrl?.includes('blob.vercel-storage.com'));
  pass('Subir un logo válido guarda una URL de Vercel Blob en la batería');

  await page.reload();
  await page.locator('img[alt="Logo de la batería"]').waitFor();
  const src = await page.locator('img[alt="Logo de la batería"]').getAttribute('src');
  assert.equal(src, bateriaTrasSubida.logoUrl);
  pass('El logo persiste y se muestra tras recargar');

  const auditSubida = await prisma.auditoria.findMany({ where: { bateriaId: id, accion: 'editarLogo' } });
  assert.equal(auditSubida.length, 1);
  pass('Auditoría registra editarLogo');

  const primerLogoUrl = bateriaTrasSubida.logoUrl;
  await page.getByRole('button', { name: 'Subir logo', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(pngPath);
  await page.getByRole('status').filter({ hasText: 'Logo actualizado.' }).waitFor();
  const bateriaTrasSegundaSubida = await prisma.bateria.findUniqueOrThrow({ where: { id } });
  assert.notEqual(bateriaTrasSegundaSubida.logoUrl, primerLogoUrl);
  pass('Subir un segundo logo reemplaza la URL guardada');

  await page.getByRole('button', { name: 'Subir logo', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles(txtPath);
  await page.getByRole('alert').filter({ hasText: 'Usá una imagen' }).waitFor();
  const bateriaTrasInvalido = await prisma.bateria.findUniqueOrThrow({ where: { id } });
  assert.equal(bateriaTrasInvalido.logoUrl, bateriaTrasSegundaSubida.logoUrl);
  pass('Archivo de tipo inválido rechazado sin cambiar el logo');

  await page.getByRole('button', { name: 'Quitar logo', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Logo eliminado.' }).waitFor();
  const bateriaTrasQuitar = await prisma.bateria.findUniqueOrThrow({ where: { id } });
  assert.equal(bateriaTrasQuitar.logoUrl, null);
  pass('Quitar logo limpia logoUrl en la batería');

  await page.reload();
  assert.equal(await page.locator('img[alt="Logo de la batería"]').count(), 0);
  pass('Tras quitar el logo, la UI vuelve a mostrar el placeholder');

  const auditQuitar = await prisma.auditoria.findMany({ where: { bateriaId: id, accion: 'quitarLogo' } });
  assert.equal(auditQuitar.length, 1);
  pass('Auditoría registra quitarLogo');

  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/logo-desktop.png', fullPage: true });
} finally {
  await browser?.close();
  await prisma.auditoria.deleteMany({ where: { bateriaId: id } });
  await prisma.bateria.deleteMany({ where: { id } });
  await prisma.usuario.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
