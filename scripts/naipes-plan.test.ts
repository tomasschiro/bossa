import assert from 'node:assert/strict';
import {porcentajes, validarMetas, validarFormacion, celdasMitad, contarSuperposiciones, tamanoSeccion, repartoMitades, filasSeccion, anchoSeccion, grillaVacia, grillaRedimensionada, grillaBooleanaRedimensionada, espejarGrilla, altoFormacion, desgloseDesbalanceado, nuevaSeccionId, type NaipeMeta, type Seccion} from '../src/lib/naipes-plan-utils';

assert.deepEqual(porcentajes([1,1,1]),[34,33,33]);assert.deepEqual(porcentajes([0,0]),[0,0]);
assert.equal(porcentajes([0,1,10,12,10,9,2]).reduce((a,b)=>a+b,0),100);

const meta:NaipeMeta={nombre:'Caixas',objetivo:55,estado:'Pendiente'};
assert(validarMetas([meta]));assert(!validarMetas([meta,meta]));assert(!validarMetas([{...meta,objetivo:-1}]));assert(!validarMetas([{...meta,estado:'Otro' as never}]));

// --- Desglose de Objetivo por variante (punto 2 de Ecualización) ---
assert(validarMetas([{...meta,desglose:{'12"':30,'14"':25}}])); // suma coincide con el objetivo, pero la validación de forma no lo exige
assert(validarMetas([{...meta,desglose:{'12"':10,'14"':10}}])); // forma válida aunque la suma no coincida: se informa, no se bloquea
assert(!validarMetas([{...meta,desglose:{'12"':-1}}])); // valores fuera de rango son inválidos
assert(!validarMetas([{...meta,desglose:{'12"':1.5}}]));
assert(!desgloseDesbalanceado({...meta,desglose:{'12"':30,'14"':25}})); // 55 === 55
assert(desgloseDesbalanceado({...meta,desglose:{'12"':10,'14"':10}})); // 20 !== 55
assert(!desgloseDesbalanceado({...meta,desglose:undefined})); // sin desglose cargado, nada que avisar
assert(!desgloseDesbalanceado({...meta,objetivo:null,desglose:{'12"':10}})); // sin objetivo definido, nada que comparar

const simple:Seccion={id:'tamborins',nombre:'Tamborins',naipes:['Tamborins'],grilla:[]};
// Grilla de "Cocina" (Caixa, Repique, Surdo intercalados a mano, 2 filas x 3 columnas):
const mezclada:Seccion={id:'cocina',nombre:'Cocina',naipes:['Caixa','Repique','Surdo'],grilla:[['Caixa','Repique','Surdo'],['Caixa','Repique','Surdo']]};
const formacionOk={anchoMitad:3,anchoPasillo:4,espejarDerecha:true,secciones:[simple,mezclada]};
assert(validarFormacion(formacionOk));
assert(!validarFormacion({...formacionOk,anchoMitad:0}));
assert(!validarFormacion({...formacionOk,secciones:[{...mezclada,grilla:[[1 as never]]}]}));
assert(validarFormacion({...formacionOk,secciones:[{...mezclada,grillaDerecha:[[null,'Caixa',null]]}]}));
assert(!validarFormacion({...formacionOk,secciones:[{...mezclada,grillaDerecha:[[1 as never]]}]}));

// --- Reparto entre mitades (punto 6: el total es de AMBAS mitades, hay que dividir por 2) ---
assert.deepEqual(repartoMitades(10),{izquierda:5,derecha:5});
assert.deepEqual(repartoMitades(25),{izquierda:13,derecha:12}); // impar: la izquierda se lleva la que sobra
assert.deepEqual(repartoMitades(0),{izquierda:0,derecha:0});

assert.equal(tamanoSeccion(mezclada,{Caixa:3,Repique:2,Surdo:1}),6);
// Ejemplo real de prueba: Caixas=50 (total, ambas mitades), ancho de mitad=4 ->
// filas = techo(50/2/4) = techo(6.25) = 7.
assert.equal(filasSeccion({...mezclada,naipes:['Caixas']},4,{Caixas:50}),7);
assert.equal(filasSeccion(mezclada,3,{Caixa:4,Repique:4,Surdo:4}),2); // total=12, /2=6, /3=2
assert.deepEqual(grillaVacia(2,3),[[null,null,null],[null,null,null]]);
assert.deepEqual(grillaRedimensionada([['Caixa',null]],2,3),[['Caixa',null,null],[null,null,null]]); // crece conservando lo pintado
assert.deepEqual(grillaRedimensionada([['Caixa','Repique','Surdo'],['Caixa',null,null]],1,3),[['Caixa','Repique','Surdo']]); // achica

// --- Espejo: idéntico para naipes normales, rota 1ra->2da->3ra->1ra solo para Surdo ---
assert.deepEqual(espejarGrilla([['Caixa','Repique','Surdo']]),[['Surdo','Repique','Caixa']]); // "Surdo" sin voz numérica: no rota, solo invierte orden
assert.deepEqual(espejarGrilla([['Surdo 1ra','Surdo 2da','Surdo 3ra']]),[['Surdo 3ra','Surdo 1ra','Surdo 2da']]); // invierte (3ra,2da,1ra) Y espeja cada voz: 3ra->3ra, 2da->1ra, 1ra->2da
assert.deepEqual(espejarGrilla([['Caixa 14"','Caixa 12"',null]]),[[null,'Caixa 12"','Caixa 14"']]); // Caixa con variantes: espeja idéntico, sin rotar
assert.equal(espejarGrilla([['Surdo 1ra']])[0][0],'Surdo 2da');
assert.equal(espejarGrilla([['Surdo 2da']])[0][0],'Surdo 1ra');
assert.equal(espejarGrilla([['Surdo 3ra']])[0][0],'Surdo 3ra');

const cantidades={Tamborins:10};
// Sección simple: el total (10) se reparte entre las dos mitades (5 y 5), con
// ancho=6 -> techo(10/2/6)=1 fila por mitad = 6 celdas generadas (5 pintadas + 1 vacía
// marcada, para que la fila entera quede visualmente marcada como parte de la sección).
const celdasSimple=celdasMitad([simple],6,cantidades,'izquierda',true);
assert.equal(celdasSimple.length,6);
assert.equal(celdasSimple.filter(c=>c.naipe).length,5);
assert.deepEqual(celdasSimple.filter(c=>c.naipe).map(c=>c.naipe),['Tamborins','Tamborins','Tamborins','Tamborins','Tamborins']);
assert.equal(celdasSimple.filter(c=>!c.naipe).length,1);
assert.equal(altoFormacion([simple],6,cantidades),1);

// Total impar (25): la izquierda se lleva 13, la derecha 12, pero ambas ocupan las
// mismas filas (techo(25/2/6)=3, 18 celdas generadas por mitad) — la derecha simplemente
// deja 1 celda vacía de más (marcada, no ausente).
const cantidadesImpar={Tamborins:25};
const izqImpar=celdasMitad([simple],6,cantidadesImpar,'izquierda',true);
const derImpar=celdasMitad([simple],6,cantidadesImpar,'derecha',true);
assert.equal(izqImpar.length,18);assert.equal(derImpar.length,18);
assert.equal(izqImpar.filter(c=>c.naipe).length,13);assert.equal(derImpar.filter(c=>c.naipe).length,12);
assert.equal(altoFormacion([simple],6,cantidadesImpar),3);

// La grilla ya pintada a mano se devuelve tal cual, sin repetición automática — celdas
// vacías incluidas (naipe: null), para poder pintarlas haciendo clic sobre el plano.
const izquierda=celdasMitad([mezclada],3,{},'izquierda',true);
assert.deepEqual(izquierda.map(c=>c.naipe),['Caixa','Repique','Surdo','Caixa','Repique','Surdo']);

// Espejo activado: la derecha refleja horizontalmente lo pintado a la izquierda.
const derechaEspejada=celdasMitad([mezclada],3,{},'derecha',true);
assert.deepEqual(derechaEspejada.map(c=>c.naipe),['Surdo','Repique','Caixa','Surdo','Repique','Caixa']);

// --- Casillero de la derecha desvinculado del espejo (con espejo activo) ---
// La celda (0,0) de la derecha (col 2 de la izquierda, "Surdo") se desvincula y se
// pinta a mano como "Caixa": el espejo sigue calculando el resto normalmente, pero
// esa celda puntual conserva "Caixa" en vez de recalcularse.
const mezcladaDesvinculada:Seccion={...mezclada,grillaDerecha:[['Caixa',null,null],[null,null,null]],desvinculadaDerecha:[[true,false,false],[false,false,false]]};
const derechaConDesvinculo=celdasMitad([mezcladaDesvinculada],3,{},'derecha',true);
assert.deepEqual(derechaConDesvinculo.map(c=>c.naipe),['Caixa','Repique','Caixa','Surdo','Repique','Caixa']);
// Repintar la celda correspondiente de la izquierda NO afecta la desvinculada: cambio
// Surdo->Tamborim en la izquierda, la celda desvinculada de la derecha sigue "Caixa".
const izquierdaRepintada:Seccion={...mezcladaDesvinculada,grilla:[['Caixa','Repique','Tamborim'],['Caixa','Repique','Surdo']]};
const derechaTrasRepintar=celdasMitad([izquierdaRepintada],3,{},'derecha',true);
assert.equal(derechaTrasRepintar[0].naipe,'Caixa','La celda desvinculada conserva su valor pese a que la izquierda cambió');
assert.equal(derechaTrasRepintar[1].naipe,'Repique');
// Revincular (desvinculadaDerecha en false) hace que vuelva a seguir el espejo con
// normalidad, tomando el valor actual de la izquierda.
const revinculada:Seccion={...izquierdaRepintada,desvinculadaDerecha:[[false,false,false],[false,false,false]]};
const derechaRevinculada=celdasMitad([revinculada],3,{},'derecha',true);
assert.equal(derechaRevinculada[0].naipe,'Tamborim','Tras revincular, la derecha vuelve a espejar la izquierda actual');

assert.deepEqual(grillaBooleanaRedimensionada([[true,false]],2,3),[[true,false,false],[false,false,false]]);
assert.deepEqual(grillaBooleanaRedimensionada([[true,true,true],[false,false,false]],1,3),[[true,true,true]]);

// La desvinculación aplica igual a la regla especial de Surdo: mientras esté
// desvinculada, ni el espejo idéntico ni el intercambio 1ra<->2da la tocan; al
// revincular, vuelve a aplicar la regla de Surdo con normalidad.
const seccionSurdo:Seccion={id:'fondo',nombre:'Fondo',naipes:['Surdo','Caixa'],grilla:[['Surdo 1ra']],grillaDerecha:[['Surdo 3ra']],desvinculadaDerecha:[[true]]};
assert.equal(celdasMitad([seccionSurdo],1,{},'derecha',true)[0].naipe,'Surdo 3ra','Desvinculada: conserva "3ra" sin importar la regla de Surdo');
const seccionSurdoRevinculada:Seccion={...seccionSurdo,desvinculadaDerecha:[[false]]};
assert.equal(celdasMitad([seccionSurdoRevinculada],1,{},'derecha',true)[0].naipe,'Surdo 2da','Revinculada: vuelve a aplicar la regla de Surdo (1ra espeja como 2da)');

// Espejo desactivado sin grillaDerecha pintada: la derecha queda vacía, pero con
// celdas (null) generadas para poder pintarla directo — no se infiere contenido.
const derechaSinPintar=celdasMitad([mezclada],3,{},'derecha',false);
assert.equal(derechaSinPintar.length,6);
assert(derechaSinPintar.every(c=>c.naipe===null));

// Espejo desactivado con grillaDerecha pintada aparte: se usa tal cual, sin relación con la izquierda.
const mezcladaConDerecha:Seccion={...mezclada,grillaDerecha:[['Surdo',null,'Caixa'],[null,null,null]]};
const derechaPropia=celdasMitad([mezcladaConDerecha],3,{},'derecha',false);
assert.deepEqual(derechaPropia.filter(c=>c.naipe).map(c=>({x:c.x,y:c.y,naipe:c.naipe})),[{x:0,y:0,naipe:'Surdo'},{x:2,y:0,naipe:'Caixa'}]);

assert.equal(contarSuperposiciones([{x:0,y:0},{x:0,y:0}]),1);
assert.equal(contarSuperposiciones([{x:0,y:0},{x:1,y:0}]),0);

assert.equal(nuevaSeccionId([],'Cocina'),'cocina');
assert.equal(nuevaSeccionId([simple,mezclada],'Cocina'),'cocina-2');

// --- Ancho de columnas propio por sección (independiente del ancho general) ---
assert.equal(anchoSeccion(mezclada,6),6); // sin ancho propio, usa el general
assert.equal(anchoSeccion({...mezclada,ancho:3},6),3); // con ancho propio, lo usa
assert(!validarFormacion({...formacionOk,secciones:[{...mezclada,ancho:0}]})); // ancho propio fuera de rango
assert(!validarFormacion({...formacionOk,secciones:[{...mezclada,ancho:1.5 as never}]}));
assert(validarFormacion({...formacionOk,secciones:[{...mezclada,ancho:3}]}));

// Surdos con ancho propio=3 dentro de una mitad general de ancho 6: sus filas se
// calculan con SU propio ancho, no con el general — techo(12/2/3)=2, no techo(12/2/6)=1.
const surdosAngosto:Seccion={id:'surdos',nombre:'Surdos',naipes:['Surdo1','Surdo2'],grilla:[],ancho:3};
assert.equal(filasSeccion(surdosAngosto,6,{Surdo1:6,Surdo2:6}),2);
assert.equal(filasSeccion({...surdosAngosto,ancho:undefined},6,{Surdo1:6,Surdo2:6}),1); // sin ancho propio, vuelve a usar el general

// El armado de celdas también respeta el ancho propio: 2 filas x 3 columnas = 6
// celdas por mitad, no 1 fila x 6 columnas.
const seccionAnchoPropio:Seccion={id:'fondo2',nombre:'Fondo2',naipes:['A','B'],ancho:3,grilla:[['A','B','A'],['B',null,null]]};
const celdasAnchoPropio=celdasMitad([seccionAnchoPropio],6,{},'izquierda',true);
assert.equal(celdasAnchoPropio.length,6);
assert.equal(Math.max(...celdasAnchoPropio.map(c=>c.x)),2); // nunca supera su propio ancho-1, no el general (5)

// --- Filas fijadas a mano (independiente del ancho general/propio) ---
// Con filas fijas, el ANCHO se recalcula solo a partir de esas filas: total=24 (2
// naipes x 12), repartido entre las 2 mitades = 12 por mitad. Con filas=3 fijas,
// ancho = techo(12/3) = 4 (no importa qué ancho general o propio tenga la mitad).
const seccionFilasFijas:Seccion={id:'fondo3',nombre:'Fondo3',naipes:['A','B'],grilla:[],filas:3};
assert.equal(anchoSeccion(seccionFilasFijas,6,{A:12,B:12}),4);
assert.equal(filasSeccion(seccionFilasFijas,6,{A:12,B:12}),3); // devuelve la fija tal cual
// Sin filas fijas, vuelve al comportamiento de siempre (ancho general o propio).
assert.equal(anchoSeccion({...seccionFilasFijas,filas:undefined},6,{A:12,B:12}),6);
assert.equal(filasSeccion({...seccionFilasFijas,filas:undefined},6,{A:12,B:12}),2); // techo(24/2/6)=2

// El armado de celdas respeta las filas fijas: 3 filas x 4 columnas = 12 celdas por
// mitad (no 2 filas x 6 columnas, que sería el cálculo automático).
const celdasFilasFijas=celdasMitad([{...seccionFilasFijas,grilla:grillaVacia(3,4)}],6,{A:12,B:12},'izquierda',true);
assert.equal(celdasFilasFijas.length,12);
assert.equal(Math.max(...celdasFilasFijas.map(c=>c.y)),2); // 3 filas: y va de 0 a 2

// Validación de forma: filas fuera de rango o no entero son inválidas.
assert(!validarFormacion({...formacionOk,secciones:[{...mezclada,filas:0}]}));
assert(!validarFormacion({...formacionOk,secciones:[{...mezclada,filas:1.5 as never}]}));
assert(validarFormacion({...formacionOk,secciones:[{...mezclada,filas:5}]}));

console.log('PASS porcentajes, validación, desglose por variante, reparto entre mitades, filas dinámicas y fijadas a mano, ancho propio por sección, espejo (intercambio 1ra<->2da de Surdo, 3ra idéntica) y superposiciones.');
