import assert from 'node:assert/strict';
import {porcentajes, validarPlan, posiciones, contarSuperposiciones, type PlanNaipe} from '../src/lib/naipes-plan-utils';
assert.deepEqual(porcentajes([1,1,1]),[34,33,33]);assert.deepEqual(porcentajes([0,0]),[0,0]);
assert.equal(porcentajes([0,1,10,12,10,9,2]).reduce((a,b)=>a+b,0),100);
const p:PlanNaipe={nombre:'Caixas',objetivo:55,estado:'Pendiente',x:2,y:3,columnas:4};
assert(validarPlan([p]));assert(!validarPlan([p,p]));assert(!validarPlan([{...p,objetivo:-1}]));assert(!validarPlan([{...p,columnas:0}]));assert(!validarPlan([{...p,x:101}]));
assert.deepEqual(posiciones(p,5).at(-1),{x:2,y:4});assert.equal(contarSuperposiciones([{plan:p,cantidad:5},{plan:{...p,nombre:'Otro'},cantidad:2}]),2);assert.equal(contarSuperposiciones([{plan:p,cantidad:5},{plan:{...p,y:10},cantidad:2}]),0);
console.log('PASS porcentajes exactos, validación de metas y coordenadas, filas incompletas y superposiciones.');
