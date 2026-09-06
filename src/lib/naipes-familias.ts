import type { PlanNaipe } from "./naipes-plan-utils";

// Only known instrument families and size/voice suffixes are consolidated.
// Free-form catalog names remain independent.
export function familiaNaipe(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  const normal = limpio.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const familias: [RegExp, string][] = [
    [/^(?:caixas?|caxias?)(?:\s*\d.*)?$/, "Caixas"],
    [/^repiques?(?:\s*\d.*)?$/, "Repiques"],
    [/^surdos?(?:\s*\d.*)?$/, "Surdos"],
    [/^(?:tamborim|tamborins|tamborin|tamborines)(?:\s*\d.*)?$/, "Tamborins"],
    [/^cuicas?(?:\s*\d.*)?$/, "Cuicas"],
    [/^chocalhos?$/, "Chocalho"],
    [/^frigideiras?$/, "Frigideiras"],
  ];
  return familias.find(([pattern]) => pattern.test(normal))?.[1] ?? limpio;
}

export function unirPlanes(plan: PlanNaipe[]): PlanNaipe[] {
  const familias = [...new Set(plan.map(p => familiaNaipe(p.nombre)))];
  return familias.map(nombre => {
    const grupo = plan.filter(p => familiaNaipe(p.nombre) === nombre);
    const principal = grupo.find(p => p.nombre === nombre) ?? grupo[0];
    // A configured family target is already the total. Otherwise retain the sum
    // of the explicitly configured variant targets, never counting it twice.
    const objetivos = grupo.filter(p => p.objetivo !== null);
    const objetivo = principal.nombre === nombre && principal.objetivo !== null
      ? principal.objetivo : objetivos.length ? objetivos.reduce((n,p) => n + p.objetivo!, 0) : null;
    return {...principal, nombre, objetivo};
  });
}
