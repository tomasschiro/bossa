export type PlanNaipe = { nombre: string; objetivo: number | null; estado: "Pendiente" | "En trabajo" | "Listo"; x: number; y: number; columnas: number };
export function porcentajes(valores: number[]): number[] {
  const total = valores.reduce((a,b)=>a+b,0);
  if (!total) return valores.map(()=>0);
  const exactos=valores.map(v=>v*100/total), resultado=exactos.map(Math.floor);
  const orden=exactos.map((v,i)=>({i,resto:v-resultado[i]})).sort((a,b)=>b.resto-a.resto);
  const faltan=100-resultado.reduce((a,b)=>a+b,0);
  for(let n=0;n<faltan;n++) resultado[orden[n].i]++;
  return resultado;
}
export function validarPlan(value: unknown): value is PlanNaipe[] {
  if(!Array.isArray(value)||value.length>120) return false;
  const names=new Set<string>();
  return value.every(r=> {
    if(!r||typeof r.nombre!=="string"||!r.nombre.trim()||r.nombre.length>120||names.has(r.nombre)) return false;
    names.add(r.nombre);
    return (r.objetivo===null||(Number.isInteger(r.objetivo)&&r.objetivo>=0&&r.objetivo<=1000)) && ["Pendiente","En trabajo","Listo"].includes(r.estado) && Number.isInteger(r.x)&&r.x>=0&&r.x<=100 && Number.isInteger(r.y)&&r.y>=0&&r.y<=200 && Number.isInteger(r.columnas)&&r.columnas>=1&&r.columnas<=20;
  });
}
export function posiciones(bloque: PlanNaipe, cantidad: number) {
  return Array.from({length:cantidad},(_,i)=>({x:bloque.x+i%bloque.columnas,y:bloque.y+Math.floor(i/bloque.columnas)}));
}
export function contarSuperposiciones(bloques: { plan: PlanNaipe; cantidad: number }[]) {
  const ocupados=new Set<string>();let repetidos=0;
  for(const b of bloques) for(const p of posiciones(b.plan,b.cantidad)){const key=`${p.x}:${p.y}`;if(ocupados.has(key))repetidos++;ocupados.add(key);}
  return repetidos;
}

export function distribuirBloques(bloques: { plan: PlanNaipe; cantidad: number }[], ancho = 24): PlanNaipe[] {
  let x = 1, y = 1, alto = 0;
  return bloques.map(({plan,cantidad}) => {
    if (!cantidad) return {...plan,x:0,y:0};
    const columnas = Math.min(plan.columnas,cantidad);
    if (x + columnas > ancho) { x = 1; y += alto + 2; alto = 0; }
    const result = {...plan,x,y};
    x += columnas + 2;
    alto = Math.max(alto,Math.ceil(cantidad / plan.columnas));
    return result;
  });
}
