import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const prisma = new PrismaClient();
const base = process.env.TEST_BASE_URL ?? 'http://localhost:3000';
const id = `naipes-test-${Date.now()}`;
let browser;
const checks=[];
function pass(message) { checks.push(message); console.log('PASS',message); }
try {
  const user=await prisma.usuario.findUniqueOrThrow({where:{email:'director@zumzum.com'}});
  const foreign=await prisma.naipe.findFirstOrThrow();
  await prisma.bateria.create({data:{id,nombre:'Batería de prueba',membresias:{create:{usuarioId:user.id}},ediciones:{create:{anioCarnaval:2026,activa:true}}}});
  browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password:process.env.SEED_DIRECTOR_PASSWORD??'ZumZum2026!'}})).status(),200);
  await context.addCookies([{name:'bossa-bateria',value:id,url:base}]);
  const page=await context.newPage(); page.setDefaultTimeout(15000);
  await page.goto(base+'/naipes'); await page.getByText('Administrar catálogo de naipes',{exact:true}).click(); await page.getByText('Todavía no hay naipes',{exact:true}).waitFor(); pass('Catálogo vacío aislado por batería');
  async function save(name) { await page.getByLabel('Nombre',{exact:true}).fill(name); await page.getByRole('button',{name:'Guardar',exact:true}).click(); }
  await page.getByRole('button',{name:'Agregar naipe',exact:true}).click(); await save('Agogôs'); await page.getByRole('heading',{name:'Agogôs',exact:true}).waitFor();
  await page.getByRole('button',{name:'Agregar naipe',exact:true}).click(); await save('agogôs'); await page.getByRole('alert').waitFor(); assert((await page.getByRole('alert').innerText()).includes('Ya existe')); await page.getByRole('button',{name:'Cancelar',exact:true}).click(); pass('Alta y rechazo de duplicado sin distinguir mayúsculas');
  const r=await prisma.ritmista.create({data:{bateriaId:id,nombre:'Prueba',apellido:'Naipe',dni:'123',telefono:'123',fechaNacimiento:new Date('2000-01-01'),naipeReferencia:'Agogôs',talleRemera:'M',calzado:'40',historial:{create:{naipe:'Agogôs',periodo:'2025',desde:2025}}}});
  await page.getByRole('button',{name:'Editar Agogôs',exact:true}).click(); await save('Agogôs dobles'); await page.getByRole('heading',{name:'Agogôs dobles',exact:true}).waitFor();
  const saved=await prisma.ritmista.findUniqueOrThrow({where:{id:r.id},include:{historial:true}}); assert.equal(saved.naipeReferencia,'Agogôs dobles'); assert.equal(saved.historial[0].naipe,'Agogôs'); pass('Renombrar actualiza padrón y conserva historial');
  await page.getByRole('button',{name:'Agregar naipe',exact:true}).click(); await save('Tamboriles'); await page.getByRole('heading',{name:'Tamboriles',exact:true}).waitFor();
  await page.getByRole('button',{name:'Subir Tamboriles',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('main li h2')?.textContent==='Tamboriles');
  await page.reload(); await page.getByText('Administrar catálogo de naipes',{exact:true}).click(); assert.equal(await page.locator('main li h2').first().innerText(),'Tamboriles'); pass('Orden persistido después de recargar');
  const manifest=JSON.parse(await readFile('.next/dev/server/server-reference-manifest.json','utf8'));
  for(const [name,input] of [['guardarNaipe',{id:foreign.id,nombre:'Intrusión'}],['moverNaipe',{id:foreign.id,direccion:'arriba'}]]) {
    const [actionId]=Object.entries(manifest.node).find(([,v])=>v.exportedName===name);
    const response=await context.request.post(base+'/naipes',{headers:{'Next-Action':actionId,'Content-Type':'text/plain',Origin:base},data:JSON.stringify([input])}); const body=await response.text(); assert(response.status()>=400 || /\n\w+:E\{/.test(body));
  }
  assert.equal((await prisma.naipe.findUniqueOrThrow({where:{id:foreign.id}})).nombre,foreign.nombre); pass('Edición y orden por ID ajeno rechazados');
  const audit=await prisma.auditoria.findMany({where:{bateriaId:id}}); assert.equal(audit.length,4); assert(audit.every(a=>a.usuarioId===user.id&&a.registradoPor===user.nombre)); pass('Auditoría de altas, cambios y orden con autor real');
  await mkdir('test-results',{recursive:true}); await page.screenshot({path:'test-results/naipes-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844}); await page.screenshot({path:'test-results/naipes-mobile.png',fullPage:true}); assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)); pass('Naipes sin desbordamiento en móvil');
  await page.setViewportSize({width:1280,height:900}); await page.goto(base+'/ritmistas/base-de-datos');
  await page.getByRole('button',{name:'+ Nuevo ritmista',exact:true}).click();
  await page.getByRole('dialog').getByRole('combobox').first().click(); await page.getByRole('option',{name:'Agogôs dobles',exact:true}).waitFor(); assert.equal(await page.getByRole('option',{name:'Caixas',exact:true}).count(),0); pass('Formulario de ritmistas usa catálogo propio');
  await writeFile('test-results/naipes-report.json',JSON.stringify({passed:checks.length,checks},null,2));
} finally {
  await browser?.close();
  await prisma.auditoria.deleteMany({where:{bateriaId:id}});
  await prisma.bateria.deleteMany({where:{id}});
  await prisma.$disconnect();
}
