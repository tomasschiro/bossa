import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const prisma=new PrismaClient();
const base=process.env.TEST_BASE_URL??'http://localhost:3000';
const suffix=Date.now(); const battery=`agenda-test-${suffix}`; const foreignBattery=`agenda-foreign-${suffix}`;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let browser; const checks=[]; const pass=(name)=>{checks.push(name);console.log('PASS',name);};
async function action(context,name,args=[]) {
  const manifest=JSON.parse(await readFile('.next/dev/server/server-reference-manifest.json','utf8'));
  const found=Object.entries(manifest.node).find(([,v])=>v.exportedName===name); assert(found,`Action ${name}`);
  const response=await context.request.post(base+'/agenda',{headers:{'Next-Action':found[0],'Content-Type':'text/plain',Origin:base},data:JSON.stringify(args),maxRedirects:0});
  return {status:response.status(),body:await response.text(),headers:response.headers()};
}
try {
  const user=await prisma.usuario.findUniqueOrThrow({where:{email:'director@zumzum.com'}});
  await prisma.bateria.create({data:{id:battery,nombre:'Batería Agenda',membresias:{create:{usuarioId:user.id}}}});
  await prisma.bateria.create({data:{id:foreignBattery,nombre:'Batería Privada'}});
  const active=await prisma.edicion.create({data:{bateriaId:battery,anioCarnaval:2026,activa:true}});
  const old=await prisma.edicion.create({data:{bateriaId:battery,anioCarnaval:2025,activa:false}});
  const other=await prisma.edicion.create({data:{bateriaId:foreignBattery,anioCarnaval:2026,activa:true}});
  const privateEvent=await prisma.agendaEvento.create({data:{edicionId:other.id,tipo:'fechaClave',titulo:'Evento privado',fecha:new Date(today),recordarDiasAntes:7}});
  await prisma.agendaEvento.create({data:{edicionId:old.id,tipo:'ensayo',titulo:'Ensayo histórico',fecha:new Date(today)}});
  for(const [bateriaId,nombre] of [[battery,'Cumple de prueba'],[foreignBattery,'Cumple privado']]) await prisma.ritmista.create({data:{bateriaId,nombre,apellido:'Ritmista',fechaNacimiento:new Date(`2000-${today.slice(5)}T00:00:00Z`),dni:'123',telefono:'123',naipeReferencia:'Caixas',talleRemera:'M',calzado:'40'}});
  browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width:1440,height:1050}}); const page=await context.newPage();page.setDefaultTimeout(20000);
  await page.goto(base+'/agenda');await page.waitForURL('**/login');pass('Agenda exige login');
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password:process.env.SEED_DIRECTOR_PASSWORD??'ZumZum2026!'}})).status(),200);
  await context.addCookies([{name:'bossa-bateria',value:battery,url:base}]);
  await page.goto(base+'/agenda');
  const reminders=page.getByRole('region',{name:'Recordatorios'});
  await reminders.getByText('Cumple de prueba Ritmista',{exact:true}).waitFor();assert((await reminders.innerText()).includes('Hoy'));assert(!(await page.locator('body').innerText()).includes('Cumple privado'));pass('Cumpleaños automático de hoy, aislado por batería');
  await page.getByRole('button',{name:'Nuevo evento',exact:true}).click();
  await page.getByLabel('Título',{exact:true}).fill('Entrega de trajes'); await page.getByLabel('Tipo',{exact:true}).selectOption('fechaClave');
  await page.getByLabel('Fecha',{exact:true}).fill(today);await page.getByLabel('Hora (opcional)',{exact:true}).fill('20:30');await page.getByLabel('Lugar (opcional)',{exact:true}).fill('Galpón de ensayo');
  await page.getByRole('button',{name:'Guardar evento',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});await reminders.getByText('Entrega de trajes',{exact:true}).waitFor();
  const event=await prisma.agendaEvento.findFirstOrThrow({where:{edicionId:active.id,titulo:'Entrega de trajes'}});assert.equal(event.registradoPor,user.nombre);assert.equal(event.recordarDiasAntes,7);assert.equal(event.fecha.toISOString().slice(0,10),today);
  await page.reload();await reminders.getByText('Entrega de trajes',{exact:true}).waitFor();pass('Fecha clave persistida con autor real y aviso visible');
  const activities=page.getByRole('region',{name:'Actividades'});
  const row=activities.getByRole('listitem').filter({hasText:'Entrega de trajes'});
  await row.getByRole('button',{name:'Editar',exact:true}).click();await page.getByLabel('Título',{exact:true}).fill('Entrega de trajes actualizada');await page.getByRole('button',{name:'Guardar evento',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await reminders.getByText('Entrega de trajes actualizada',{exact:true}).waitFor();pass('Edición de evento actualiza calendario y recordatorio');
  await activities.getByRole('listitem').filter({hasText:'Entrega de trajes actualizada'}).getByRole('button',{name:'Cancelar evento',exact:true}).click();
  await activities.getByRole('button',{name:'Restaurar',exact:true}).waitFor();assert.equal(await reminders.getByText('Entrega de trajes actualizada',{exact:true}).count(),0);pass('Cancelar conserva evento y retira alerta');
  await activities.getByRole('button',{name:'Restaurar',exact:true}).click();await reminders.getByText('Entrega de trajes actualizada',{exact:true}).waitFor();
  await page.getByRole('button',{name:'lista',exact:true}).click();await page.getByLabel('Filtrar agenda',{exact:true}).selectOption('cumple');assert.equal(await activities.getByText('Entrega de trajes actualizada',{exact:true}).count(),0);await activities.getByText('Cumple de prueba Ritmista',{exact:true}).waitFor();pass('Restauración, vista listado y filtro cumpleaños');
  await page.getByLabel('Filtrar agenda',{exact:true}).selectOption('todos');await page.getByRole('button',{name:'calendario',exact:true}).click();
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/agenda-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/agenda-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));pass('Agenda responsive sin desbordamiento móvil');
  await page.setViewportSize({width:1440,height:1050});await page.goto(base+`/base-de-datos/historial/${old.id}/agenda`);await page.getByText('datos históricos, no editable',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Nuevo evento',exact:true}).count(),0);assert.equal(await activities.getByRole('button',{name:'Editar',exact:true}).count(),0);pass('Edición pasada en modo consulta vía Historial');
  const input={edicionId:active.id,titulo:'Intruso',tipo:'fechaClave',fecha:today,hora:'',lugar:'',descripcion:'',recordarDiasAntes:7};
  for(const [name,args] of [['guardarEvento',[{...input,id:privateEvent.id,edicionId:other.id}]],['guardarEvento',[{...input,edicionId:old.id}]],['cancelarEvento',[privateEvent.id]],['getAgenda',[other.id]]]) {const result=await action(context,name,args);assert(result.status>=400||/\n\w+:E\{/.test(result.body));}
  const result=await action(context,'getAgenda',[active.id]);assert(!result.body.includes('Evento privado'));assert(!result.body.includes('Cumple privado'));assert.equal((await prisma.agendaEvento.findUniqueOrThrow({where:{id:privateEvent.id}})).cancelado,false);pass('Servidor rechaza IDs ajenos y escrituras en edición inactiva');
  const invalid=await action(context,'guardarEvento',[{...input,fecha:'2026-02-30'}]);assert(invalid.body.includes('Revisá'));assert.equal(await prisma.agendaEvento.count({where:{edicionId:active.id}}),1);pass('Fecha imposible rechazada en servidor');
  const audit=await prisma.auditoria.findMany({where:{bateriaId:battery}});assert.equal(audit.length,4);assert(audit.every(a=>a.usuarioId===user.id&&a.registradoPor===user.nombre));pass('Auditoría de alta, edición, cancelación y restauración');
  await writeFile('test-results/agenda-report.json',JSON.stringify({passed:checks.length,checks},null,2));
} finally {await browser?.close();await prisma.auditoria.deleteMany({where:{bateriaId:{in:[battery,foreignBattery]}}});await prisma.bateria.deleteMany({where:{id:{in:[battery,foreignBattery]}}});await prisma.$disconnect();}
