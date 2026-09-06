// Run against `npm run dev`. Temporary records are removed in finally.
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const baseURL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const prisma = new PrismaClient();
const suffix = Date.now().toString();
const concepto = `Prueba autenticación ${suffix}`;
const batteryId = `test-bateria-${suffix}`;
const email = `test-${suffix}@example.com`;
const checks = [];
let secondaryUser;
let primaryUser;
let browser;
let movement;
const check = (name) => { checks.push(name); console.log(`PASS ${name}`); };
async function action(context, name, args = []) {
  const manifest = JSON.parse(await readFile('.next/dev/server/server-reference-manifest.json', 'utf8'));
  const entry = Object.entries(manifest.node).find(([, value]) => value.exportedName === name);
  assert(entry, `Missing action ${name}`);
  const response = await context.request.post(`${baseURL}/ritmistas/carnaval`, {
    headers: { 'Next-Action': entry[0], 'Content-Type': 'text/plain;charset=UTF-8', Origin: baseURL },
    data: JSON.stringify(args), maxRedirects: 0,
  });
  return { status: response.status(), text: await response.text(), headers: response.headers() };
}
async function denied(context, name, args) {
  const result = await action(context, name, args);
  assert(result.status >= 400 || /\n\w+:E\{/.test(result.text), `${name} should fail: ${result.text.slice(0, 300)}`);
}
try {
  await prisma.bateria.create({data:{id:`primary-${batteryId}`,nombre:'Batería principal de prueba'}});
  primaryUser = await prisma.usuario.create({data:{id:`primary-${suffix}`,email:`primary-${email}`,nombre:'Directora Principal',accounts:{create:{issuer:'local:credential',providerId:'credential',accountId:`primary-${suffix}`,password:await hashPassword(process.env.SEED_DIRECTOR_PASSWORD??'ZumZum2026!')}},membresias:{create:{bateriaId:`primary-${batteryId}`}}}});
  const primaryEdition=await prisma.edicion.create({data:{bateriaId:`primary-${batteryId}`,anioCarnaval:new Date().getFullYear()+1,activa:true}});
  await prisma.ritmista.create({data:{bateriaId:`primary-${batteryId}`,nombre:'Martina',apellido:'Paredes',dni:`primary-${suffix}`,telefono:'123',fechaNacimiento:new Date('2001-03-14'),naipeReferencia:'Caixas',talleRemera:'M',calzado:'38',ritmistasEdicion:{create:{edicionId:primaryEdition.id,naipe:'Caixas'}}}});
  const primaryMembership = await prisma.membresia.findFirstOrThrow({ where: { usuarioId: primaryUser.id }, orderBy: [{createdAt:'asc'},{id:'asc'}] });
  await prisma.bateria.create({ data: { id: batteryId, nombre: `Batería prueba ${suffix}` } });
  secondaryUser = await prisma.usuario.create({ data: { email, nombre: 'Directora Otra Batería', accounts: { create: { issuer:'local:credential', providerId:'credential', accountId:`test-user-${suffix}`, password: await hashPassword('Prueba2026!') } }, membresias: { create: { bateriaId: batteryId } }, id:`test-user-${suffix}` } });
  const ed = await prisma.edicion.create({ data: { bateriaId: batteryId, anioCarnaval: 2026, activa: true } });
  const r = await prisma.ritmista.create({ data: { bateriaId: batteryId, nombre:`Exclusivo${suffix}`, apellido:'OtraBateria', dni:suffix, telefono:'123', fechaNacimiento: new Date('2000-01-01'), naipeReferencia:'Caixas', talleRemera:'M', calzado:'40' } });
  const re = await prisma.ritmistaEdicion.create({ data: { edicionId: ed.id, ritmistaId: r.id, naipe:'Caixas', movimientos: { create: { tipo:'pago', concepto:'Privado', fecha:new Date(), monto:1, estado:'Pagado', registradoPor:secondaryUser.nombre } }, beneficios: { create: { concepto:'Privado', fecha:new Date(), monto:1, estado:'Rendido', registradoPor:secondaryUser.nombre } }, entregas: { create: { item:'Medias' } } }, include:{ movimientos:true, beneficios:true, entregas:true } });
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width:1440, height:1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000);
  for (const route of ['/','/dashboard','/naipes','/inventario','/agenda','/configuracion','/presupuesto','/ritmistas/base-de-datos','/ritmistas/carnaval']) {
    await page.goto(baseURL + route); await page.waitForURL('**/login');
  }
  check('Todas las pantallas redirigen a login sin sesión');
  const unauth = await action(context, 'getRitmistasPadron');
  assert(unauth.headers['x-action-redirect']?.includes('/login') || unauth.text.includes('/login'));
  check('Acción invocada directamente exige sesión');
  await page.getByLabel('Email',{exact:true}).fill(primaryUser.email);
  await page.getByLabel('Contraseña',{exact:true}).fill('Incorrecta123!');
  await page.getByRole('button',{name:'Ingresar',exact:true}).click();
  await page.getByRole('alert').waitFor();
  assert(page.url().endsWith('/login'));
  check('Contraseña incorrecta rechazada');
  await page.getByLabel('Contraseña',{exact:true}).fill(process.env.SEED_DIRECTOR_PASSWORD ?? 'ZumZum2026!');
  await page.getByRole('button',{name:'Ingresar',exact:true}).click();
  await page.waitForURL('**/ritmistas/carnaval');
  await page.getByText(primaryUser.nombre,{exact:true}).waitFor();
  assert(!(await page.locator('body').innerText()).includes(r.nombre));
  check('Login real y Carnaval filtrado por membresía');
  await page.getByText('Martina Paredes',{exact:true}).first().click();
  await page.getByRole('button',{name:'Registrar pago',exact:true}).click();
  await page.getByPlaceholder('Ej. Traje de Caixa').fill(concepto);
  await page.getByPlaceholder('0',{exact:true}).fill('123');
  const saveResponse = page.waitForResponse(resp => resp.request().method() === 'POST' && Boolean(resp.request().headers()['next-action']));
  await page.getByRole('button',{name:'Guardar movimiento'}).click();
  assert.equal((await saveResponse).status(),200);
  movement = await prisma.movimientoCuentaCorriente.findFirstOrThrow({ where:{concepto} });
  assert.equal(movement.registradoPor, primaryUser.nombre);
  await page.reload();
  await page.getByText('Martina Paredes',{exact:true}).first().click();
  const row = page.getByRole('row').filter({hasText:concepto});
  await row.waitFor(); assert((await row.innerText()).includes(primaryUser.nombre));
  assert(!(await row.innerText()).includes('Director Zum Zum'));
  await mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/auth-movimiento.png',fullPage:true});
  check('Pago persistido y visible después de recargar con nombre real');
  for(const [name,args] of [['getRitmista',[r.id]],['getRitmistaEdicionById',[re.id]]]) {
    const result=await action(context,name,args); assert.equal(result.status,200); assert(/\n\w+:null/.test(result.text));
  }
  const padron=await action(context,'getRitmistasPadron'); assert(!padron.text.includes(r.nombre));
  const carnaval=await action(context,'getRitmistasEdicion'); assert(!carnaval.text.includes(r.nombre));
  check('Padrón, Carnaval y Ficha excluyen registros de otra batería');
  const update={id:r.id,nombre:'Intruso',apellido:'Intruso',dni:'123',telefono:'123',nacimientoIso:'2000-01-01',talleRemera:'M',calzado:'40',nivel:'Avanzado'};
  for(const [name,args] of [
    ['updateRitmista',[update]], ['updateRitmistaEdicion',[{id:re.id,naipe:'Intruso',estadoLlegada:'Confirmado'}]],
    ['updateBeneficiosCounts',[{id:re.id,beneficiosAsignados:99,beneficiosVendidos:99}]],
    ['addMovimiento',[{ritmistaEdicionId:re.id,tipo:'pago',concepto:'Intruso',fechaIso:'2026-09-04',monto:5,estado:'Pagado',registradoPor:'Falsificado'}]],
    ['addBeneficio',[{ritmistaEdicionId:re.id,concepto:'Intruso',fechaIso:'2026-09-04',monto:5,estado:'Rendido',registradoPor:'Falsificado'}]],
    ['revertMovimiento',[re.movimientos[0].id]], ['revertBeneficio',[re.beneficios[0].id]], ['toggleEntrega',[{id:re.entregas[0].id,entregadoPor:'Falsificado'}]],
  ]) await denied(context,name,args);
  assert.equal((await prisma.ritmista.findUniqueOrThrow({where:{id:r.id}})).nombre,r.nombre);
  assert.equal(await prisma.movimientoCuentaCorriente.count({where:{ritmistaEdicionId:re.id}}),1);
  assert.equal(await prisma.beneficioMovimiento.count({where:{ritmistaEdicionId:re.id}}),1);
  assert.equal((await prisma.entregaIndumentaria.findUniqueOrThrow({where:{id:re.entregas[0].id}})).estado,'Pendiente');
  check('Ocho escrituras/reversiones cruzadas rechazadas sin alterar datos');
  const other=await browser.newContext();
  assert.equal((await other.request.post(baseURL+'/api/auth/sign-in/email',{data:{email,password:'Prueba2026!'}})).status(),200);
  const otherPadron=await action(other,'getRitmistasPadron'); assert(otherPadron.text.includes(r.nombre)); assert(!otherPadron.text.includes('Martina'));
  const otherCarnaval=await action(other,'getRitmistasEdicion'); assert(otherCarnaval.text.includes(r.nombre)); assert(!otherCarnaval.text.includes('Martina'));
  check('Segundo director obtiene datos propios con ID de batería generado');
  await other.addCookies([{name:'bossa-bateria',value:primaryMembership.bateriaId,url:baseURL}]);
  const forged=await action(other,'getRitmistasPadron'); assert(forged.text.includes(r.nombre)); assert(!forged.text.includes('Martina'));
  check('Cookie de batería falsificada no concede acceso');
  await action(other,'addBeneficio',[{ritmistaEdicionId:re.id,concepto:'Autor real',fechaIso:'2026-09-04',monto:2,estado:'Rendido',registradoPor:'Falsificado'}]);
  const benefit=await prisma.beneficioMovimiento.findFirstOrThrow({where:{ritmistaEdicionId:re.id,concepto:'Autor real'}}); assert.equal(benefit.registradoPor,secondaryUser.nombre);
  await action(other,'toggleEntrega',[{id:re.entregas[0].id,entregadoPor:'Falsificado'}]);
  assert.equal((await prisma.entregaIndumentaria.findUniqueOrThrow({where:{id:re.entregas[0].id}})).entregadoPor,secondaryUser.nombre);
  await action(other,'addMovimiento',[{ritmistaEdicionId:re.id,tipo:'pago',concepto:'Autor real',fechaIso:'2026-09-04',monto:2,estado:'Pagado',registradoPor:'Falsificado'}]);
  const otherMove=await prisma.movimientoCuentaCorriente.findFirstOrThrow({where:{ritmistaEdicionId:re.id,concepto:'Autor real'}}); assert.equal(otherMove.registradoPor,secondaryUser.nombre);
  await action(other,'revertMovimiento',[otherMove.id]); await action(other,'revertBeneficio',[benefit.id]);
  const audit=await prisma.auditoria.findMany({where:{bateriaId:batteryId}}); assert.equal(audit.length,2); assert(audit.every(a=>a.registradoPor===secondaryUser.nombre && a.usuarioId===secondaryUser.id));
  check('Autores del servidor en pagos, beneficios, entregas y auditoría de reversiones');
  await prisma.membresia.create({data:{usuarioId:primaryUser.id,bateriaId:batteryId}});
  await page.goto(baseURL+'/ritmistas/carnaval');
  await page.getByLabel('Batería',{exact:true}).selectOption(batteryId);
  await page.getByText(`${r.nombre} ${r.apellido}`,{exact:true}).first().waitFor();
  assert(!(await page.locator('body').innerText()).includes('Martina'));
  check('Selector cambia a otra membresía y recarga datos aislados');
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click(); await page.waitForURL('**/login');
  await page.goto(baseURL+'/ritmistas/carnaval'); await page.waitForURL('**/login');
  check('Logout invalida sesión y bloquea acceso posterior');
  await writeFile('test-results/auth-report.json', JSON.stringify({passed:checks.length,checks},null,2));
} finally {
  await browser?.close();
  if(movement) await prisma.movimientoCuentaCorriente.deleteMany({where:{id:movement.id}});
  else await prisma.movimientoCuentaCorriente.deleteMany({where:{concepto}});
  await prisma.auditoria.deleteMany({where:{bateriaId:batteryId}});
  await prisma.bateria.deleteMany({where:{id:{in:[batteryId,`primary-${batteryId}`]}}});
  if(primaryUser) await prisma.usuario.deleteMany({where:{id:primaryUser.id}});
  if(secondaryUser) await prisma.usuario.deleteMany({where:{id:secondaryUser.id}});
  await prisma.$disconnect();
}
