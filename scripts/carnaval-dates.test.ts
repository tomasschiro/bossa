import assert from 'node:assert/strict';
import { anioEnPreparacion } from '../src/lib/carnaval-utils';
assert.equal(anioEnPreparacion('2026-09-05'),2027);
assert.equal(anioEnPreparacion('2026-01-01'),2027);
console.log('PASS Año de preparación sugerido a partir de la fecha actual.');
