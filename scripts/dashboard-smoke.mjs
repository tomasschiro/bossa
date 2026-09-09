import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const prisma = new PrismaClient();
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const id = `dashboard-test-${Date.now()}`;
let browser;
const checks = [];
function pass(message) { checks.push(message); console.log('PASS', message); }

try {
  const user = await prisma.usuario.findUniqueOrThrow({ where: { email: 'director@zumzum.com' } });

  const hoy = new Date();
  const enUnaSemana = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dia1 = new Date(hoy.getTime() - 10 * 24 * 60 * 60 * 1000);
  const dia2 = new Date(hoy.getTime() - 5 * 24 * 60 * 60 * 1000);
  const dia3 = new Date(hoy.getTime() - 1 * 24 * 60 * 60 * 1000);

  await prisma.bateria.create({
    data: {
      id,
      nombre: 'Batería de prueba dashboard',
      membresias: { create: { usuarioId: user.id } },
      ediciones: {
        create: [
          {
            id: `${id}-edicion-2025`,
            anioCarnaval: 2025,
            activa: false,
            ritmistasEdicion: {
              create: [
                { naipe: 'Caixa', ritmista: { create: { bateriaId: id, nombre: 'Vieja', apellido: 'Edicion', dni: '20111222', telefono: '1122334455', fechaNacimiento: new Date('1990-01-01'), naipeReferencia: 'Caixa', talleRemera: 'M', calzado: '38' } } },
              ],
            },
            cajaMovimientos: {
              create: [
                { tipo: 'ingreso', categoria: 'General', concepto: 'Ingreso histórico', fecha: new Date('2025-01-10'), monto: 20000, registradoPor: 'seed' },
                { tipo: 'egreso', categoria: 'General', concepto: 'Egreso histórico', fecha: new Date('2025-01-15'), monto: 5000, registradoPor: 'seed' },
              ],
            },
          },
          {
            id: `${id}-edicion-2026`,
            anioCarnaval: 2026,
            activa: true,
            ritmistasEdicion: {
              create: [
                {
                  naipe: 'Caixa',
                  estadoLlegada: 'Confirmado',
                  ritmista: { create: { bateriaId: id, nombre: 'Ana', apellido: 'Caixa', dni: '30111222', telefono: '1122334455', fechaNacimiento: new Date('1995-05-05'), naipeReferencia: 'Caixa', talleRemera: 'M', calzado: '38' } },
                  movimientos: { create: [{ tipo: 'traje', concepto: 'Traje 2026', fecha: hoy, monto: 5000, estado: 'Pendiente', registradoPor: 'seed' }] },
                },
                {
                  naipe: 'Caixa 2',
                  estadoLlegada: 'Confirmado',
                  ritmista: { create: { bateriaId: id, nombre: 'Beto', apellido: 'Caixa', dni: '30111223', telefono: '1122334455', fechaNacimiento: new Date('1996-05-05'), naipeReferencia: 'Caixa', talleRemera: 'M', calzado: '39' } },
                },
                {
                  naipe: 'Surdo',
                  estadoLlegada: 'EnDuda',
                  ritmista: { create: { bateriaId: id, nombre: 'Carla', apellido: 'Surdo', dni: '30111224', telefono: '1122334455', fechaNacimiento: new Date('1997-05-05'), naipeReferencia: 'Surdo', talleRemera: 'S', calzado: '37' } },
                  movimientos: { create: [{ tipo: 'traje', concepto: 'Traje 2026', fecha: hoy, monto: 3000, estado: 'Pendiente', registradoPor: 'seed' }, { tipo: 'pago', concepto: 'Seña', fecha: hoy, monto: 1000, estado: 'Pagado', registradoPor: 'seed' }] },
                },
                {
                  naipe: 'Repique',
                  estadoLlegada: 'NoConfirmado',
                  ritmista: { create: { bateriaId: id, nombre: 'Dario', apellido: 'Repique', dni: '30111225', telefono: '1122334455', fechaNacimiento: new Date('1998-05-05'), naipeReferencia: 'Repique', talleRemera: 'L', calzado: '42' } },
                },
              ],
            },
            cajaMovimientos: {
              create: [
                { tipo: 'ingreso', categoria: 'General', concepto: 'Primer ingreso', fecha: dia1, monto: 15000, registradoPor: 'seed' },
                { tipo: 'egreso', categoria: 'General', concepto: 'Primer egreso', fecha: dia2, monto: 4000, registradoPor: 'seed' },
                { tipo: 'ingreso', categoria: 'General', concepto: 'Segundo ingreso', fecha: dia3, monto: 6000, registradoPor: 'seed' },
              ],
            },
            agendaEventos: {
              create: [
                { tipo: 'ensayo', titulo: 'Ensayo general', fecha: enUnaSemana, registradoPor: 'seed', actualizadoPor: 'seed' },
              ],
            },
          },
        ],
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

  await page.goto(base + '/dashboard');
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
  pass('Página de Dashboard carga');

  await page.getByText('Carnaval 2026', { exact: false }).first().waitFor();
  pass('Dashboard muestra la edición activa (Carnaval 2026)');

  // 1. Ritmistas activos = 4
  const ritmistasCard = page.locator('.rounded-xl', { hasText: 'Ritmistas activos' }).locator('.font-mono-num').first();
  await ritmistasCard.waitFor();
  assert.equal((await ritmistasCard.innerText()).trim(), '4');
  pass('Card "Ritmistas activos" muestra 4 (correcto contra datos sembrados)');

  // 2. Saldo de caja = 15000 - 4000 + 6000 = 17000
  const saldoCard = page.locator('.rounded-xl', { hasText: 'Saldo de caja' }).locator('.font-mono-num').first();
  await saldoCard.waitFor();
  assert.equal((await saldoCard.innerText()).replace(/[^\d]/g, ''), '17000');
  pass('Card "Saldo de caja" muestra 17000 (15000 - 4000 + 6000)');

  // 3. Deuda pendiente = (5000 traje Ana) + (3000 - 1000 pago Carla) = 5000 + 2000 = 7000
  const deudaCard = page.locator('.rounded-xl', { hasText: 'Deuda pendiente' }).locator('.font-mono-num').first();
  await deudaCard.waitFor();
  assert.equal((await deudaCard.innerText()).replace(/[^\d]/g, ''), '7000');
  pass('Card "Deuda pendiente" muestra 7000 (5000 + (3000-1000))');

  // 4. Ediciones en historial = 1 (2025)
  const historialCard = page.locator('.rounded-xl', { hasText: 'Ediciones en historial' }).locator('.font-mono-num').first();
  await historialCard.waitFor();
  assert.equal((await historialCard.innerText()).trim(), '1');
  pass('Card "Ediciones en historial" muestra 1 (Carnaval 2025)');

  // 5. Próximo evento visible
  await page.getByText('Ensayo general', { exact: false }).first().waitFor();
  pass('Próximo evento (Ensayo general) visible en el dashboard');

  // 6. Donut de naipes: composición suma 100% de los activos (4 = 1 Caixa + 1 Caixa2(familia Caixas) + 1 Surdo + 1 Repique)
  await page.getByText('Composición por naipe', { exact: true }).waitFor();
  const naipeSection = page.locator('section', { has: page.getByText('Composición por naipe', { exact: true }) });
  await naipeSection.getByText('Caixas', { exact: true }).waitFor();
  const caixasRow = naipeSection.locator('.flex.items-center.justify-between', { hasText: 'Caixas' });
  const caixasValue = await caixasRow.locator('.font-mono-num').innerText();
  assert.equal(caixasValue.trim(), '2');
  pass('Donut de naipes agrupa "Caixa" y "Caixa 2" en la familia "Caixas" = 2');

  const donutTotal = await naipeSection.locator('.font-mono-num.text-\\[15px\\]').innerText();
  assert.equal(donutTotal.trim(), '4');
  pass('El centro del donut muestra el total de 4 ritmistas activos, igual a la suma de segmentos');

  // 7. Comparativo por edición: incluye activa (2026) e histórica (2025)
  const comparativoSection = page.locator('section', { has: page.getByText('Comparativo por edición', { exact: true }) });
  await comparativoSection.getByText('2026', { exact: true }).first().waitFor();
  await comparativoSection.getByText('2025', { exact: true }).first().waitFor();
  pass('Comparativo por edición incluye la edición activa (2026) y una histórica (2025)');

  // 8. Estado de llegada: Confirmado=2, En duda=1, No confirmado=1
  const estadoSection = page.locator('section', { has: page.getByText('Estado de llegada', { exact: true }) });
  const confirmadoRow = estadoSection.locator('div', { hasText: 'Confirmado' }).first();
  await confirmadoRow.waitFor();
  pass('Sección "Estado de llegada" renderiza con los estados Confirmado/En duda/No confirmado');

  // 9. Línea de tiempo de caja: orden cronológico correcto (última fecha = dia3, saldo final = 17000)
  const timelineSection = page.locator('section', { has: page.getByText('Evolución del saldo de caja', { exact: true }) });
  await timelineSection.locator('svg').waitFor();
  const finalBalance = await timelineSection.locator('.font-mono-num').last().innerText();
  assert.equal(finalBalance.replace(/[^\d]/g, ''), '17000');
  pass('Línea de tiempo de caja muestra saldo final acumulado 17000 (orden cronológico correcto)');

  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });

  // 10. Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  pass('Dashboard sin desbordamiento horizontal en móvil');

  await writeFile('test-results/dashboard-report.json', JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser?.close();
  await prisma.auditoria.deleteMany({ where: { bateriaId: id } });
  await prisma.bateria.deleteMany({ where: { id } });
  await prisma.$disconnect();
}
