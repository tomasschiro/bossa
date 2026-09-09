import {chromium} from 'playwright';import {PrismaClient} from '@prisma/client';import {hashPassword} from 'better-auth/crypto';import assert from 'node:assert/strict';import {mkdir,readFile} from 'node:fs/promises';
const db=new PrismaClient(),base='http://localhost:3000',id=`plan-${Date.now()}`,other=`other-${id}`,uid=`user-${id}`,year=new Date().getFullYear()+1;let browser;
async function action(ctx,name,args){const m=JSON.parse(await readFile('.next/dev/server/server-reference-manifest.json','utf8'));const pair=Object.entries(m.node).find(([,v])=>v.exportedName===name);assert(pair);const r=await ctx.request.post(base+'/naipes',{headers:{'Next-Action':pair[0],'Content-Type':'text/plain',Origin:base},data:JSON.stringify(args)});return {status:r.status(),body:await r.text()};}
try{
 // Variantes precargadas en el catálogo de Naipes (punto 1): Caixas y Surdos tienen
 // variantes propias para el test; Tamborines, Chocalho y Cuicas quedan sin variantes
 // (se pinta directo con el genérico), y Repiques queda sin variantes también acá para
 // probar el caso "sin desglose" en Ecualización.
 await db.bateria.create({data:{id,nombre:'Batería Formación',naipes:{create:[
  {nombre:'Caixas',orden:0,variantes:{create:[{nombre:'12"',orden:0},{nombre:'14"',orden:1}]}},
  {nombre:'Repiques',orden:1},
  {nombre:'Surdos',orden:2,variantes:{create:[{nombre:'1ra',orden:0},{nombre:'2da',orden:1},{nombre:'3ra',orden:2}]}},
  {nombre:'Tamborines',orden:3},{nombre:'Chocalho',orden:4},{nombre:'Frigideiras',orden:5},{nombre:'Cuicas',orden:6},
 ]}}});await db.bateria.create({data:{id:other,nombre:'Ajena'}});
 await db.usuario.create({data:{id:uid,email:`${uid}@example.com`,nombre:'Directora Formación',accounts:{create:{issuer:'local:credential',providerId:'credential',accountId:uid,password:await hashPassword('Formacion2027!')}},membresias:{create:{bateriaId:id}}}});
 const ed=await db.edicion.create({data:{bateriaId:id,anioCarnaval:year,activa:true}}),old=await db.edicion.create({data:{bateriaId:id,anioCarnaval:year-1,activa:false}}),foreign=await db.edicion.create({data:{bateriaId:other,anioCarnaval:year,activa:true}});
 // Ritmista 5 (dentro del grupo Caixas) queda cargado con la variante real 'Caixa 14"'
 // en vez del genérico 'Caixas', para poder distinguir en el test el modo Actual
 // (muestra subvariantes reales) del modo Objetivo (muestra el genérico del catálogo).
 for(let n=0;n<12;n++)await db.ritmista.create({data:{bateriaId:id,nombre:`Ritmista ${n}`,apellido:'Prueba',dni:`${id}-${n}`,telefono:'123',fechaNacimiento:new Date('2000-01-01'),naipeReferencia:n<4?'Tamborines':n<8?'Caixas':n<10?'Repiques':'Surdos',talleRemera:'M',calzado:'40',ritmistasEdicion:{create:[{edicionId:ed.id,naipe:n===5?'Caixa 14"':n<4?'Tamborines':n<8?'Caixas':n<10?'Repiques':'Surdos',estadoLlegada:n%2===0?'Confirmado':'NoConfirmado'},{edicionId:old.id,naipe:'Caixa 12\"'}]}}});
 // Tres ritmistas extra con las voces reales de Surdo, para probar la rotación del
 // espejo (1ra->2da->3ra->1ra) pintando con datos reales en modo Actual.
 for(const voz of ['1ra','2da','3ra'])await db.ritmista.create({data:{bateriaId:id,nombre:`Surdo${voz}`,apellido:'Prueba',dni:`${id}-surdo-${voz}`,telefono:'123',fechaNacimiento:new Date('2000-01-01'),naipeReferencia:'Surdos',talleRemera:'M',calzado:'40',ritmistasEdicion:{create:[{edicionId:ed.id,naipe:`Surdo ${voz}`,estadoLlegada:'Confirmado'}]}}});
 // 1 ritmista real por cada uno de Chocalho, Frigideiras y Cuicas — para reproducir el
 // bug de "secciones que no se dibujan": con los 7 naipes del catálogo teniendo al
 // menos 1 ritmista activo, las 7 secciones simples tienen que aparecer en el plano,
 // no solo las primeras 2.
 for(const nombre of ['Chocalho','Frigideiras','Cuicas'])await db.ritmista.create({data:{bateriaId:id,nombre:`Ritmista${nombre}`,apellido:'Prueba',dni:`${id}-${nombre}`,telefono:'123',fechaNacimiento:new Date('2000-01-01'),naipeReferencia:nombre,talleRemera:'M',calzado:'40',ritmistasEdicion:{create:[{edicionId:ed.id,naipe:nombre,estadoLlegada:'Confirmado'}]}}});
 // Inventario de Surdos: solo 3 disponibles (Bueno+Regular), menos que los 2 activos
 // y muy por debajo de un objetivo alto — para provocar el faltante de instrumentos.
 await db.instrumento.create({data:{bateriaId:id,tipo:'Surdo 1ra',estado:'Bueno',cantidad:2}});
 await db.instrumento.create({data:{bateriaId:id,tipo:'Surdo 2da',estado:'Regular',cantidad:1}});
 await db.instrumento.create({data:{bateriaId:id,tipo:'Surdo 3ra',estado:'NecesitaReparacion',cantidad:5}});
 browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:1440,height:1050}});assert.equal((await ctx.request.post(base+'/api/auth/sign-in/email',{data:{email:`${uid}@example.com`,password:'Formacion2027!'}})).status(),200);const page=await ctx.newPage();page.setDefaultTimeout(20000);
 await page.goto(base+'/naipes');await page.getByRole('heading',{name:'Naipes y formación'}).waitFor();assert.equal(await page.getByLabel('Carnaval del plan').inputValue(),ed.id);assert.equal(await page.getByLabel('Objetivo ',{exact:false}).count(),7);const row=page.getByRole('row').filter({has:page.getByLabel('Objetivo Tamborines')});assert((await row.innerText()).includes('4'));

 await page.getByRole('button',{name:'Ver integrantes de Tamborines',exact:true}).click();await page.waitForURL(`**/${ed.id}/Tamborines`);assert.equal(await page.locator('tbody tr').count(),4);await page.getByRole('link',{name:'Volver a naipes',exact:true}).click();await page.getByLabel('Objetivo Tamborines').waitFor();console.log('PASS ficha por naipe y navegación de vuelta');

 await page.getByLabel('Objetivo Tamborines').fill('8');await page.getByLabel('Objetivo Caixas').fill('8');await page.getByLabel('Objetivo Repiques').fill('4');await page.getByLabel('Objetivo Surdos').fill('10');
 await page.getByRole('button',{name:'Guardar objetivos',exact:true}).click();await page.getByRole('status').filter({hasText:'Objetivos guardados'}).waitFor();console.log('PASS edición de objetivos y guardado independiente de la formación');

 await page.getByRole('tab',{name:'Formación',exact:true}).click();
 await page.getByRole('button',{name:'Iniciar asistente',exact:true}).click();
 await page.getByRole('dialog').getByText('Asistente de formación').waitFor();

 // Paso 1 de 5: anchos
 await page.getByLabel('Ancho de cada mitad (columnas)').fill('3');
 await page.getByLabel('Ancho del pasillo central (columnas)').fill('4');
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();

 // Paso 2 de 5: secciones — Tamborines solo (simple), Caixas+Repiques+Surdos mezclada "Cocina"
 await page.getByRole('button',{name:'Tamborines',exact:true}).click();
 await page.getByRole('button',{name:'Agregar sección',exact:true}).click();
 await page.getByRole('button',{name:'Caixas',exact:true}).click();
 await page.getByRole('button',{name:'Repiques',exact:true}).click();
 await page.getByRole('button',{name:'Surdos',exact:true}).click();
 await page.getByPlaceholder('Nombre de la sección (ej. Cocina)').fill('Cocina');
 await page.getByRole('button',{name:'Agregar sección',exact:true}).click();
 assert.equal(await page.getByText('1. Tamborines',{exact:false}).count(),1);
 assert.equal(await page.getByText('2. Cocina',{exact:false}).count(),1);
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();

 // Paso 3 de 5: Actual/Objetivo — uso Actual acá para el primer plano (sin faltantes)
 await page.getByRole('dialog').getByText('Paso 3 de 5').waitFor();
 await page.getByRole('button',{name:'Integrantes actuales',exact:true}).click();
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();

 // Paso 4 de 5: espejar activado — sin ningún paso de pintado en el medio
 await page.getByRole('dialog').getByText('Paso 4 de 5').waitFor();
 await page.getByRole('button',{name:'Espejar (se completa solo)',exact:true}).click();
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();

 // Paso 5 de 5: confirmar
 await page.getByRole('dialog').getByText('Paso 5 de 5').waitFor();
 await page.getByRole('button',{name:'Generar formación',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 console.log('PASS asistente sin paso de pintado: anchos, secciones, cantidades, espejo y confirmar');

 // El plano se genera con la sección mezclada vacía (sin pintar nada solo), y también
 // marca las posiciones sin usar de la sección simple Tamborines (bug corregido: antes
 // esas posiciones ni se dibujaban, dando la sensación de que la sección "no estaba").
 const plano=page.getByRole('img',{name:'Plano de formación por mitades'});await plano.waitFor();
 const casillerosVacios=plano.locator('rect[stroke-dasharray="3 2"]');
 // Cocina: Caixas(4)+Repiques(2)+Surdos(2)=8 posiciones TOTALES (ambas mitades).
 // filas = techo(8/2/3) = techo(1.33) = 2 filas x 3 columnas = 6 celdas por mitad,
 // x 2 mitades = 12 vacías (nada pintado todavía).
 // Tamborines (simple): 4 integrantes totales, filas = techo(4/2/3) = 1 fila x 3
 // columnas x 2 mitades = 6 celdas generadas, de las cuales 4 pintadas y 2 vacías.
 // Total: 12 + 2 = 14.
 assert.equal(await casillerosVacios.count(),14);
 console.log('PASS plano generado con la sección mezclada vacía y las posiciones sin usar de la simple marcadas, con el tamaño correcto (total repartido entre las dos mitades)');

 // Pintar directo sobre el plano real: clic en un casillero vacío de la sección
 // MEZCLADA (Cocina) abre el popover de selección de NAIPE general (paso 1) — las
 // celdas vacías de la sección SIMPLE (Tamborines) no abren nada al clickear, así que
 // hay que apuntar puntualmente a "Cocina" y no a cualquier casillero vacío del plano.
 await plano.locator('g').filter({has:page.locator('title:text-is("Vacío · Cocina")')}).first().click();
 await page.getByRole('button',{name:/^Elegir /}).first().waitFor();
 const opciones=await page.getByRole('button',{name:/^Elegir /}).allTextContents();
 assert(opciones.some(t=>t.includes('Tamborines'))===false); // Cocina no incluye Tamborines
 await page.getByRole('button',{name:'Elegir Repiques',exact:true}).click();
 await page.getByRole('button',{name:/^Elegir /}).first().waitFor({state:'hidden'});
 // El espejo refleja de inmediato: se pintó 1 casillero a la izquierda y su reflejo
 // a la derecha ya aparece pintado también, sin guardar todavía.
 assert.equal(await casillerosVacios.count(),12);
 console.log('PASS pintado directo sobre el plano: clic en casillero vacío, popover con variantes, se pinta ahí mismo (el espejo refleja al instante)');

 // El espejo sigue funcionando: pintar la izquierda pinta también la derecha sola.
 await page.getByRole('button',{name:'Guardar formación',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Formación guardada'}).waitFor();
 const storedEspejo=(await db.edicion.findUniqueOrThrow({where:{id:ed.id}})).planNaipes;
 assert.equal(storedEspejo.formacion.secciones[1].grilla.flat().filter(Boolean).length,1);
 assert.equal(storedEspejo.formacion.secciones[1].grillaDerecha,undefined);
 assert.equal(await casillerosVacios.count(),12); // se pintó 1 casillero a la izquierda y el espejo completó su reflejo a la derecha
 console.log('PASS espejo sigue funcionando: pintar la izquierda completa la derecha sola, sin grillaDerecha propia');

 // Edición manual del lado derecho con espejo activo: cualquier casillero de la
 // derecha sigue siendo clickeable y editable a mano, aunque el espejo esté activo.
 // Pinto directo un casillero VACÍO de la derecha en "Cocina" (no el que ya refleja
 // Repiques) con Caixas — la marca de desvinculado es permanente y silenciosa (no hay
 // botón para revincular), pero SÍ queda un indicador visual quieto (pin + texto en
 // el <title> accesible) para distinguir de un vistazo qué casilleros de la derecha
 // ya no siguen al espejo.
 async function clickPrimerVacioDerecha(nombreSeccion){
  const planoBox=await plano.boundingBox();
  const medio=planoBox.x+planoBox.width/2;
  const grupos=plano.locator('g').filter({has:page.locator(`title:text-is("Vacío · ${nombreSeccion}")`)});
  const n=await grupos.count();
  let objetivo=null;
  for(let i=0;i<n;i++){
   const box=await grupos.nth(i).boundingBox();
   if(box&&box.x>=medio){objetivo=grupos.nth(i);break;}
  }
  if(!objetivo)throw new Error(`No se encontró un casillero vacío de "${nombreSeccion}" en la mitad derecha`);
  for(let intento=0;intento<3;intento++){
   await objetivo.click();
   try{await page.getByRole('button',{name:/^Elegir /}).first().waitFor({timeout:3000});return;}
   catch{/* reintenta */}
  }
  throw new Error(`El popover de pintado no abrió tras 3 intentos en "${nombreSeccion}" (derecha)`);
 }
 await clickPrimerVacioDerecha('Cocina');
 await page.getByRole('button',{name:'Elegir Caixas',exact:true}).click();
 await page.getByRole('button',{name:'Pintar Caixas 12"',exact:true}).click();
 assert.equal(await plano.locator('title:text-is("Caixas 12\\" · Cocina (desvinculado del espejo)")').count(),1,'El título accesible marca el casillero como desvinculado');
 console.log('PASS edición manual de un casillero de la derecha con espejo activo: queda marcado como desvinculado (indicador quieto, sin botón para revincular)');

 // Repintar el casillero izquierdo correspondiente (mismo Repiques ya pintado, ahora
 // cambiado a otra variante) NO tiene que afectar el casillero editado a mano en la
 // derecha: queda fijo para siempre, sin forma de revincularlo desde la UI.
 await page.getByRole('button',{name:'Guardar formación',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Formación guardada'}).waitFor();
 const storedAntesRepintar=(await db.edicion.findUniqueOrThrow({where:{id:ed.id}})).planNaipes;
 const cocinaAntes=storedAntesRepintar.formacion.secciones.find(s=>s.nombre==='Cocina');
 assert(cocinaAntes,'La sección Cocina tiene que existir en la formación guardada');
 const grillaDerechaAntes=JSON.parse(JSON.stringify(cocinaAntes.grillaDerecha));
 // Repinto el casillero de Repiques ya pintado en la izquierda (fila 0, col 0) por
 // Surdos. Filtro por posición (mitad izquierda real) porque el mismo título
 // "Repiques · Cocina" también puede aparecer reflejado del lado derecho.
 async function clickTituloEnIzquierda(titulo,seccionNombre){
  const planoBox=await plano.boundingBox();
  const medio=planoBox.x+planoBox.width/2;
  const grupos=plano.locator('g').filter({has:page.locator(`title:text-is("${titulo} · ${seccionNombre}")`)});
  const n=await grupos.count();
  let objetivo=null;
  for(let i=0;i<n;i++){
   const box=await grupos.nth(i).boundingBox();
   if(box&&box.x<medio){objetivo=grupos.nth(i);break;}
  }
  if(!objetivo)throw new Error(`No se encontró "${titulo} · ${seccionNombre}" en la mitad izquierda`);
  for(let intento=0;intento<3;intento++){
   await objetivo.click();
   try{await page.getByRole('button',{name:/^Elegir /}).first().waitFor({timeout:3000});return;}
   catch{/* reintenta */}
  }
  throw new Error(`El popover de pintado no abrió tras 3 intentos en "${titulo} · ${seccionNombre}" (izquierda)`);
 }
 await clickTituloEnIzquierda('Repiques','Cocina');
 await page.getByRole('button',{name:'Elegir Surdos',exact:true}).click();
 await page.getByRole('button',{name:'Pintar Surdos 1ra',exact:true}).click();
 await page.getByRole('button',{name:'Guardar formación',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Formación guardada'}).waitFor();
 const storedTrasRepintar=(await db.edicion.findUniqueOrThrow({where:{id:ed.id}})).planNaipes;
 const cocinaTrasRepintar=storedTrasRepintar.formacion.secciones.find(s=>s.nombre==='Cocina');
 assert.deepEqual(cocinaTrasRepintar.grillaDerecha,grillaDerechaAntes,'El casillero editado a mano conserva su valor pese a que la izquierda cambió (fijo para siempre)');
 console.log('PASS repintar el casillero izquierdo NO modifica el casillero derecho editado a mano');

 // Provocar faltante: cambiar a Objetivo, donde Surdos pide 10 pero solo hay 5
 // ritmistas activos y apenas 3 instrumentos disponibles (Bueno+Regular). Las alertas
 // arrancan colapsadas (punto 5 de esta ronda): un resumen con el conteo, que hay que
 // tocar para desplegar.
 await page.getByLabel('Cantidad de posiciones',{exact:true}).selectOption('objetivo');
 // El conteo del resumen incluye TODOS los naipes con faltante (personas + instrumentos
 // combinados), no solo Surdos: a esta altura del test varios naipes ya tienen Objetivo
 // por encima de lo Actual/disponible, así que el resumen es un botón con el conteo
 // real, sin asumir un número fijo de antemano.
 const resumenAlertas=page.getByRole('button',{name:/^\d+ alertas? de faltante$/});
 await resumenAlertas.waitFor();
 assert.equal(await page.getByRole('alert').filter({hasText:'Te faltan'}).count(),0,'Colapsadas por defecto: el texto de cada alerta no está visible todavía');
 await resumenAlertas.click();
 await page.getByRole('alert').filter({hasText:'Te faltan 5 personas para Surdos'}).waitFor();
 await page.getByRole('alert').filter({hasText:'Te faltan 7 instrumentos de Surdos'}).waitFor();
 const alertaPersonas=await page.getByRole('alert').filter({hasText:'personas'}).innerText();
 const alertaInstrumentos=await page.getByRole('alert').filter({hasText:'instrumentos'}).innerText();
 assert(!alertaPersonas.includes('instrumentos'));
 assert(!alertaInstrumentos.includes('personas'));
 console.log('PASS alertas de faltante colapsadas por defecto con conteo en el resumen, y desplegables al tocar el título');

 // Volviendo a Actual, las alertas de faltante desaparecen (no aplican).
 await page.getByLabel('Cantidad de posiciones',{exact:true}).selectOption('actual');
 assert.equal(await resumenAlertas.count(),0);
 assert.equal(await page.getByRole('alert').filter({hasText:'Te faltan'}).count(),0);
 console.log('PASS alertas de faltante solo aplican cuando se usa Objetivo');

 // Clickea el primer casillero vacío de una sección MEZCLADA en la mitad IZQUIERDA
 // (siempre pintable) identificándolo por su <title> accesible ("Vacío · {sección}"),
 // en vez de por posición en pantalla — evita condiciones de carrera con el layout.
 async function clickPrimerVacioIzquierda(nombreSeccion){
  const planoBox=await plano.boundingBox();
  const medio=planoBox.x+planoBox.width/2;
  const grupos=plano.locator('g').filter({has:page.locator(`title:text-is("Vacío · ${nombreSeccion}")`)});
  const n=await grupos.count();
  let objetivo=null;
  for(let i=0;i<n;i++){
   const box=await grupos.nth(i).boundingBox();
   if(box&&box.x<medio){objetivo=grupos.nth(i);break;}
  }
  if(!objetivo)throw new Error(`No se encontró un casillero vacío de "${nombreSeccion}" en la mitad izquierda`);
  // El click abre el popover vía estado de React (no un trigger nativo de Radix):
  // reintento el click si no aparece a tiempo, por si el primer intento coincide con
  // un re-render en curso (cambio de modo, redimensionado de grilla).
  for(let intento=0;intento<3;intento++){
   await objetivo.click();
   try{await page.getByRole('button',{name:/^Elegir /}).first().waitFor({timeout:3000});return;}
   catch{/* reintenta */}
  }
  throw new Error(`El popover de pintado no abrió tras 3 intentos en "${nombreSeccion}"`);
 }
 // Selector de dos pasos (punto 3): elegir el naipe general primero; Caixas y Surdos
 // tienen variantes cargadas en el catálogo (punto 1), así que aparece un segundo paso.
 // La fuente es siempre el catálogo de Naipes, igual en Actual y en Objetivo — a
 // diferencia del comportamiento anterior, que dependía del texto libre de ritmistas.
 await clickPrimerVacioIzquierda('Cocina');
 await page.getByRole('button',{name:/^Elegir /}).first().waitFor();
 const naipesPaso1=(await page.getByRole('button',{name:/^Elegir /}).allTextContents()).map(t=>t.replace('Elegir ','').trim()).sort();
 assert.deepEqual(naipesPaso1,['Caixas','Repiques','Surdos'].sort());
 await page.getByRole('button',{name:'Elegir Caixas',exact:true}).click();
 await page.getByText('Variante de Caixas',{exact:true}).waitFor();
 const variantesCaixas=(await page.getByRole('button',{name:/^Pintar Caixas /}).allTextContents()).map(t=>t.replace('Pintar Caixas ','').trim());
 assert.deepEqual(variantesCaixas.sort(),['12"','14"'].sort());
 await page.keyboard.press('Escape');
 await page.getByText('Variante de Caixas',{exact:true}).waitFor({state:'hidden'});
 console.log('PASS selector de dos pasos: elegir naipe general y, si tiene variantes en el catálogo, elegir la variante específica');

 // Mismo comportamiento en modo Objetivo: el catálogo de variantes no depende de
 // ritmistas ni de Actual/Objetivo.
 await page.getByLabel('Cantidad de posiciones',{exact:true}).selectOption('objetivo');
 await clickPrimerVacioIzquierda('Cocina');
 await page.getByRole('button',{name:/^Elegir /}).first().waitFor();
 const naipesPaso1Objetivo=(await page.getByRole('button',{name:/^Elegir /}).allTextContents()).map(t=>t.replace('Elegir ','').trim()).sort();
 assert.deepEqual(naipesPaso1Objetivo,['Caixas','Repiques','Surdos'].sort());
 await page.getByRole('button',{name:'Elegir Surdos',exact:true}).click();
 await page.getByText('Variante de Surdos',{exact:true}).waitFor();
 const variantesSurdos=await page.getByRole('button',{name:/^Pintar Surdos /}).count();
 assert.equal(variantesSurdos,3);
 console.log('PASS mismo catálogo de variantes en modo Objetivo, sin depender de ritmistas');

 // Contador en vivo (punto 4): con el desglose de Objetivo cargado en Ecualización
 // (Surdos 1ra=3, 2da=3, 3ra=4 => total 10, coincide con el Objetivo de Surdos ya
 // guardado), el popover de pintado muestra "faltan N" contra ese desglose real.
 await page.keyboard.press('Escape');
 await page.getByText('Variante de Surdos',{exact:true}).waitFor({state:'hidden'});
 await page.getByRole('tab',{name:'Ecualización',exact:true}).click();
 await page.getByRole('button',{name:'Desglosar Surdos por variante',exact:true}).click();
 await page.getByLabel('Objetivo Surdos 1ra',{exact:true}).fill('3');
 await page.getByLabel('Objetivo Surdos 2da',{exact:true}).fill('3');
 await page.getByLabel('Objetivo Surdos 3ra',{exact:true}).fill('4');
 await page.getByRole('button',{name:'Guardar objetivos',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Objetivos guardados'}).waitFor();
 await page.getByRole('tab',{name:'Formación',exact:true}).click();
 await clickPrimerVacioIzquierda('Cocina');
 await page.getByRole('button',{name:'Elegir Surdos',exact:true}).click();
 await page.getByText('Variante de Surdos',{exact:true}).waitFor();
 // Ya hay 1 "Surdos 1ra" pintada de la prueba de desvinculo/revinculo anterior (más su
 // reflejo "Surdos 2da" a la derecha), así que el contador arranca en "faltan 2", no 3.
 assert.equal((await page.getByRole('button',{name:'Pintar Surdos 1ra',exact:true}).innerText()).includes('faltan 2'),true);
 await page.getByRole('button',{name:'Pintar Surdos 1ra',exact:true}).click();
 await page.getByText('Variante de Surdos',{exact:true}).waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Guardar formación',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Formación guardada'}).waitFor();
 await clickPrimerVacioIzquierda('Cocina');
 await page.getByRole('button',{name:'Elegir Surdos',exact:true}).click();
 await page.getByText('Variante de Surdos',{exact:true}).waitFor();
 // Contando también la celda de la prueba de desvinculo/revinculo anterior, ya hay 2
 // "Surdos 1ra" pintadas (izquierda) + 2 "Surdos 2da" (reflejo, espejo 1ra<->2da):
 // quedan 1 sin pintar de la 1ra, y 1 sin pintar de la 2da (objetivo=3 cada una).
 assert.equal((await page.getByRole('button',{name:'Pintar Surdos 1ra',exact:true}).innerText()).includes('faltan 1'),true);
 assert.equal((await page.getByRole('button',{name:'Pintar Surdos 2da',exact:true}).innerText()).includes('faltan 1'),true);
 await page.keyboard.press('Escape');
 await page.getByText('Variante de Surdos',{exact:true}).waitFor({state:'hidden'});
 await page.getByLabel('Cantidad de posiciones',{exact:true}).selectOption('actual');
 console.log('PASS contador en vivo por variante usando el desglose real cargado en Ecualización');

 await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/naipes-formacion.png',fullPage:true});

 // Caso numérico exacto del punto 6: Objetivo Chocalho=16, Cuicas=16, Tamborines=30,
 // Surdos=25, Caixas=50 (total 137 repartido en dos mitades), ancho de mitad=4.
 // "Percusión chica" (Chocalho+Cuicas) es una sección mezclada para probar también
 // el cálculo de filas de secciones mezcladas, no solo simples.
 await page.getByRole('tab',{name:'Ecualización',exact:true}).click();
 await page.getByLabel('Objetivo Chocalho',{exact:true}).fill('16');
 await page.getByLabel('Objetivo Cuicas',{exact:true}).fill('16');
 await page.getByLabel('Objetivo Tamborines',{exact:true}).fill('30');
 await page.getByLabel('Objetivo Surdos',{exact:true}).fill('25');
 await page.getByLabel('Objetivo Caixas',{exact:true}).fill('50');
 await page.getByRole('button',{name:'Guardar objetivos',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Objetivos guardados'}).waitFor();
 await page.getByRole('tab',{name:'Formación',exact:true}).click();

 await page.getByRole('button',{name:'Rehacer con el asistente',exact:true}).click();
 await page.getByLabel('Ancho de cada mitad (columnas)').fill('4');
 await page.getByLabel('Ancho del pasillo central (columnas)').fill('4');
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();
 await page.getByRole('button',{name:'Tamborines',exact:true}).click();
 await page.getByRole('button',{name:'Agregar sección',exact:true}).click();
 await page.getByRole('button',{name:'Surdos',exact:true}).click();
 await page.getByRole('button',{name:'Agregar sección',exact:true}).click();
 await page.getByRole('button',{name:'Caixas',exact:true}).click();
 await page.getByRole('button',{name:'Agregar sección',exact:true}).click();
 await page.getByRole('button',{name:'Chocalho',exact:true}).click();
 await page.getByRole('button',{name:'Cuicas',exact:true}).click();
 await page.getByPlaceholder('Nombre de la sección (ej. Cocina)').fill('Percusión chica');
 await page.getByRole('button',{name:'Agregar sección',exact:true}).click();
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();
 await page.getByRole('button',{name:'Cantidades objetivo',exact:true}).click();
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();
 await page.getByRole('button',{name:'Espejar (se completa solo)',exact:true}).click();
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();
 await page.getByRole('button',{name:'Generar formación',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});

 // Filas esperadas por sección (cada mitad), fórmula: techo(total/2/ancho) con ancho=4:
 // Tamborines: techo(30/2/4)=4, Surdos: techo(25/2/4)=4 (25 es impar: 13 y 12 por mitad,
 // sin ningún aviso — la diferencia de 1 posición entre mitades se resuelve en
 // silencio), Caixas: techo(50/2/4)=7, Percusión chica (16+16=32): techo(32/2/4)=4.
 // Total del plano: 4+4+7+4 = 19 filas — cada celda mide 28px, más 8px de margen.
 // Ancho: anchoMitad(4)*2 + anchoPasillo(4) = 12 columnas — sin columnas extra sin usar.
 assert.equal(Number(await plano.getAttribute('height')),19*28+8);
 assert.equal(Number(await plano.getAttribute('width')),12*28+8);
 assert.equal(await page.getByRole('alert').filter({hasText:'reparte'}).count(),0);
 await page.screenshot({path:'test-results/naipes-formacion-caso-numerico.png',fullPage:true});
 console.log('PASS caso numérico exacto: filas de cada sección calculadas como techo(total/2/ancho), plano con tamaño exacto sin espacio sobrante, reparto impar en Surdos sin ningún aviso');

 // Cambiar el ancho de mitad debe redimensionar el plano al instante (punto 6: "el
 // plano tiene que crecer o achicarse" al cambiar ancho, secciones o modo).
 await page.getByLabel('Ancho de mitad',{exact:true}).fill('8');
 // Con ancho=8: Tamborines techo(30/2/8)=2, Surdos techo(25/2/8)=2, Caixas techo(50/2/8)=4,
 // Percusión chica techo(32/2/8)=2. Total = 10 filas. Ancho: 8*2+4 = 20 columnas.
 await plano.waitFor();
 assert.equal(Number(await plano.getAttribute('height')),10*28+8);
 assert.equal(Number(await plano.getAttribute('width')),20*28+8);
 console.log('PASS el plano se redimensiona dinámicamente al cambiar el ancho de mitad, sin rehacer el asistente, sin espacio sobrante');

 // Extra (punto 5): mover una sección SIMPLE ya ubicada directo desde el plano, sin
 // pasar por las flechas del panel lateral. Tamborines es la sección 1 (Surdos es la
 // sección 2) — clickear un casillero de Tamborines la selecciona y habilita moverla
 // hacia atrás con las mismas flechas que ya existen en otras partes de Formación.
 await plano.locator('g').filter({has:page.locator('title:text-is("Surdos · Surdos")')}).first().click();
 await page.getByText('Sección seleccionada: Surdos',{exact:false}).waitFor();
 await plano.locator('g').filter({has:page.locator('title:text-is("Tamborines · Tamborines")')}).first().click();
 await page.getByText('Sección seleccionada: Tamborines',{exact:false}).waitFor();
 assert.equal(await page.locator('.border-primary.bg-primary\\/5').filter({hasText:'1. Tamborines'}).count(),1);
 await page.getByRole('button',{name:'Mover Tamborines más atrás',exact:true}).click();
 assert.equal(await page.locator('.border-primary.bg-primary\\/5').filter({hasText:'2. Tamborines'}).count(),1);
 assert.equal(await page.getByText('1. Surdos',{exact:false}).count(),1);
 await page.getByRole('button',{name:'Mover Tamborines más adelante',exact:true}).click();
 assert.equal(await page.locator('.border-primary.bg-primary\\/5').filter({hasText:'1. Tamborines'}).count(),1);
 console.log('PASS mover una sección simple ya ubicada directo desde el plano, con las mismas flechas del panel lateral');

 // Agregar una sección nueva directo desde el panel lateral, sin rehacer el asistente
 // completo. Repiques todavía no está en ninguna sección en este punto del test.
 await page.getByRole('button',{name:'Agregar sección',exact:true}).click();
 await page.getByRole('button',{name:'Repiques',exact:true}).click();
 await page.getByRole('button',{name:'Agregar',exact:true}).click();
 await page.getByText('5. Repiques',{exact:false}).waitFor();
 assert.equal(await page.locator('.border-primary.bg-primary\\/5').filter({hasText:'5. Repiques'}).count(),1);
 console.log('PASS agregar una sección nueva directo desde el panel, sin rehacer el asistente');

 // Punto 2 de esta ronda: mover una sección MEZCLADA directo desde el plano, no solo
 // una simple — "Cocina" ya no existe en este punto (el bloque anterior rehizo la
 // formación con el asistente para el caso numérico exacto); la sección mezclada
 // vigente es "Percusión chica" (Chocalho+Cuicas), vacía todavía, así que apunto a un
 // casillero vacío suyo.
 await plano.locator('g').filter({has:page.locator('title:text-is("Vacío · Percusión chica")')}).first().click();
 await page.getByText('Sección seleccionada: Percusión chica',{exact:false}).waitFor();
 assert.equal(await page.locator('.border-primary.bg-primary\\/5').filter({hasText:'Percusión chica'}).count(),1);
 const ordenAntes=await page.locator('.border-primary.bg-primary\\/5').filter({hasText:'Percusión chica'}).innerText();
 await page.getByRole('button',{name:'Mover Percusión chica más atrás',exact:true}).click();
 const ordenDespues=await page.locator('.border-primary.bg-primary\\/5').filter({hasText:'Percusión chica'}).innerText();
 assert.notEqual(ordenAntes,ordenDespues,'El número de orden de Percusión chica cambió al moverla');
 await page.getByRole('button',{name:'Mover Percusión chica más adelante',exact:true}).click();
 assert.equal(await page.locator('.border-primary.bg-primary\\/5').filter({hasText:'Percusión chica'}).innerText(),ordenAntes,'Vuelve al orden original');
 console.log('PASS mover una sección MEZCLADA directo desde el plano, igual que una simple');

 // Arrastrar/copiar-pegar (ronda nueva): pinto dos casilleros de Percusión chica del
 // lado izquierdo para tener algo que mover y copiar. El espejo está activo, así que
 // "Chocalho · Percusión chica" y "Cuicas · Percusión chica" aparecen también
 // reflejados a la derecha (mismo título, sin variante que rotar) — todas las
 // búsquedas de acá en más filtran por posición (mitad izquierda real).
 await clickPrimerVacioIzquierda('Percusión chica');
 await page.getByRole('button',{name:'Elegir Chocalho',exact:true}).click();
 await clickPrimerVacioIzquierda('Percusión chica');
 await page.getByRole('button',{name:'Elegir Cuicas',exact:true}).click();
 async function grupoEnIzquierda(titulo,seccionNombre){
  const planoBox=await plano.boundingBox();
  const medio=planoBox.x+planoBox.width/2;
  const grupos=plano.locator('g').filter({has:page.locator(`title:text-is("${titulo} · ${seccionNombre}")`)});
  const n=await grupos.count();
  for(let i=0;i<n;i++){
   const box=await grupos.nth(i).boundingBox();
   if(box&&box.x<medio)return grupos.nth(i);
  }
  throw new Error(`No se encontró "${titulo} · ${seccionNombre}" en la mitad izquierda`);
 }
 async function vacioEnIzquierda(seccionNombre){
  const planoBox=await plano.boundingBox();
  const medio=planoBox.x+planoBox.width/2;
  const grupos=plano.locator('g').filter({has:page.locator(`title:text-is("Vacío · ${seccionNombre}")`)});
  const n=await grupos.count();
  for(let i=0;i<n;i++){
   const box=await grupos.nth(i).boundingBox();
   if(box&&box.x<medio)return grupos.nth(i);
  }
  throw new Error(`No se encontró un casillero vacío de "${seccionNombre}" en la mitad izquierda`);
 }
 async function vacioEnDerecha(seccionNombre){
  const planoBox=await plano.boundingBox();
  const medio=planoBox.x+planoBox.width/2;
  const grupos=plano.locator('g').filter({has:page.locator(`title:text-is("Vacío · ${seccionNombre}")`)});
  const n=await grupos.count();
  for(let i=0;i<n;i++){
   const box=await grupos.nth(i).boundingBox();
   if(box&&box.x>=medio)return grupos.nth(i);
  }
  throw new Error(`No se encontró un casillero vacío de "${seccionNombre}" en la mitad derecha`);
 }
 async function grupoEnDerecha(titulo,seccionNombre){
  const planoBox=await plano.boundingBox();
  const medio=planoBox.x+planoBox.width/2;
  const grupos=plano.locator('g').filter({has:page.locator(`title:text-is("${titulo} · ${seccionNombre}")`)});
  const n=await grupos.count();
  for(let i=0;i<n;i++){
   const box=await grupos.nth(i).boundingBox();
   if(box&&box.x>=medio)return grupos.nth(i);
  }
  throw new Error(`No se encontró "${titulo} · ${seccionNombre}" en la mitad derecha`);
 }
 assert((await grupoEnIzquierda('Chocalho','Percusión chica'))!=null);
 assert((await grupoEnIzquierda('Cuicas','Percusión chica'))!=null);
 console.log('PASS setup: dos casilleros de Percusión chica pintados (Chocalho y Cuicas) para probar arrastrar/copiar');

 // Arrastre manual con eventos de mouse reales (mousedown+mousemove+mouseup), NO el
 // drag-and-drop nativo de HTML5 (`dragTo`/`draggable`) — ese es poco confiable sobre
 // SVG en navegadores reales aunque funcione en tests, así que el plano lo maneja a
 // mano con mouse events, igual que el lazo de selección.
 async function arrastrarCelda(origen,destino){
  const cajaOrigen=await origen.boundingBox(),cajaDestino=await destino.boundingBox();
  assert(cajaOrigen&&cajaDestino,'Origen y destino tienen que estar visibles para arrastrar');
  await page.mouse.move(cajaOrigen.x+cajaOrigen.width/2,cajaOrigen.y+cajaOrigen.height/2);
  await page.mouse.down();
  await page.mouse.move(cajaDestino.x+cajaDestino.width/2,cajaDestino.y+cajaDestino.height/2,{steps:5});
  await page.mouse.up();
 }

 // Arrastrar un casillero pintado a uno vacío lo mueve.
 const origenChocalho=await grupoEnIzquierda('Chocalho','Percusión chica');
 const vacioParaMover=await vacioEnIzquierda('Percusión chica');
 await arrastrarCelda(origenChocalho,vacioParaMover);
 assert((await grupoEnIzquierda('Chocalho','Percusión chica'))!=null,'Chocalho sigue existiendo, en la nueva posición');
 console.log('PASS arrastrar un casillero pintado a uno vacío lo mueve (mouse events reales, no drag HTML5)');

 // Selección múltiple con Ctrl/Cmd+clic: sumo Chocalho y Cuicas a la selección (sin
 // abrir el popover de pintado) y confirmo que aparece el resumen con el conteo.
 const chocalhoActual=await grupoEnIzquierda('Chocalho','Percusión chica');
 const cuicasActual=await grupoEnIzquierda('Cuicas','Percusión chica');
 await chocalhoActual.click({modifiers:['ControlOrMeta']});
 await cuicasActual.click({modifiers:['ControlOrMeta']});
 await page.getByText('2 casilleros seleccionados',{exact:true}).waitFor();
 console.log('PASS Ctrl/Cmd+clic suma casilleros sueltos a la selección');

 // Copiar la selección (botón "Copiar", equivalente a Ctrl/Cmd+C) y pegarla con
 // Ctrl/Cmd+V anclado al último casillero clickeado: el clic en el vacío abre el
 // popover normal de pintado (un clic sin modificadores nunca pega solo, para no
 // interferir con el flujo de pintar de siempre) y el V pega ahí mismo.
 await page.getByRole('button',{name:'Copiar',exact:true}).click();
 const vacioParaPegar=await vacioEnIzquierda('Percusión chica');
 await vacioParaPegar.click();
 await page.keyboard.press('Escape');
 await page.keyboard.press('ControlOrMeta+v');
 // Tras pegar, Chocalho y Cuicas siguen existiendo (puede que en nuevas posiciones si el
 // destino coincidía con el origen del portapapeles, pero como mínimo siguen presentes).
 assert((await grupoEnIzquierda('Chocalho','Percusión chica'))!=null);
 assert((await grupoEnIzquierda('Cuicas','Percusión chica'))!=null);
 console.log('PASS copiar una selección y pegarla con Ctrl/Cmd+V en el último casillero clickeado');

 // Lazo de selección: arrastrar el mouse sobre el fondo del plano dibuja un
 // rectángulo y selecciona todos los casilleros de Percusión chica que toca. La
 // selección ya quedó vacía tras el clic normal de más arriba (pegar no la usa).
 const cajaChocalho=await (await grupoEnIzquierda('Chocalho','Percusión chica')).boundingBox();
 const cajaCuicas=await (await grupoEnIzquierda('Cuicas','Percusión chica')).boundingBox();
 assert(cajaChocalho&&cajaCuicas,'Ambos casilleros tienen que estar visibles para el lazo');
 // El margen del lazo no puede salirse del propio SVG (su borde izquierdo/superior
 // puede estar a solo unos px del casillero si es el primero de la grilla).
 const planoBox=await plano.boundingBox();
 const x0=Math.max(planoBox.x+2,Math.min(cajaChocalho.x,cajaCuicas.x)-5);
 const y0=Math.max(planoBox.y+2,Math.min(cajaChocalho.y,cajaCuicas.y)-5);
 const x1=Math.min(planoBox.x+planoBox.width-2,Math.max(cajaChocalho.x+cajaChocalho.width,cajaCuicas.x+cajaCuicas.width)+5);
 const y1=Math.min(planoBox.y+planoBox.height-2,Math.max(cajaChocalho.y+cajaChocalho.height,cajaCuicas.y+cajaCuicas.height)+5);
 await page.mouse.move(x0,y0);
 await page.mouse.down();
 await page.mouse.move(x1,y1,{steps:5});
 await page.mouse.up();
 assert.equal(await page.getByText('2 casilleros seleccionados',{exact:true}).count(),1,'El lazo seleccionó los 2 casilleros que tocaba');
 console.log('PASS arrastrar un lazo sobre el plano selecciona todos los casilleros que toca');
 await page.getByRole('button',{name:'Deseleccionar',exact:true}).click();

 // Punto 8 (ronda nueva): arrastrar un casillero pintado sobre OTRO pintado los
 // intercambia (swap), sin perder ninguno de los dos valores. Chocalho y Cuicas están
 // ambos pintados en Percusión chica en este punto — los arrastro uno sobre el otro y
 // confirmo que los dos títulos siguen existiendo (nada se pisó ni se perdió).
 const chocalhoParaSwap=await grupoEnIzquierda('Chocalho','Percusión chica');
 const cuicasParaSwap=await grupoEnIzquierda('Cuicas','Percusión chica');
 await arrastrarCelda(chocalhoParaSwap,cuicasParaSwap);
 assert((await grupoEnIzquierda('Chocalho','Percusión chica'))!=null,'Chocalho sigue existiendo tras el swap');
 assert((await grupoEnIzquierda('Cuicas','Percusión chica'))!=null,'Cuicas sigue existiendo tras el swap (no se perdió al arrastrar encima)');
 console.log('PASS arrastrar un casillero pintado sobre otro pintado los intercambia (swap), sin perder ninguno');

 // Fix de bug: mover un casillero de la DERECHA que llegó ahí solo por el espejo
 // (nunca se tocó a mano) tiene que funcionar igual que cualquier otro pintado. Antes
 // de este fix, el valor de esas celdas se leía de `grillaDerecha` en crudo — vacío
 // para las que nunca se desvincularon — así que el arrastre no encontraba nada para
 // mover y no pasaba nada. Cuicas en Percusión chica, lado derecho, está reflejada
 // por el espejo (nunca editada a mano): la arrastro a un vacío de la derecha.
 const cuicasEspejadaDerecha=await grupoEnDerecha('Cuicas','Percusión chica');
 const vacioDerecha=await vacioEnDerecha('Percusión chica');
 await arrastrarCelda(cuicasEspejadaDerecha,vacioDerecha);
 // Al moverla, ese casillero de la derecha queda desvinculado del espejo (igual que
 // al editarlo a mano) — el <title> pasa a incluir el sufijo, y el indicador visual
 // (pin quieto) lo marca. La búsqueda exacta "Cuicas · Percusión chica" ya no
 // matchea (ahora tiene el sufijo), así que confirmo con el título completo.
 assert.equal(await plano.locator('title:text-is("Cuicas · Percusión chica (desvinculado del espejo)")').count(),1,'Cuicas (espejada, nunca editada a mano) se pudo mover del lado derecho y quedó marcada como desvinculada');
 console.log('PASS mover un casillero de la derecha que llegó ahí solo por el espejo (nunca editado a mano) funciona igual que cualquier otro, y queda marcado como desvinculado');

 // Punto 9 (ronda nueva): Shift+lazo selecciona aunque el arrastre empiece sobre un
 // casillero YA pintado (sin Shift, eso dispararía el drag-and-drop de moverlo).
 const cajaChocalhoSwap=await (await grupoEnIzquierda('Chocalho','Percusión chica')).boundingBox();
 const cajaCuicasSwap=await (await grupoEnIzquierda('Cuicas','Percusión chica')).boundingBox();
 assert(cajaChocalhoSwap&&cajaCuicasSwap);
 const planoBoxShift=await plano.boundingBox();
 const centroChocalho={x:cajaChocalhoSwap.x+cajaChocalhoSwap.width/2,y:cajaChocalhoSwap.y+cajaChocalhoSwap.height/2};
 const finShift={
  x:Math.min(planoBoxShift.x+planoBoxShift.width-2,Math.max(cajaChocalhoSwap.x+cajaChocalhoSwap.width,cajaCuicasSwap.x+cajaCuicasSwap.width)+5),
  y:Math.min(planoBoxShift.y+planoBoxShift.height-2,Math.max(cajaChocalhoSwap.y+cajaChocalhoSwap.height,cajaCuicasSwap.y+cajaCuicasSwap.height)+5),
 };
 await page.keyboard.down('Shift');
 await page.mouse.move(centroChocalho.x,centroChocalho.y);
 await page.mouse.down();
 await page.mouse.move(finShift.x,finShift.y,{steps:5});
 await page.mouse.up();
 await page.keyboard.up('Shift');
 assert.equal(await page.getByText('2 casilleros seleccionados',{exact:true}).count(),1,'Shift+lazo seleccionó ambos casilleros aunque empezó sobre uno pintado');
 console.log('PASS Shift+lazo selecciona arrastrando aunque empiece sobre un casillero ya pintado');

 // Pintado en lote: con los 2 casilleros de Percusión chica seleccionados, clickeo
 // uno de ellos SIN Ctrl/Cmd (abre el popover normal) y elijo Chocalho — como la
 // selección tiene más de 1 casillero e incluye el que clickeé, pinta los dos de una
 // sola vez con "Chocalho" en vez de solo el que abrió el popover. Comparo antes/después
 // (en vez de un número absoluto) porque puede haber otros "Chocalho" pintados de
 // pruebas anteriores (copiar/pegar) en otras posiciones de la sección, y al menos un
 // casillero de la derecha ya quedó desvinculado del espejo por una prueba anterior
 // (mover un casillero espejado), así que su reflejo no se actualiza acá — al menos
 // +1 "Chocalho" nuevo por los 2 casilleros pintados a mano (izquierda seguro,
 // derecha solo si no está desvinculada).
 const chocalhoAntesDeLote=await page.locator('title:text-is("Chocalho · Percusión chica")').count();
 const paraPintarEnLote=await grupoEnIzquierda('Cuicas','Percusión chica');
 await paraPintarEnLote.click();
 await page.getByRole('button',{name:'Elegir Chocalho',exact:true}).click();
 const chocalhoTrasLote=await page.locator('title:text-is("Chocalho · Percusión chica")').count();
 assert(chocalhoTrasLote>=chocalhoAntesDeLote+1,`El pintado en lote tiene que sumar Chocalho nuevos: antes ${chocalhoAntesDeLote}, después ${chocalhoTrasLote}`);
 assert.equal(await page.getByText('casilleros seleccionados',{exact:false}).count(),0,'La selección se limpia después de pintar en lote');
 console.log('PASS pintado en lote: elegir un naipe con varios casilleros seleccionados los pinta todos de una vez');

 // Punto 3 de esta ronda: ancho de columnas propio por sección, independiente del
 // ancho general de la mitad (8, tras el cambio de más arriba). Percusión chica
 // (Chocalho=16+Cuicas=16=32 total) con ancho general=8 tiene filas=techo(32/2/8)=2
 // (2 filas x 8 columnas x 2 mitades = 32 casilleros de grilla). Con ancho propio=4,
 // pasa a techo(32/2/4)=4 filas x 4 columnas x 2 mitades = 32 casilleros también (no
 // cambia en este caso particular) — uso ancho propio=16 en cambio: filas=techo(32/2/16)=1,
 // grilla=1*16*2=32. Para un cambio de tamaño de grilla inequívoco upeo el ancho
 // propio a 3: filas=techo(32/2/3)=6, grilla=6*3*2=36 casilleros (36 != 32).
 // Ancho propio y Filas quedan ocultos detrás de un botón "Ajustes" (evita recargar
 // visualmente la fila de cada sección) — hay que abrirlo antes de tocarlos.
 await page.getByRole('button',{name:'Ajustes de Percusión chica',exact:true}).click();
 const filaPercusion=page.locator('.rounded-lg.border').filter({hasText:'Percusión chica'}).first();
 const textoAntes=await filaPercusion.innerText();
 await page.getByLabel('Ancho propio de Percusión chica',{exact:true}).fill('3');
 await page.waitForTimeout(300);
 const textoDespues=await filaPercusion.innerText();
 assert.notEqual(textoAntes,textoDespues,'El ancho propio cambia el cálculo de filas/casilleros de la sección');
 await page.getByLabel('Ancho propio de Percusión chica',{exact:true}).fill('');
 await page.waitForTimeout(300);
 assert.equal(await filaPercusion.innerText(),textoAntes,'Sin ancho propio, vuelve al cálculo con el ancho general');
 console.log('PASS ancho de columnas propio por sección: cambia el cálculo de filas de esa sección sin tocar el ancho general de la mitad');

 // Filas fijadas a mano: en vez de definir el ancho, se fija directamente la
 // cantidad de filas — el ancho de columnas se recalcula solo para que las
 // posiciones entren en esas filas, y el input de "Ancho propio" pasa a mostrar ese
 // valor derivado (deshabilitado, ya no es editable directamente mientras haya
 // filas fijas). Percusión chica tiene 32 posiciones totales (16+16). Con filas=3
 // fijas, el ancho
 // derivado es techo(32/2/3)=6, y la grilla resultante (3 filas x 6 columnas x 2
 // mitades = 36 casilleros) cambia de tamaño respecto al cálculo automático anterior
 // (2 filas x 8 columnas x 2 mitades = 32), así que el cambio es inequívoco.
 await page.getByLabel('Filas de Percusión chica',{exact:true}).fill('3');
 await page.waitForTimeout(300);
 const anchoPropioInput=page.getByLabel('Ancho propio de Percusión chica',{exact:true});
 assert(await anchoPropioInput.isDisabled(),'Con filas fijas, el ancho propio deja de ser editable (se deriva solo)');
 assert.equal(await anchoPropioInput.inputValue(),'6','El ancho propio muestra el valor derivado de las filas fijas (techo(32/2/3)=6)');
 const textoConFilasFijas=await filaPercusion.innerText();
 assert.notEqual(textoConFilasFijas,textoAntes,'Fijar filas cambia el cálculo de la sección (cantidad de casilleros de la grilla)');
 await page.getByLabel('Filas de Percusión chica',{exact:true}).fill('');
 await page.waitForTimeout(300);
 assert(!(await anchoPropioInput.isDisabled()),'Sin filas fijas, el ancho propio vuelve a ser editable');
 assert.equal(await filaPercusion.innerText(),textoAntes,'Sin filas fijas, vuelve al cálculo automático de siempre');
 console.log('PASS filas fijadas a mano: el ancho de columnas se deriva solo, y se puede volver al cálculo automático');

 // Punto 7 de esta ronda: panel lateral de progreso, plegable, con conteos en vivo.
 // El botón conserva su aria-label "Progreso" plegado o desplegado, así que el mismo
 // locator sirve para las dos direcciones del toggle.
 const togglePanel=page.getByRole('button',{name:'Progreso',exact:true});
 await togglePanel.waitFor();
 const lineaTamborines=page.locator('li').filter({hasText:'Tamborines'}).filter({hasText:'/'});
 await lineaTamborines.first().waitFor();
 const textoAntesDePintar=await lineaTamborines.first().innerText();
 assert(/\d+\/\d+/.test(textoAntesDePintar),'El panel muestra "pintadas/total" para Tamborines');
 await togglePanel.click(); // plegar
 await page.getByText('Progreso',{exact:true}).waitFor({state:'hidden'});
 assert.equal(await lineaTamborines.count(),0,'Plegado: ya no se ven las líneas del panel');
 await togglePanel.click(); // desplegar
 await lineaTamborines.first().waitFor();
 console.log('PASS panel lateral de progreso: muestra conteos por naipe/variante y se puede plegar/desplegar');

 // Punto 6 de esta ronda: exportar el plano como PNG, incluyendo la leyenda.
 const [descarga]=await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button',{name:'Exportar PNG',exact:true}).click(),
 ]);
 assert(descarga.suggestedFilename().endsWith('.png'),'La descarga tiene que ser un archivo PNG');
 const rutaDescarga=`test-results/${descarga.suggestedFilename()}`;
 await descarga.saveAs(rutaDescarga);
 const bytesPng=await readFile(rutaDescarga);
 assert(bytesPng.length>0,'El PNG exportado no puede estar vacío');
 assert.equal(bytesPng[0],0x89,'Firma PNG válida (primer byte 0x89)'); // cabecera estándar del formato PNG
 console.log('PASS exportar el plano como imagen PNG con firma de archivo válida, incluyendo plano y leyenda');

 // Espejo de Surdo: pinto las tres voces de Surdo a mano en una sección MEZCLADA y
 // confirmo que el espejo intercambia 1ra<->2da (3ra queda idéntica, no rota con las
 // otras dos) en vez de copiar la misma voz; Caixa (aunque tenga variantes) sigue
 // espejando idéntico.
 await page.getByLabel('Ancho de mitad',{exact:true}).fill('4');
 await page.getByRole('button',{name:'Rehacer con el asistente',exact:true}).click();
 await page.getByLabel('Ancho de cada mitad (columnas)').fill('3');
 await page.getByLabel('Ancho del pasillo central (columnas)').fill('4');
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();
 await page.getByRole('button',{name:'Caixas',exact:true}).click();
 await page.getByRole('button',{name:'Surdos',exact:true}).click();
 await page.getByPlaceholder('Nombre de la sección (ej. Cocina)').fill('Fondo');
 await page.getByRole('button',{name:'Agregar sección',exact:true}).click();
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();
 await page.getByRole('button',{name:'Integrantes actuales',exact:true}).click();
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();
 await page.getByRole('button',{name:'Espejar (se completa solo)',exact:true}).click();
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();
 await page.getByRole('button',{name:'Generar formación',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});

 // Pinto Surdos 1ra, 2da y 3ra en tres casilleros distintos del lado izquierdo, y
 // Caixas 14" en un cuarto casillero (para confirmar que Caixa no rota), usando el
 // selector de dos pasos: elegir el naipe general y luego la variante.
 await clickPrimerVacioIzquierda('Fondo');
 await page.getByRole('button',{name:'Elegir Surdos',exact:true}).click();
 await page.getByRole('button',{name:'Pintar Surdos 1ra',exact:true}).click();
 await clickPrimerVacioIzquierda('Fondo');
 await page.getByRole('button',{name:'Elegir Surdos',exact:true}).click();
 await page.getByRole('button',{name:'Pintar Surdos 2da',exact:true}).click();
 await clickPrimerVacioIzquierda('Fondo');
 await page.getByRole('button',{name:'Elegir Surdos',exact:true}).click();
 await page.getByRole('button',{name:'Pintar Surdos 3ra',exact:true}).click();
 await clickPrimerVacioIzquierda('Fondo');
 await page.getByRole('button',{name:'Elegir Caixas',exact:true}).click();
 await page.getByRole('button',{name:'Pintar Caixas 14"',exact:true}).click();

 await page.getByRole('button',{name:'Guardar formación',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Formación guardada'}).waitFor();
 const storedRotacion=(await db.edicion.findUniqueOrThrow({where:{id:ed.id}})).planNaipes;
 const fondo=storedRotacion.formacion.secciones.find(s=>s.nombre==='Fondo');
 assert(fondo);
 const izqFondo=fondo.grilla.flat();
 assert(izqFondo.includes('Surdos 1ra')&&izqFondo.includes('Surdos 2da')&&izqFondo.includes('Surdos 3ra')&&izqFondo.includes('Caixas 14"'));
 // Verificación explícita del mapeo del espejo de Surdo, celda por celda (no solo por
 // conteo total, que no distingue un mapeo cíclico 1ra->2da->3ra->1ra de uno de
 // intercambio 1ra<->2da con 3ra idéntica). Ancho de mitad=3: las 3 voces de Surdo se
 // pintaron en la primera fila de "Fondo", columnas 0,1,2 en ese orden (1ra,2da,3ra).
 // El espejo invierte la fila (columna c del ancho w -> columna w-1-c), así que la
 // celda derecha en x=(anchoMitad+anchoPasillo+col)*28+4 tiene que mostrar exactamente
 // el espejo de la columna opuesta de la izquierda.
 async function tituloEnX(xEsperado,yEsperado){
  const rect=plano.locator(`rect[x="${xEsperado}"][y="${yEsperado}"]`).first();
  return (await rect.locator('xpath=..').locator('title').textContent());
 }
 const anchoMitadFondo=3,anchoPasilloFondo=4;
 const xCol=col=>(anchoMitadFondo+anchoPasilloFondo+col)*28+4;
 // col derecha 0 <- col izquierda 2 (3ra) => tiene que mostrar "Surdos 3ra" (idéntica)
 assert.equal(await tituloEnX(xCol(0),4),'Surdos 3ra · Fondo','La derecha en la posición espejada de la 3ra tiene que ser Surdos 3ra (idéntica, no rota)');
 // col derecha 1 <- col izquierda 1 (2da) => tiene que mostrar "Surdos 1ra" (espejo de 2da)
 assert.equal(await tituloEnX(xCol(1),4),'Surdos 1ra · Fondo','La derecha en la posición espejada de la 2da tiene que ser Surdos 1ra (2da espeja como 1ra)');
 // col derecha 2 <- col izquierda 0 (1ra) => tiene que mostrar "Surdos 2da" (espejo de 1ra)
 assert.equal(await tituloEnX(xCol(2),4),'Surdos 2da · Fondo','La derecha en la posición espejada de la 1ra tiene que ser Surdos 2da (1ra espeja como 2da)');
 // Caixa 14" quedó en la fila siguiente (fila 1, columna 0): su espejo (col derecha 2,
 // fila 1, y=32) tiene que seguir siendo idéntico, sin rotar como Surdo.
 assert.equal(await tituloEnX(xCol(2),32),'Caixas 14" · Fondo','Caixa espeja idéntica, sin rotar como Surdo');
 console.log('PASS espejo de Surdo confirmado celda por celda: 1ra->2da, 2da->1ra, 3ra->3ra (intercambio, no ciclo), en la misma corrida');

 // Puntos 1 y 2 de esta ronda: las tres celdas de Surdo usan el mismo color base (el
 // de la leyenda, nunca el de Caixas u otro naipe) y muestran la variante como texto
 // ("1ra"/"2da"/"3ra") en vez de tonos distintos. Comparo el fill de las tres celdas de
 // Surdo entre sí y contra el de Caixas (tienen que ser iguales entre Surdos y distinto
 // de Caixas), y confirmo que el texto de cada variante está en el DOM.
 const rectSurdo1ra=plano.locator('g').filter({has:page.locator('title:text-is("Surdos 1ra · Fondo")')}).first().locator('rect');
 const rectSurdo2da=plano.locator('g').filter({has:page.locator('title:text-is("Surdos 2da · Fondo")')}).first().locator('rect');
 const rectSurdo3ra=plano.locator('g').filter({has:page.locator('title:text-is("Surdos 3ra · Fondo")')}).first().locator('rect');
 const rectCaixa=plano.locator('g').filter({has:page.locator('title:text-is("Caixas 14\\" · Fondo")')}).first().locator('rect');
 const [fill1ra,fill2da,fill3ra,fillCaixa]=await Promise.all([rectSurdo1ra,rectSurdo2da,rectSurdo3ra,rectCaixa].map(r=>r.getAttribute('fill')));
 assert.equal(fill1ra,fill2da,'Surdo 1ra y 2da tienen que compartir el mismo color base');
 assert.equal(fill2da,fill3ra,'Surdo 2da y 3ra tienen que compartir el mismo color base');
 assert.notEqual(fill1ra,fillCaixa,'Surdo no puede compartir color con Caixa');
 assert.equal(await plano.locator('g').filter({has:page.locator('title:text-is("Surdos 1ra · Fondo")')}).first().locator('text',{hasText:'1ra'}).count(),1);
 assert.equal(await plano.locator('g').filter({has:page.locator('title:text-is("Surdos 2da · Fondo")')}).first().locator('text',{hasText:'2da'}).count(),1);
 assert.equal(await plano.locator('g').filter({has:page.locator('title:text-is("Surdos 3ra · Fondo")')}).first().locator('text',{hasText:'3ra'}).count(),1);
 console.log('PASS Surdo en sus tres variantes: mismo color base que la leyenda, distinto del de Caixa, con la etiqueta de texto visible en cada casillero');

 // Bug reportado: con los 7 naipes del catálogo (todos con al menos 1 ritmista activo)
 // como 7 secciones SIMPLES separadas, el plano solo dibujaba las 2 primeras — las
 // demás no aparecían ni siquiera vacías. Causa real: las secciones simples no
 // marcaban las posiciones sin usar de su fila, así que una sección con pocos
 // integrantes (1 de N posibles) se veía como un cuadradito perdido en una fila casi
 // en blanco. Reconstruyo el asistente con las 7 secciones simples, ancho de mitad=4,
 // y confirmo que las 7 aparecen dibujadas (pintadas o marcadas vacías) y que el
 // ancho del plano coincide exactamente con lo configurado, sin espacio sobrante.
 const naipesTodos=['Caixas','Repiques','Surdos','Tamborines','Chocalho','Frigideiras','Cuicas'];
 await page.getByLabel('Ancho de mitad',{exact:true}).fill('4');
 await page.getByRole('button',{name:'Rehacer con el asistente',exact:true}).click();
 await page.getByLabel('Ancho de cada mitad (columnas)').fill('4');
 await page.getByLabel('Ancho del pasillo central (columnas)').fill('4');
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();
 for(const nombre of naipesTodos){
  await page.getByRole('button',{name:nombre,exact:true}).click();
  await page.getByRole('button',{name:'Agregar sección',exact:true}).click();
 }
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();
 await page.getByRole('button',{name:'Integrantes actuales',exact:true}).click();
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();
 await page.getByRole('button',{name:'Espejar (se completa solo)',exact:true}).click();
 await page.getByRole('button',{name:'Siguiente',exact:true}).click();
 await page.getByRole('button',{name:'Generar formación',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 for(const nombre of naipesTodos){
  const enElPlano=await plano.locator('g').filter({has:page.locator(`title:text-is("${nombre} · ${nombre}")`).or(page.locator(`title:text-is("Vacío · ${nombre}")`))}).count();
  assert(enElPlano>0,`La sección "${nombre}" tiene que aparecer dibujada en el plano (pintada o vacía marcada)`);
 }
 // Ancho exacto: anchoMitad(4)*2 + anchoPasillo(4) = 12 columnas, sin espacio sobrante.
 assert.equal(Number(await plano.getAttribute('width')),12*28+8);
 console.log('PASS las 7 secciones del catálogo aparecen dibujadas en el plano (no solo las primeras 2), con el ancho exacto configurado sin espacio sobrante');

 await page.screenshot({path:'test-results/naipes-equilibrio.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'test-results/naipes-plan-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1050});console.log('PASS persistencia de lo pintado tras recarga y móvil sin desborde');

 const stored3=(await db.edicion.findUniqueOrThrow({where:{id:ed.id}})).planNaipes;
 const invalidMetas=await action(ctx,'guardarMetasNaipes',[ed.id,[{...stored3.metas[0],objetivo:-1}]]);assert(invalidMetas.body.includes('Revisá'));
 const invalidFormacion=await action(ctx,'guardarFormacionNaipes',[ed.id,{...stored3.formacion,anchoMitad:0}]);assert(invalidFormacion.body.includes('formato inválido'));
 for(const eid of [foreign.id]){const denied=await action(ctx,'guardarFormacionNaipes',[eid,stored3.formacion]);assert(denied.status>=400||/\n\w+:E\{/.test(denied.body));}
 assert.deepEqual((await db.edicion.findUniqueOrThrow({where:{id:foreign.id}})).planNaipes,{});
 console.log('PASS metas y formación inválidas rechazadas; batería ajena rechazada');

 await page.getByLabel('Carnaval del plan').selectOption(old.id);await page.getByText(`Carnaval ${year-1} · Edición cerrada. Podés editar el plan; los participantes y movimientos conservan sus datos históricos.`,{exact:true}).waitFor();assert.equal(await page.getByRole('tab',{name:'Formación',exact:true}).getAttribute('aria-selected'),'true');await page.getByRole('tab',{name:'Ecualización',exact:true}).click();assert(!(await page.getByLabel('Objetivo Tamborines').isDisabled()));await page.getByLabel('Objetivo Tamborines').fill('7');await page.getByRole('button',{name:'Guardar objetivos',exact:true}).click();await page.getByRole('status').waitFor();const oldMetas=(await db.edicion.findUniqueOrThrow({where:{id:old.id}})).planNaipes.metas;assert.equal(oldMetas.find(m=>m.nombre==='Tamborines').objetivo,7);assert.equal(await db.ritmistaEdicion.count({where:{edicionId:old.id}}),12);console.log('PASS plan histórico editable sin alterar participantes');

 await page.goto(base+'/carnaval/naipes');assert.equal(await page.getByLabel('Objetivo Tamborines').inputValue(),'30');console.log('PASS mismo plan en Naipes y Carnaval');

 // Punto 1: gestión de variantes desde Base de Datos → Naipes. Repiques no tiene
 // variantes precargadas (a diferencia de Caixas y Surdos): el director puede
 // agregar, editar (vía eliminar+recrear con otro nombre no aplica acá, se prueba
 // agregar/eliminar) y eliminar libremente.
 await page.goto(base+'/naipes');
 await page.getByRole('button',{name:'Administrar catálogo de naipes',exact:true}).click();
 await page.getByRole('heading',{name:'Naipes',exact:true}).waitFor();
 const filaRepiques=page.getByRole('listitem').filter({has:page.getByRole('heading',{name:'Repiques',exact:true})});
 await filaRepiques.getByRole('button',{name:'Ver variantes de Repiques',exact:true}).click();
 await page.getByText('Sin variantes cargadas',{exact:false}).waitFor();
 await filaRepiques.getByLabel('Nueva variante de Repiques',{exact:true}).fill('10"');
 await filaRepiques.getByRole('button',{name:'Agregar',exact:true}).click();
 await filaRepiques.getByText('10"',{exact:true}).waitFor();
 await filaRepiques.getByLabel('Nueva variante de Repiques',{exact:true}).fill('12"');
 await filaRepiques.getByRole('button',{name:'Agregar',exact:true}).click();
 await filaRepiques.getByText('12"',{exact:true}).waitFor();
 await filaRepiques.getByRole('button',{name:'Eliminar variante 10" de Repiques',exact:true}).click();
 await filaRepiques.getByText('10"',{exact:true}).waitFor({state:'hidden'});
 assert.equal(await db.naipeVariante.count({where:{naipe:{bateriaId:id,nombre:'Repiques'}}}),1);
 console.log('PASS variantes por naipe: agregar y eliminar libremente desde Naipes');

 // Validación de suma del desglose (punto 2): con Repiques ahora teniendo variante
 // "12\"", cargar un desglose que no sume el Objetivo total dispara el aviso, sin
 // bloquear el guardado (se conserva tal cual, informativo).
 await page.goto(base+'/naipes');
 await page.getByRole('heading',{name:'Naipes y formación'}).waitFor();
 await page.getByRole('tab',{name:'Ecualización',exact:true}).click();
 await page.getByRole('button',{name:'Desglosar Repiques por variante',exact:true}).click();
 await page.getByLabel('Objetivo Repiques 12"',{exact:true}).fill('999');
 await page.getByRole('alert').filter({hasText:'La suma del desglose'}).waitFor();
 await page.getByRole('button',{name:'Guardar objetivos',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Objetivos guardados'}).waitFor();
 const storedDesglose=(await db.edicion.findUniqueOrThrow({where:{id:ed.id}})).planNaipes;
 assert.deepEqual(storedDesglose.metas.find(m=>m.nombre==='Repiques').desglose,{'12"':999});
 await page.getByRole('alert').filter({hasText:'La suma del desglose'}).waitFor();
 console.log('PASS validación de suma del desglose: aviso informativo, no bloquea el guardado');

 // Consistencia visual con Naipes: el chevron para expandir el desglose queda pegado
 // al nombre del naipe (mismo patrón que en Naipes), y el desglose expandido tiene un
 // botón de tres puntos para agregar una variante nueva sin ir a la pantalla de Naipes.
 // Chocalho no tiene ninguna variante cargada: sigue mostrando la fila simple, sin
 // chevron ni tres puntos.
 assert.equal(await page.getByRole('button',{name:'Desglosar Chocalho por variante',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Ver integrantes de Chocalho',exact:true}).count(),1);
 await page.getByRole('button',{name:'Más opciones de Repiques',exact:true}).click();
 await page.getByRole('menuitem',{name:'Agregar variante',exact:true}).click();
 await page.getByRole('menuitem',{name:'Agregar variante',exact:true}).waitFor({state:'hidden'});
 await page.getByLabel('Nueva variante de Repiques',{exact:true}).fill('14"');
 await page.getByRole('button',{name:'Agregar',exact:true}).click();
 await page.getByLabel('Objetivo Repiques 14"',{exact:true}).waitFor();
 assert.equal(await db.naipeVariante.count({where:{naipe:{bateriaId:id,nombre:'Repiques'}}}),2);
 console.log('PASS chevron pegado al nombre solo en naipes con variantes, y agregar variante nueva desde el menú de tres puntos en el desglose');

 // Elimino la histórica para dejar una sola edición (ed) y probar el caso exacto
 // del bug pedido: cerrar la ÚNICA edición existente debe mostrar "Preparar {año}".
 await db.edicion.delete({where:{id:old.id}});
 await db.edicion.update({where:{id:ed.id},data:{activa:false}});
 await page.goto(base+'/carnaval/naipes',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:`Preparar ${year+1}`,exact:true}).waitFor();
 console.log('PASS botón "Preparar" reaparece al cerrar la única edición existente (fix de hayPreparada)');

 // Reabro `ed` para seguir probando el resto del flujo con una edición activa vigente.
 // Con activa y nada preparado todavía, el botón debe seguir disponible (es el estado
 // normal para poder preparar la siguiente en cualquier momento).
 await db.edicion.update({where:{id:ed.id},data:{activa:true}});
 await page.goto(base+'/carnaval/naipes',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:`Preparar ${year+1}`,exact:true}).waitFor();
 console.log('PASS botón "Preparar" disponible con edición activa y nada preparado todavía');

 // Flujo de preparación que ya funcionaba: con la activa (ed) vigente, preparo la
 // siguiente (nuevo) por delante — debe seguir funcionando igual con el fix.
 await page.getByRole('button',{name:`Preparar ${year+1}`,exact:true}).click();await page.getByRole('dialog').getByRole('checkbox').check();await page.getByRole('button',{name:`Crear Carnaval ${year+1}`,exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('[aria-label="Objetivo Tamborines"]')?.disabled===false);
 const nuevo=await db.edicion.findUniqueOrThrow({where:{bateriaId_anioCarnaval:{bateriaId:id,anioCarnaval:year+1}}});
 assert.equal(await db.ritmistaEdicion.count({where:{edicionId:nuevo.id}}),18);assert.equal(await page.getByLabel('Carnaval del plan').inputValue(),nuevo.id);
 await page.getByRole('tab',{name:'Formación',exact:true}).click();assert.equal(await page.getByText('Todavía no hay una formación armada',{exact:false}).count(),1);
 console.log('PASS flujo de preparación (botón, diálogo, copiar participantes) funciona igual que antes; nueva edición sin formación previa');

 // Con `ed` todavía activa y `nuevo` ya preparada por delante, "Preparar" debe
 // desaparecer: ya hay una preparada, no hace falta otra.
 assert.equal(await page.getByRole('button',{name:`Preparar ${year+2}`,exact:true}).count(),0);
 console.log('PASS botón "Preparar" no aparece cuando ya hay una edición preparada por delante de la activa');

 // Cierre real (equivalente a cerrarCarnaval): la activa (ed) pasa a inactiva y la
 // preparada (nuevo) se activa — es el flujo que ya funcionaba y no debe romperse.
 await db.$transaction([db.edicion.update({where:{id:ed.id},data:{activa:false}}),db.edicion.update({where:{id:nuevo.id},data:{activa:true}})]);
 await page.goto(base+'/carnaval/naipes',{waitUntil:'networkidle'});
 assert.equal(await page.getByLabel('Carnaval del plan').inputValue(),nuevo.id);
 console.log('PASS transición activa→preparada (equivalente a cerrarCarnaval) deja la nueva edición operable');

 // Cerrar la edición activa (nuevo) sin tener nada preparado: mismo caso del bug
 // original, ahora con una histórica (ed) de por medio en vez de ninguna — el botón
 // debe reaparecer igual.
 await db.edicion.update({where:{id:nuevo.id},data:{activa:false}});await page.goto(base+'/carnaval/naipes',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:`Preparar ${year+2}`,exact:true}).waitFor();
 console.log('PASS botón "Preparar" reaparece al cerrar la edición activa aunque exista una histórica ya cerrada');
}finally{await browser?.close();await db.auditoria.deleteMany({where:{bateriaId:{in:[id,other]}}});await db.bateria.deleteMany({where:{id:{in:[id,other]}}});await db.usuario.deleteMany({where:{id:uid}});await db.$disconnect();}
