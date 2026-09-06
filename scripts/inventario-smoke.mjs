import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const prisma = new PrismaClient();
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const id = `inventario-test-${Date.now()}`;
let browser;
const checks = [];
function pass(message) { checks.push(message); console.log('PASS', message); }
try {
  const user = await prisma.usuario.findUniqueOrThrow({ where: { email: 'director@zumzum.com' } });
  await prisma.bateria.create({ data: { id, nombre: 'Batería de prueba inventario', membresias: { create: { usuarioId: user.id } }, ediciones: { create: { anioCarnaval: 2026, activa: true } } } });
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password: process.env.SEED_DIRECTOR_PASSWORD ?? 'ZumZum2026!' } })).status(), 200);
  await context.addCookies([{ name: 'bossa-bateria', value: id, url: base }]);
  const page = await context.newPage(); page.setDefaultTimeout(15000);

  await page.goto(base + '/inventario');
  await page.getByRole('heading', { name: 'Inventario', exact: true }).waitFor();
  pass('Página de Inventario carga');

  // 1. Crear instrumento tipo Caixa -> Tipo de Caixa debe aparecer
  await page.getByRole('button', { name: '+ Agregar instrumento', exact: true }).click();
  await page.getByRole('dialog').getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Caixa', exact: true }).click();
  await page.getByRole('dialog').getByText('Tipo de Caixa', { exact: true }).waitFor();
  pass('Campo Tipo de Caixa aparece para tipo Caixa');

  await page.getByRole('dialog').getByRole('combobox').nth(1).click(); // Tipo de Caixa select
  await page.getByRole('option', { name: 'Vazada', exact: true }).click();
  await page.getByPlaceholder('14').fill('14');
  await page.getByRole('button', { name: 'Guardar instrumento', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText('Caixa', { exact: true }).first().waitFor();
  pass('Instrumento Caixa creado');

  // 2. Crear instrumento de otro tipo -> Tipo de Caixa NO debe aparecer
  await page.getByRole('button', { name: '+ Agregar instrumento', exact: true }).click();
  await page.getByRole('dialog').getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Surdo', exact: true }).click();
  assert.equal(await page.getByRole('dialog').getByText('Tipo de Caixa', { exact: true }).count(), 0);
  pass('Campo Tipo de Caixa NO aparece para otro tipo');
  await page.getByRole('button', { name: 'Guardar instrumento', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  // 3. Combobox: escribir tipo nuevo y crearlo
  await page.getByRole('button', { name: '+ Agregar instrumento', exact: true }).click();
  await page.getByRole('dialog').getByRole('combobox').first().click();
  await page.getByPlaceholder('Buscar o crear tipo...').fill('Ganzá');
  const crearOption = page.getByRole('option', { name: '+ Crear "Ganzá"' });
  await crearOption.waitFor();
  pass('Opción "+ Crear" aparece para tipo no listado');
  await crearOption.click();
  await page.getByRole('dialog').getByRole('combobox').first().getByText('Ganzá').waitFor();
  await page.getByRole('button', { name: 'Guardar instrumento', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText('Ganzá', { exact: true }).first().waitFor();
  pass('Instrumento con tipo nuevo "Ganzá" creado y visible en la tabla');

  // Confirm "Ganzá" persists as a selectable option next time (available battery-wide)
  await page.getByRole('button', { name: '+ Agregar instrumento', exact: true }).click();
  await page.getByRole('dialog').getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Ganzá', exact: true }).waitFor();
  pass('Tipo "Ganzá" queda disponible como opción sin re-tipearlo');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();

  // 4. Editar cantidad y estado de un instrumento existente
  await page.getByRole('button', { name: /Editar Caixa/ }).first().click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('dialog').locator('input[type="number"]').first().fill('5');
  await page.getByRole('dialog').getByRole('combobox').filter({ hasText: 'Bueno' }).click();
  await page.getByRole('option', { name: 'Regular', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText('Regular', { exact: true }).first().waitFor();
  pass('Edición de cantidad y estado de instrumento existente');

  // 5. Reload completo, confirmar persistencia real
  await page.reload();
  await page.getByRole('heading', { name: 'Inventario', exact: true }).waitFor();
  await page.getByText('Ganzá', { exact: true }).first().waitFor();
  await page.getByText('Regular', { exact: true }).first().waitFor();
  pass('Datos de instrumentos persisten tras reload completo');

  // 6. Alta corta de Repuesto
  await page.getByRole('tab', { name: 'Repuestos', exact: true }).click();
  await page.getByRole('button', { name: '+ Agregar repuesto', exact: true }).click();
  await page.getByPlaceholder('Ej. Cuero de caixa 14"').fill('Cuero 14 pulgadas');
  await page.getByRole('button', { name: 'Guardar repuesto', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByText('Cuero 14 pulgadas', { exact: true }).first().waitFor();
  pass('Repuesto creado');

  await page.reload();
  await page.getByRole('tab', { name: 'Repuestos', exact: true }).click();
  await page.getByText('Cuero 14 pulgadas', { exact: true }).first().waitFor();
  pass('Datos de repuestos persisten tras reload completo');

  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/inventario-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole('heading', { name: 'Inventario', exact: true }).waitFor();
  await page.screenshot({ path: 'test-results/inventario-mobile.png', fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  pass('Inventario sin desbordamiento en móvil');

  await writeFile('test-results/inventario-report.json', JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser?.close();
  await prisma.auditoria.deleteMany({ where: { bateriaId: id } });
  await prisma.bateria.deleteMany({ where: { id } });
  await prisma.$disconnect();
}
