import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const prisma = new PrismaClient();
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const id = `presupuesto-test-${Date.now()}`;
let browser;
const checks = [];
function pass(message) { checks.push(message); console.log('PASS', message); }

try {
  const user = await prisma.usuario.findUniqueOrThrow({ where: { email: 'director@zumzum.com' } });
  await prisma.bateria.create({
    data: {
      id,
      nombre: 'Batería de prueba presupuesto',
      membresias: { create: { usuarioId: user.id } },
      ediciones: {
        create: {
          id: `${id}-edicion`,
          anioCarnaval: 2026,
          activa: true,
          ritmistasEdicion: {
            create: [
              {
                naipe: 'Caixa',
                ritmista: {
                  create: {
                    bateriaId: id,
                    nombre: 'Ana',
                    apellido: 'Deudora',
                    dni: '30111222',
                    telefono: '1122334455',
                    fechaNacimiento: new Date('1995-05-05'),
                    naipeReferencia: 'Caixa',
                    talleRemera: 'M',
                    calzado: '38',
                  },
                },
                movimientos: {
                  create: [
                    { tipo: 'traje', concepto: 'Traje 2026', fecha: new Date(), monto: 5000, estado: 'Pendiente', registradoPor: 'seed' },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  });

  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  assert.equal(
    (await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password: process.env.SEED_DIRECTOR_PASSWORD ?? 'ZumZum2026!' } })).status(),
    200,
  );
  await context.addCookies([{ name: 'bossa-bateria', value: id, url: base }]);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  await page.goto(base + '/presupuesto');
  await page.getByRole('heading', { name: 'Presupuesto', exact: true }).waitFor();
  pass('Página de Presupuesto carga');

  const today = new Date().toISOString().slice(0, 10);

  // 1. Carga libre ingreso
  await page.getByRole('button', { name: '+ Carga libre', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  await dialog.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Ingreso', exact: true }).click();
  await dialog.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: 'Otros gastos generales', exact: true }).click();
  await dialog.getByPlaceholder('Ej. Sponsor — Ferretería Pérez').fill('Sponsor Ferretería Pérez');
  await dialog.locator('input[type="number"]').fill('10000');
  await dialog.locator('input[type="date"]').fill(today);
  await dialog.getByRole('button', { name: 'Guardar movimiento', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByText('Sponsor Ferretería Pérez', { exact: true }).first().waitFor();
  const saldoTrasIngreso = await page.locator('.font-mono-num.text-\\[36px\\]').innerText();
  assert.equal(saldoTrasIngreso.replace(/[^\d]/g, ''), '10000');
  pass('Carga libre de ingreso creada y refleja en saldo de caja');

  // 2. Carga libre egreso
  await page.getByRole('button', { name: '+ Carga libre', exact: true }).click();
  await dialog.waitFor();
  await dialog.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Egreso', exact: true }).click();
  await dialog.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: 'Ensayos/logística', exact: true }).click();
  await dialog.getByPlaceholder('Ej. Sponsor — Ferretería Pérez').fill('Combustible ensayo');
  await dialog.locator('input[type="number"]').fill('2000');
  await dialog.locator('input[type="date"]').fill(today);
  await dialog.getByRole('button', { name: 'Guardar movimiento', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByText('Combustible ensayo', { exact: true }).first().waitFor();
  const saldoTrasEgreso = await page.locator('.font-mono-num.text-\\[36px\\]').innerText();
  assert.equal(saldoTrasEgreso.replace(/[^\d]/g, ''), '8000');
  pass('Carga libre de egreso creada y refleja en saldo de caja');

  // 3. Ítem de costo de Fantasía (costo unidad × cantidad) reflejado en Caja general
  await page.getByRole('tab', { name: 'Fantasía', exact: true }).click();
  await page.getByRole('button', { name: '+ Cargar costo', exact: true }).click();
  await dialog.waitFor();
  await dialog.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Telas', exact: true }).click();
  await dialog.getByPlaceholder('Ej. Tela dorada').fill('Tela satinada');
  await dialog.locator('input[type="number"]').nth(0).fill('500');
  await dialog.locator('input[type="number"]').nth(1).fill('6');
  await dialog.getByText('Subtotal:').locator('..').getByText('$3.000', { exact: false }).waitFor();
  await dialog.locator('input[type="date"]').fill(today);
  await dialog.getByRole('button', { name: 'Guardar gasto', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByText('Tela satinada', { exact: true }).first().waitFor();
  await page.getByText('$3.000', { exact: false }).first().waitFor();
  pass('Ítem de costo de Fantasía creado con subtotal 500×6=3000 calculado correctamente');

  const gastadoCard = page.locator('.font-mono-num.text-\\[36px\\]').first();
  await gastadoCard.waitFor();
  assert.equal((await gastadoCard.innerText()).replace(/[^\d]/g, ''), '3000');
  pass('Card "Gastado" de Fantasía muestra el total correcto (suma de subtotales)');

  await page.getByRole('tab', { name: 'Caja general', exact: true }).click();
  await page.getByText('Tela satinada', { exact: true }).first().waitFor();
  const fantasiaCajaDesglose = page.locator('.rounded-xl', { hasText: 'Fantasía/temática' }).locator('.font-mono-num.text-\\[22px\\]').last();
  await fantasiaCajaDesglose.waitFor();
  assert.equal((await fantasiaCajaDesglose.innerText()).replace(/[^\d-]/g, ''), '-3000');
  pass('Gasto de Fantasía (500×6) crea movimiento espejo de -3000 en Caja general');

  // 3b. Traspaso: ingreso libre sin destino (General) → Fantasía, también suma al Estimado
  await page.getByRole('button', { name: '+ Carga libre', exact: true }).click();
  await dialog.waitFor();
  await dialog.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Ingreso', exact: true }).click();
  await dialog.getByPlaceholder('Ej. Sponsor — Ferretería Pérez').fill('Donación sin destino');
  await dialog.locator('input[type="number"]').fill('5000');
  await dialog.locator('input[type="date"]').fill(today);
  await dialog.getByRole('button', { name: 'Guardar movimiento', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByText('Donación sin destino', { exact: true }).first().waitFor();
  pass('Ingreso libre cargado en categoría General por defecto (sin destino definido)');

  const saldoTotalAntes = await page.locator('.font-mono-num.text-\\[36px\\]').innerText();
  const generalCardAntes = page.locator('.rounded-xl').filter({ has: page.getByText('General', { exact: true }) }).locator('.font-mono-num.text-\\[22px\\]').last();
  await generalCardAntes.waitFor();
  const saldoGeneralAntes = await generalCardAntes.innerText();
  assert.equal(saldoGeneralAntes.replace(/[^\d]/g, ''), '5000');
  pass('Saldo de General refleja el ingreso libre de 5000');

  await page.locator('.rounded-xl').filter({ has: page.getByText('General', { exact: true }) }).getByRole('button', { name: 'Asignar / Traspasar' }).click();
  const traspasoDialog = page.getByRole('dialog');
  await traspasoDialog.waitFor();
  await traspasoDialog.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: 'Fantasía/temática', exact: true }).click();
  await traspasoDialog.locator('input[type="number"]').fill('2000');
  await traspasoDialog.getByRole('button', { name: 'Traspasar', exact: true }).click();
  await traspasoDialog.waitFor({ state: 'hidden' });
  pass('Traspaso de 2000 de General a Fantasía/temática ejecutado');

  const generalCardDespues = page.locator('.rounded-xl').filter({ has: page.getByText('General', { exact: true }) }).locator('.font-mono-num.text-\\[22px\\]').last();
  await generalCardDespues.waitFor();
  assert.equal((await generalCardDespues.innerText()).replace(/[^\d]/g, ''), '3000');
  pass('Saldo de General bajó exactamente el monto traspasado (5000 → 3000)');

  await page.getByText(/Traspaso General → Fantasía/).first().waitFor();
  pass('Apareció un ingreso (movimiento de traspaso) en Fantasía/temática por el monto traspasado (2000)');

  const fantasiaCardDespues = page.locator('.rounded-xl', { hasText: 'Fantasía/temática' }).locator('.font-mono-num.text-\\[22px\\]').last();
  await fantasiaCardDespues.waitFor();
  assert.equal((await fantasiaCardDespues.innerText()).replace(/[^\d-]/g, ''), '-1000');
  pass('Saldo neto de Fantasía/temática refleja gasto previo (-3000) + traspaso (+2000) = -1000');

  const saldoTotalDespues = await page.locator('.font-mono-num.text-\\[36px\\]').innerText();
  assert.equal(saldoTotalAntes, saldoTotalDespues);
  pass('El saldo TOTAL de la caja general no cambió antes/después del traspaso');

  await page.getByRole('tab', { name: 'Fantasía', exact: true }).click();
  const estimadoFantasiaCard = page.locator('.font-mono-num.text-\\[36px\\]').first();
  await estimadoFantasiaCard.waitFor();
  await page.getByText('de $2.000 presupuestado', { exact: false }).waitFor();
  pass('El Estimado de Fantasía subió exactamente el monto traspasado (2000)');
  await page.getByRole('tab', { name: 'Caja general', exact: true }).click();

  // 4. Repuestos/instrumentos: deja de ser solo lectura, crear instrumento como Necesidad
  await page.getByRole('tab', { name: 'Repuestos e instrumentos', exact: true }).click();
  await page.getByRole('button', { name: '+ Agregar instrumento', exact: true }).click();
  await dialog.waitFor();
  await dialog.getByRole('combobox').first().click();
  await page.getByPlaceholder('Buscar o crear tipo...').fill('Berimbau');
  await page.getByRole('option', { name: '+ Crear "Berimbau"' }).click();
  await dialog.locator('input[type="number"]').first().fill('2');
  await dialog.getByRole('combobox').filter({ hasText: 'Ninguna' }).click();
  await page.getByRole('option', { name: 'Necesidad', exact: true }).click();
  await dialog.getByRole('combobox').filter({ hasText: 'Deseable' }).click();
  await page.getByRole('option', { name: 'Urgente', exact: true }).click();
  await dialog.getByRole('button', { name: 'Guardar instrumento', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByText('Berimbau', { exact: true }).first().waitFor();
  pass('Instrumento "Berimbau" creado desde Presupuesto como Necesidad/Urgente');

  const urgenteCard = page.locator('.rounded-xl', { hasText: 'Urgente' }).locator('.font-mono-num.text-\\[28px\\]').last();
  await urgenteCard.waitFor();
  pass('Card "Urgente" de Repuestos e instrumentos refleja el nuevo ítem');

  await page.goto(base + '/inventario');
  await page.getByRole('heading', { name: 'Inventario', exact: true }).waitFor();
  await page.getByText('Berimbau', { exact: true }).first().waitFor();
  pass('Instrumento creado desde Presupuesto aparece también en Inventario (mismo dato, no duplicado)');
  await page.goto(base + '/presupuesto');
  await page.getByRole('tab', { name: 'Repuestos e instrumentos', exact: true }).click();

  // 5. Beneficio general con fecha aparece en Agenda
  await page.getByRole('tab', { name: 'Beneficios', exact: true }).click();
  await page.getByRole('button', { name: '+ Nuevo beneficio', exact: true }).click();
  await dialog.waitFor();
  await dialog.getByPlaceholder('Ej. Feria de comidas').fill('Feria de comidas 2026');
  await dialog.locator('input[type="date"]').fill(today);
  await dialog.locator('input[type="number"]').nth(1).fill('15000');
  await dialog.getByRole('button', { name: 'Guardar beneficio', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByText('Feria de comidas 2026', { exact: true }).first().waitFor();
  pass('Beneficio general creado');

  const recaudadoCard = page.locator('.rounded-xl', { hasText: 'Feria de comidas 2026' }).locator('.font-mono-num.text-\\[22px\\]').last();
  await recaudadoCard.waitFor();
  assert.equal((await recaudadoCard.innerText()).replace(/[^\d]/g, ''), '15000');
  pass('Card del evento "Feria de comidas 2026" muestra el ingreso bruto correcto');

  await page.goto(base + '/agenda');
  await page.getByText('Feria de comidas 2026', { exact: true }).first().waitFor();
  pass('Beneficio general aparece en Agenda');

  // 6. Beneficio distribuido: tipo nuevo + vendedor ritmista + venta (deuda + excedente)
  await page.goto(base + '/presupuesto');
  await page.getByRole('tab', { name: 'Beneficios distribuidos', exact: true }).click();
  await page.getByRole('button', { name: '+ Nuevo tipo', exact: true }).click();
  await dialog.waitFor();
  await dialog.getByPlaceholder('Ej. Rifa').fill('Bono contribución');
  await dialog.locator('input[type="number"]').fill('3000');
  await dialog.locator('input[type="date"]').fill('2026-12-31');
  await dialog.getByRole('button', { name: 'Guardar tipo', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByText('Bono contribución', { exact: true }).first().waitFor();
  pass('Tipo de beneficio distribuido creado');

  await page.getByRole('button', { name: /Bono contribución/ }).click();
  await page.getByRole('button', { name: '+ Vendedor', exact: true }).click();
  await dialog.waitFor();
  await dialog.getByRole('button', { name: 'Ritmista', exact: true }).click();
  await dialog.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Ana Deudora', exact: true }).click();
  await dialog.locator('input[type="number"]').fill('5');
  await dialog.getByRole('button', { name: 'Guardar vendedor', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByText('Ana Deudora', { exact: true }).first().waitFor();
  pass('Vendedor ritmista agregado');

  await page.getByRole('button', { name: '+ Venta', exact: true }).first().click();
  await dialog.waitFor();
  await dialog.getByRole('button', { name: 'Unidades', exact: true }).click();
  await dialog.locator('input[type="number"]').first().fill('3');
  await dialog.locator('input[type="date"]').fill(today);
  await dialog.getByRole('button', { name: 'Guardar venta', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByText('Vendido: $9.000', { exact: false }).first().waitFor();
  pass('Venta a ritmista registrada (monto 9000, deuda 5000 + excedente 4000)');

  await page.getByRole('tab', { name: 'Caja general', exact: true }).click();
  await page.getByText(/Excedente venta Bono contribución/).first().waitFor();
  pass('Excedente de venta a ritmista refleja ingreso en Caja general');

  // 7. Beneficio distribuido: vendedor externo + venta directa
  await page.getByRole('tab', { name: 'Beneficios distribuidos', exact: true }).click();
  await page.getByText('Bono contribución', { exact: true }).first().waitFor();
  if (await page.getByRole('button', { name: '+ Vendedor', exact: true }).count() === 0) {
    await page.getByRole('button', { name: /Bono contribución/ }).click();
    await page.getByRole('button', { name: '+ Vendedor', exact: true }).waitFor();
  }
  await page.getByRole('button', { name: '+ Vendedor', exact: true }).click();
  await dialog.waitFor();
  await dialog.getByRole('button', { name: 'Externo', exact: true }).click();
  await dialog.getByPlaceholder('Nombre del colaborador').fill('Ferretería Pérez');
  await dialog.getByPlaceholder('Teléfono o email').fill('011-4444-5555');
  await dialog.locator('input[type="number"]').fill('0');
  await dialog.getByRole('button', { name: 'Guardar vendedor', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByText('Ferretería Pérez', { exact: false }).first().waitFor();
  pass('Vendedor externo agregado');

  await page.getByRole('button', { name: '+ Venta', exact: true }).last().click();
  await dialog.waitFor();
  await dialog.getByRole('button', { name: 'Monto directo', exact: true }).click();
  await dialog.locator('input[type="number"]').fill('6000');
  await dialog.locator('input[type="date"]').fill(today);
  await dialog.getByRole('button', { name: 'Guardar venta', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByText('Vendido: $6.000', { exact: false }).first().waitFor();
  pass('Venta a vendedor externo registrada');

  await page.getByRole('tab', { name: 'Caja general', exact: true }).click();
  await page.getByText(/Venta Bono contribución — Ferretería Pérez/).first().waitFor();
  pass('Venta a vendedor externo genera ingreso completo en Caja general');

  await page.getByRole('tab', { name: 'Beneficios distribuidos', exact: true }).click();
  const vendidoTotalCard = page.locator('.font-mono-num.text-\\[36px\\]').first();
  await vendidoTotalCard.waitFor();
  assert.equal((await vendidoTotalCard.innerText()).replace(/[^\d]/g, ''), '15000');
  pass('Hero "Total distribuido a ritmistas" de Beneficios distribuidos muestra 15000 correcto');

  // 8. Stock de indumentaria
  await page.getByRole('tab', { name: 'Stock de indumentaria', exact: true }).click();
  await page.waitForTimeout(300);
  const stockInputs = page.locator('table input[type="number"]');
  await stockInputs.first().fill('20');
  await stockInputs.first().blur();
  await page.waitForTimeout(500);
  pass('Stock de indumentaria guardado');

  const tallesConFaltanteCard = page.locator('.rounded-xl', { hasText: 'Talles con faltante' }).locator('.font-mono-num.text-\\[28px\\]').last();
  await tallesConFaltanteCard.waitFor();
  pass('Card "Talles con faltante" de Stock de indumentaria visible');

  // 9. Reload completo, confirmar persistencia
  await page.goto(base + '/presupuesto');
  await page.getByRole('heading', { name: 'Presupuesto', exact: true }).waitFor();
  await page.getByText('Sponsor Ferretería Pérez', { exact: true }).first().waitFor();
  await page.getByText('Combustible ensayo', { exact: true }).first().waitFor();
  await page.getByRole('tab', { name: 'Fantasía', exact: true }).click();
  await page.getByText('Tela satinada', { exact: true }).first().waitFor();
  await page.getByRole('tab', { name: 'Beneficios', exact: true }).click();
  await page.getByText('Feria de comidas 2026', { exact: true }).first().waitFor();
  await page.getByRole('tab', { name: 'Beneficios distribuidos', exact: true }).click();
  await page.getByText('Bono contribución', { exact: true }).first().waitFor();
  await page.getByRole('tab', { name: 'Repuestos e instrumentos', exact: true }).click();
  await page.getByText('Berimbau', { exact: true }).first().waitFor();
  pass('Todos los datos de Presupuesto persisten tras reload completo');

  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/presupuesto-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole('heading', { name: 'Presupuesto', exact: true }).waitFor();
  await page.screenshot({ path: 'test-results/presupuesto-mobile.png', fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  pass('Presupuesto sin desbordamiento en móvil');

  await writeFile('test-results/presupuesto-report.json', JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser?.close();
  await prisma.auditoria.deleteMany({ where: { bateriaId: id } });
  await prisma.bateria.deleteMany({ where: { id } });
  await prisma.$disconnect();
}
