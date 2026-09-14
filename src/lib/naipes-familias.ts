import type { NaipeMeta } from "./naipes-plan-utils";

// Only known instrument families and their variant suffixes are consolidated.
// Free-form catalog names remain independent. El sufijo de variante puede ser
// num\u00e9rico ("12\"", "1ra") o alfab\u00e9tico (ej. una voz nombrada "Mor") \u2014 cualquier
// texto despu\u00e9s del nombre base y un espacio cuenta como variante del mismo naipe.
export function familiaNaipe(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  const normal = limpio.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const familias: [RegExp, string][] = [
    [/^(?:caixas?|caxias?)(?:\s.*)?$/, "Caixas"],
    [/^repiques?(?:\s.*)?$/, "Repiques"],
    [/^surdos?(?:\s.*)?$/, "Surdos"],
    [/^(?:tamborim|tamborins|tamborin|tamborines)(?:\s.*)?$/, "Tamborines"],
    [/^cuicas?(?:\s.*)?$/, "Cuicas"],
    [/^chocalhos?(?:\s.*)?$/, "Chocalho"],
    [/^frigideiras?(?:\s.*)?$/, "Frigideiras"],
  ];
  return familias.find(([pattern]) => pattern.test(normal))?.[1] ?? limpio;
}

export function unirMetas(metas: NaipeMeta[]): NaipeMeta[] {
  const familias = [...new Set(metas.map(p => familiaNaipe(p.nombre)))];
  return familias.map(nombre => {
    const grupo = metas.filter(p => familiaNaipe(p.nombre) === nombre);
    const principal = grupo.find(p => p.nombre === nombre) ?? grupo[0];
    // A configured family target is already the total. Otherwise retain the sum
    // of the explicitly configured variant targets, never counting it twice.
    const objetivos = grupo.filter(p => p.objetivo !== null);
    const objetivo = principal.nombre === nombre && principal.objetivo !== null
      ? principal.objetivo : objetivos.length ? objetivos.reduce((n,p) => n + p.objetivo!, 0) : null;
    const {desglose, ...principalSinDesglose} = principal;
    return desglose ? {...principalSinDesglose, nombre, objetivo, desglose} : {...principalSinDesglose, nombre, objetivo};
  });
}
