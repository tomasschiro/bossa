import {chromium} from 'playwright';
import {PrismaClient} from '@prisma/client';
import assert from 'node:assert/strict';
const db=new PrismaClient(),id=`repuesto-custom-${Date.now()}`,base='http://localhost:3000';let browser;
try {
 const user=await db.usuario.findUniqueOrThrow({where:{email:'director@zumzum.com'}});
 await db.bateria.create({data:{id,nombre:'Prueba repuestos libres',membresias:{create:{usuarioId:user.id}}}});
 browser=await chromium.launch();const ctx=await browser.newContext();const login=await ctx.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password:process.env.SEED_DIRECTOR_PASSWORD??'ZumZum2026!'}});assert.equal(login.status(),200);await ctx.addCookies([{name:'bossa-bateria',value:id,url:base}]);const page=await ctx.newPage();
 await page.goto(base+'/inventario');await page.getByRole('tab',{name:'Repuestos',exact:true}).click();await page.getByRole('button',{name:'+ Agregar repuesto',exact:true}).click();
 assert.equal(await page.getByPlaceholder('Ej. Cuero de caixa 14"').count(),0);
 await page.getByRole('dialog').getByRole('combobox').first().click();await page.getByPlaceholder('Buscar o crear categoría...').fill('Tensores especiales');await page.getByRole('option',{name:'+ Crear "Tensores especiales"',exact:true}).click();await page.getByPlaceholder('Nombre y detalle del repuesto').fill('Tensor a medida');
 const saved=page.waitForResponse(r=>r.request().method()==='POST'&&Boolean(r.request().headers()['next-action']));await page.getByRole('button',{name:'Guardar repuesto',exact:true}).click();assert.equal((await saved).status(),200);
 const item=await db.repuesto.findFirstOrThrow({where:{bateriaId:id}});assert.equal(item.categoria,'Tensores especiales');assert.equal(item.descripcion,'Tensor a medida');
 await page.reload();await page.getByRole('tab',{name:'Repuestos',exact:true}).click();await page.getByText('Tensores especiales',{exact:true}).first().waitFor();
 await page.getByRole('button',{name:'+ Agregar repuesto',exact:true}).click();await page.getByRole('dialog').getByRole('combobox').first().click();await page.getByRole('option',{name:'Tensores especiales',exact:true}).waitFor();
 console.log('PASS categoría propia creada desde UI, repuesto persistido, categoría conservada tras recarga y disponible para reutilizar; ejemplo corregido.');
}finally{await browser?.close();await db.auditoria.deleteMany({where:{bateriaId:id}});await db.bateria.deleteMany({where:{id}});await db.$disconnect();}
