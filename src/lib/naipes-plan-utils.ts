export type NaipeMeta = { nombre: string; objetivo: number | null; estado: "Pendiente" | "En trabajo" | "Listo"; desglose?: Record<string, number> };

// Una sección simple (un solo naipe) no necesita grilla: se llena automático.
// Una sección mezclada guarda la grilla pintada a mano (lado izquierdo, o único lado
// si se espeja), fila por fila, con la variante real de instrumento (ej. "Surdo 1ra")
// en cada celda, o null si está vacía. `grillaDerecha` tiene dos usos según el modo:
// - Sin espejo (espejarDerecha=false): grilla completa e independiente de la derecha,
//   pintada aparte por el director.
// - Con espejo (espejarDerecha=true): capa de overrides puntuales — solo las celdas
//   marcadas como desvinculadas en `desvinculadaDerecha` (misma forma que `grilla`)
//   usan el valor guardado acá; el resto de la derecha se sigue calculando por espejo
//   a partir de `grilla`. Una celda desvinculada deja de actualizarse cuando se
//   repinta su correspondiente de la izquierda, hasta que el director la revincula.
// `ancho` es el ancho de columnas propio de la sección; si no está definido, usa el
// ancho general de la mitad (`FormacionPlan.anchoMitad`). Se alinea siempre a la
// izquierda dentro de la mitad, igual que las demás secciones. `filas` fija la
// cantidad de filas a mano en vez de calcularla del ancho: cuando está definida,
// `ancho` deja de usarse para el cálculo — es al revés, el ancho de columnas se
// deriva de cuántas filas se fijaron (ver `anchoEfectivoSeccion`/`filasSeccion`).
export type Seccion = { id: string; nombre: string; naipes: string[]; grilla: (string | null)[][]; grillaDerecha?: (string | null)[][]; desvinculadaDerecha?: boolean[][]; ancho?: number; filas?: number };

export type FormacionPlan = { anchoMitad: number; anchoPasillo: number; espejarDerecha: boolean; secciones: Seccion[] };

const SECCION_ID = /^[a-z0-9-]{1,40}$/;

export function porcentajes(valores: number[]): number[] {
  const total = valores.reduce((a,b)=>a+b,0);
  if (!total) return valores.map(()=>0);
  const exactos=valores.map(v=>v*100/total), resultado=exactos.map(Math.floor);
  const orden=exactos.map((v,i)=>({i,resto:v-resultado[i]})).sort((a,b)=>b.resto-a.resto);
  const faltan=100-resultado.reduce((a,b)=>a+b,0);
  for(let n=0;n<faltan;n++) resultado[orden[n].i]++;
  return resultado;
}

export function validarMetas(value: unknown): value is NaipeMeta[] {
  if(!Array.isArray(value)||value.length>120) return false;
  const names=new Set<string>();
  return value.every(r=> {
    if(!r||typeof r.nombre!=="string"||!r.nombre.trim()||r.nombre.length>120||names.has(r.nombre)) return false;
    names.add(r.nombre);
    if(!((r.objetivo===null||(Number.isInteger(r.objetivo)&&r.objetivo>=0&&r.objetivo<=1000)) && ["Pendiente","En trabajo","Listo"].includes(r.estado))) return false;
    if(r.desglose===undefined) return true;
    if(typeof r.desglose!=="object"||r.desglose===null||Array.isArray(r.desglose)) return false;
    const entradas=Object.entries(r.desglose as Record<string,unknown>);
    if(entradas.length>20) return false;
    return entradas.every(([k,v])=>typeof k==="string"&&k.trim()&&k.length<=30&&Number.isInteger(v)&&(v as number)>=0&&(v as number)<=1000);
  });
}

/** El desglose por variante de un naipe (punto 2 de Ecualización) debe sumar exactamente
 * el Objetivo total del naipe. Se conserva tal cual el director lo cargó incluso si deja
 * de coincidir (ej. bajó el Objetivo después) — se informa el desajuste, no se reescala
 * ni se borra solo. Sin desglose cargado, o sin Objetivo definido, no hay nada que validar. */
export function desgloseDesbalanceado(meta: NaipeMeta): boolean {
  if(!meta.desglose||meta.objetivo===null) return false;
  const suma=Object.values(meta.desglose).reduce((a,b)=>a+b,0);
  return suma!==meta.objetivo;
}

export function validarFormacion(value: unknown): value is FormacionPlan {
  if(!value||typeof value!=="object") return false;
  const v=value as Record<string,unknown>;
  if(!Number.isInteger(v.anchoMitad)||(v.anchoMitad as number)<1||(v.anchoMitad as number)>40) return false;
  if(!Number.isInteger(v.anchoPasillo)||(v.anchoPasillo as number)<0||(v.anchoPasillo as number)>20) return false;
  if(typeof v.espejarDerecha!=="boolean") return false;
  if(!Array.isArray(v.secciones)||v.secciones.length>60) return false;
  const ids=new Set<string>();
  return v.secciones.every(s=> {
    if(!s||typeof s.id!=="string"||!SECCION_ID.test(s.id)||ids.has(s.id)) return false;
    ids.add(s.id);
    if(typeof s.nombre!=="string"||!s.nombre.trim()||s.nombre.length>60) return false;
    if(!Array.isArray(s.naipes)||!s.naipes.length||s.naipes.length>12) return false;
    if(!s.naipes.every((n:unknown)=>typeof n==="string"&&n.trim())) return false;
    if(s.ancho!==undefined&&!(Number.isInteger(s.ancho)&&(s.ancho as number)>=1&&(s.ancho as number)<=40)) return false;
    if(s.filas!==undefined&&!(Number.isInteger(s.filas)&&(s.filas as number)>=1&&(s.filas as number)<=200)) return false;
    const esGrillaValida=(g:unknown)=>Array.isArray(g)&&g.length<=200&&g.every((fila:unknown)=>Array.isArray(fila)&&fila.length<=40&&fila.every((c:unknown)=>c===null||typeof c==="string"));
    if(!esGrillaValida(s.grilla)) return false;
    if(s.grillaDerecha!==undefined&&!esGrillaValida(s.grillaDerecha)) return false;
    const esGrillaBooleana=(g:unknown)=>Array.isArray(g)&&g.length<=200&&g.every((fila:unknown)=>Array.isArray(fila)&&fila.length<=40&&fila.every((c:unknown)=>typeof c==="boolean"));
    return s.desvinculadaDerecha===undefined||esGrillaBooleana(s.desvinculadaDerecha);
  });
}

/** Total de posiciones de una sección (ambas mitades): suma de cantidades de sus naipes. */
export function tamanoSeccion(seccion: Seccion, cantidadPorNaipe: Record<string,number>): number {
  return seccion.naipes.reduce((n,nombre)=>n+(cantidadPorNaipe[nombre]??0),0);
}

/** Cuántas de las `total` posiciones de una sección/naipe le tocan a cada mitad. El
 * total se reparte por la mitad; si es impar, la izquierda se lleva la que sobra. */
export function repartoMitades(total: number): { izquierda: number; derecha: number } {
  return { izquierda: Math.ceil(total / 2), derecha: Math.floor(total / 2) };
}

/**
 * Cantidad de filas que necesita UNA mitad de una sección mezclada. Si el director
 * fijó `filas` a mano, se usa tal cual (el ancho se recalcula a partir de esto, ver
 * `anchoSeccion`). Si no, se calcula sola a partir del total de la sección (repartido
 * entre las dos mitades) y su ancho de columnas — techo(total/2/ancho): la mitad con
 * 1 posición más nunca necesita una fila extra frente a la otra.
 */
export function filasSeccion(seccion: Seccion, anchoMitad: number, cantidadPorNaipe: Record<string,number>): number {
  if (seccion.filas !== undefined) return Math.max(1, seccion.filas);
  const ancho = seccion.ancho ?? anchoMitad;
  return Math.ceil(tamanoSeccion(seccion, cantidadPorNaipe) / 2 / Math.max(1, ancho));
}

/**
 * Ancho de columnas efectivo de una sección. Si el director fijó `filas` a mano, el
 * ancho deja de ser una entrada manual: se deriva de cuántas columnas hacen falta
 * para que el total de la sección (repartido entre las dos mitades) entre en esa
 * cantidad de filas — techo(total/2/filas), la inversa exacta de `filasSeccion`. Si
 * no hay `filas` fijas, es el ancho propio de la sección o, si no definió ninguno, el
 * general de la mitad. Todas las secciones se alinean a la izquierda dentro de la
 * mitad, así que ninguna necesita saber su offset — solo su propio ancho.
 */
export function anchoSeccion(seccion: Seccion, anchoMitad: number, cantidadPorNaipe: Record<string,number> = {}): number {
  if (seccion.filas !== undefined) {
    return Math.max(1, Math.ceil(tamanoSeccion(seccion, cantidadPorNaipe) / 2 / Math.max(1, seccion.filas)));
  }
  return seccion.ancho ?? anchoMitad;
}

/** Grilla vacía de `filas x ancho`, todas las celdas sin pintar. */
export function grillaVacia(filas: number, ancho: number): (string | null)[][] {
  return Array.from({length: Math.max(0, filas)}, () => Array.from({length: ancho}, () => null));
}

const ORDEN_SURDO = ["1ra", "2da", "3ra"];
// Mapeo fijo del espejo de Surdo: 1ra y 2da se intercambian entre sí, 3ra queda
// idéntica. No es un ciclo — reemplaza explícitamente cada voz por su espejo, sin
// fórmula (voz+1)%3 (esa fórmula solo daba el resultado correcto para 1ra por
// casualidad; 2da y 3ra quedaban mal).
const ESPEJO_SURDO: Record<string, string> = { "1ra": "2da", "2da": "1ra", "3ra": "3ra" };

/** Detecta si una variante pintada es un Surdo con voz 1ra/2da/3ra (ej. "Surdo 1ra"). */
function vozSurdo(variante: string): number {
  const normal = variante.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!/^surdos?\b/.test(normal)) return -1;
  return ORDEN_SURDO.findIndex(voz => normal.includes(voz));
}

/**
 * Refleja una grilla horizontalmente (invierte cada fila) para el lado espejado. Los
 * Surdos son un caso especial: en vez de copiar la misma voz, el espejo intercambia
 * 1ra↔2da (3ra queda idéntica), porque así se tocan en la práctica de lado a lado.
 * Cualquier otro naipe (incluidas sus variantes) espeja idéntico, sin rotar.
 */
export function espejarGrilla(grilla: (string | null)[][]): (string | null)[][] {
  return grilla.map(fila => [...fila].reverse().map(variante => {
    if (!variante) return variante;
    const voz = vozSurdo(variante);
    if (voz < 0) return variante;
    const espejo = ESPEJO_SURDO[ORDEN_SURDO[voz]];
    return variante.replace(new RegExp(ORDEN_SURDO[voz], "i"), espejo);
  }));
}

/** Redimensiona una grilla a `filas x ancho`, conservando lo ya pintado que entre en
 * el nuevo tamaño. Se usa para que el plano crezca o achique al cambiar el ancho de
 * mitad, el modo Actual/Objetivo, o la composición de una sección, sin perder lo
 * pintado a mano que sigue siendo válido. */
export function grillaRedimensionada(grilla: (string | null)[][], filas: number, ancho: number): (string | null)[][] {
  const base = grillaVacia(filas, ancho);
  for (let f = 0; f < Math.min(filas, grilla.length); f++) {
    for (let c = 0; c < Math.min(ancho, grilla[f]?.length ?? 0); c++) base[f][c] = grilla[f][c];
  }
  return base;
}

/** Igual que `grillaRedimensionada`, para la grilla booleana de celdas desvinculadas
 * del espejo (`desvinculadaDerecha`) — conserva qué celdas seguían ancladas al cambiar
 * el tamaño de la sección. */
export function grillaBooleanaRedimensionada(grilla: boolean[][], filas: number, ancho: number): boolean[][] {
  const base: boolean[][] = Array.from({length: Math.max(0, filas)}, () => Array.from({length: ancho}, () => false));
  for (let f = 0; f < Math.min(filas, grilla.length); f++) {
    for (let c = 0; c < Math.min(ancho, grilla[f]?.length ?? 0); c++) base[f][c] = grilla[f][c];
  }
  return base;
}

/**
 * Celdas de una mitad: recorre secciones de adelante hacia atrás (fila 0 en adelante).
 * Una sección simple (un solo naipe) se llena automático según la cantidad que le toca
 * a ESTA mitad (el total se reparte entre las dos, ver `repartoMitades`) — siempre
 * "pintada", nunca queda vacía. Una sección mezclada usa la grilla pintada a mano tal
 * cual está guardada — sin generar ni repetir nada — e incluye también sus celdas
 * vacías (`naipe: null`) para que puedan pintarse haciendo clic sobre el plano. `lado`
 * distingue la mitad izquierda (siempre `grilla`) de la derecha, que usa `grilla`
 * reflejada si el plan espeja, o su propia `grillaDerecha` pintada aparte si no.
 */
export function celdasMitad(secciones: Seccion[], anchoMitad: number, cantidadPorNaipe: Record<string,number>, lado: "izquierda" | "derecha", espejarDerecha: boolean) {
  const celdas: { x: number; y: number; seccionId: string; naipe: string | null; fila: number; col: number }[] = [];
  let y = 0;
  for (const seccion of secciones) {
    const ancho = anchoSeccion(seccion, anchoMitad, cantidadPorNaipe);
    if (seccion.naipes.length === 1) {
      const totalCompleto = cantidadPorNaipe[seccion.naipes[0]] ?? 0;
      const reparto = repartoMitades(totalCompleto);
      const total = lado === "izquierda" ? reparto.izquierda : reparto.derecha;
      // Ambas mitades ocupan las mismas filas (techo(total/2/ancho)), aunque el
      // reparto no sea exacto: la que tiene 1 menos deja su última celda vacía, en
      // vez de una fila entera de diferencia entre los dos lados. Se generan también
      // las posiciones que sobran hasta completar la grilla (naipe: null, igual que en
      // las secciones mezcladas) para que la fila entera quede marcada como parte de
      // la sección — sin esto, una sección con pocos integrantes se ve como un
      // cuadradito perdido en una fila vacía, dando la sensación de que no se dibujó.
      const filas = Math.ceil(totalCompleto / 2 / Math.max(1, ancho));
      if (!filas) continue;
      for (let i = 0; i < filas * ancho; i++) {
        celdas.push({ x: i % ancho, y: y + Math.floor(i / ancho), seccionId: seccion.id, naipe: i < total ? seccion.naipes[0] : null, fila: Math.floor(i / ancho), col: i % ancho });
      }
      y += filas;
      continue;
    }
    // Con espejo activo, las celdas desvinculadas (marcadas en `desvinculadaDerecha`)
    // no se recalculan del espejo: conservan el valor que el director fijó a mano en
    // `grillaDerecha`, así que se aplican como overrides puntuales sobre la grilla
    // espejada en vez de reemplazarla entera (a diferencia del modo sin espejo, donde
    // `grillaDerecha` es la grilla completa e independiente de siempre).
    const grilla = lado === "izquierda" ? seccion.grilla
      : espejarDerecha ? espejarGrilla(seccion.grilla).map((fila, f) => fila.map((variante, c) =>
          seccion.desvinculadaDerecha?.[f]?.[c] ? (seccion.grillaDerecha?.[f]?.[c] ?? null) : variante))
      : (seccion.grillaDerecha ?? grillaVacia(seccion.grilla.length, ancho));
    grilla.forEach((fila, filaIdx) => {
      fila.forEach((variante, x) => {
        celdas.push({ x, y: y + filaIdx, seccionId: seccion.id, naipe: variante, fila: filaIdx, col: x });
      });
    });
    y += grilla.length;
  }
  return celdas;
}

export function contarSuperposiciones(celdas: { x: number; y: number }[]) {
  const ocupados = new Set<string>(); let repetidos = 0;
  for (const c of celdas) { const key = `${c.x}:${c.y}`; if (ocupados.has(key)) repetidos++; ocupados.add(key); }
  return repetidos;
}

export function altoFormacion(secciones: Seccion[], anchoMitad: number, cantidadPorNaipe: Record<string,number>): number {
  let y = 0;
  for (const seccion of secciones) {
    if (seccion.naipes.length === 1) {
      const total = cantidadPorNaipe[seccion.naipes[0]] ?? 0;
      if (total) y += filasSeccion(seccion, anchoMitad, cantidadPorNaipe);
      continue;
    }
    y += seccion.grilla.length;
  }
  return y;
}

export function nuevaSeccionId(existentes: { id: string }[], base: string): string {
  const slug = base.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,30) || "seccion";
  let id = slug, n = 2;
  const ids = new Set(existentes.map(s=>s.id));
  while (ids.has(id)) { id = `${slug}-${n}`; n++; }
  return id;
}

export function formacionVacia(): FormacionPlan {
  return { anchoMitad: 8, anchoPasillo: 4, espejarDerecha: true, secciones: [] };
}
