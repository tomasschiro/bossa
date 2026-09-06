"use server";
import { familiaNaipe, unirPlanes } from "./naipes-familias";
import { prisma } from "./prisma";
import { requireBateria } from "./session";
import { anioEnPreparacion } from "./carnaval-utils";
import { revalidatePath } from "next/cache";
import { distribuirBloques, validarPlan, type PlanNaipe } from "./naipes-plan-utils";
export async function getPlanNaipes(edicionId?: string) {
  const {bateriaId}=await requireBateria();
  const [ediciones,naipes]=await Promise.all([prisma.edicion.findMany({where:{bateriaId},orderBy:{anioCarnaval:"desc"}}),prisma.naipe.findMany({where:{bateriaId},orderBy:{orden:"asc"}})]);
  const edicion=edicionId?ediciones.find(e=>e.id===edicionId):ediciones.find(e=>e.activa)??ediciones[0];
  if(edicionId&&!edicion)throw new Error("Edición no disponible");
  const anterior=edicion?ediciones.find(e=>e.anioCarnaval<edicion.anioCarnaval):undefined;
  const [actuales,previos]=await Promise.all([
    edicion?prisma.ritmistaEdicion.findMany({where:{edicionId:edicion.id,edicion:{bateriaId},ritmista:{bateriaId}},select:{naipe:true,estadoLlegada:true,ritmista:{select:{id:true,nombre:true,apellido:true,nivel:true,telefono:true}}}}):[],
    anterior?prisma.ritmistaEdicion.groupBy({by:["naipe"],where:{edicionId:anterior.id,edicion:{bateriaId},ritmista:{bateriaId}},_count:{_all:true}}):[],
  ]);
  const saved=edicion?.planNaipes;const plan=validarPlan(saved)?unirPlanes(saved):[];
  const nombres=[...new Set([...naipes.map(n=>n.nombre),...actuales.map(r=>r.naipe),...previos.map(r=>r.naipe),...plan.map(r=>r.nombre)].map(familiaNaipe))];
  let nextY=0;
  const rows=nombres.map(nombre=>{const cantidad=actuales.filter(r=>familiaNaipe(r.naipe)===nombre).length;const p=plan.find(r=>r.nombre===nombre)??{nombre,objetivo:null,estado:"Pendiente" as const,x:0,y:Math.min(nextY,200),columnas:4};nextY+=Math.ceil(Math.max(cantidad,p.objetivo??0,1)/p.columnas)+2;return {nombre,integrantes:actuales.filter(r=>familiaNaipe(r.naipe)===nombre).map(r=>({...r.ritmista,naipe:r.naipe,estado:r.estadoLlegada})).sort((a,b)=>`${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`,"es")),actual:cantidad,confirmados:actuales.filter(r=>familiaNaipe(r.naipe)===nombre&&r.estadoLlegada==="Confirmado").length,anterior:previos.filter(r=>familiaNaipe(r.naipe)===nombre).reduce((n,r)=>n+r._count._all,0),plan:p};});
  if (!plan.length) { const distribucion=distribuirBloques(rows.map(r=>({plan:r.plan,cantidad:r.actual}))); rows.forEach((r,i)=>{r.plan=distribucion[i];}); }
  const activa=ediciones.find(e=>e.activa);
  const hayPreparada=ediciones.some(e=>!e.activa&&(!activa||e.anioCarnaval>activa.anioCarnaval));
  return {hayAbierta:ediciones.some(e=>e.activa),hayPreparada,proximoAnio:Math.max(anioEnPreparacion(),...ediciones.map(e=>e.anioCarnaval+1)),ediciones:ediciones.map(e=>({id:e.id,anio:e.anioCarnaval,abierta:e.activa})),edicion:edicion?{id:edicion.id,anio:edicion.anioCarnaval,abierta:edicion.activa}:null,anterior:anterior?.anioCarnaval??null,rows};
}
export async function guardarPlanNaipes(edicionId: string, plan: PlanNaipe[]) {
  const {bateriaId,user}=await requireBateria();
  if(!validarPlan(plan))return {error:"Revisá las metas y posiciones: metas entre 0 y 1000, columnas entre 1 y 20."};
  plan = unirPlanes(plan);
  if(!validarPlan(plan)) return {error:"La suma de objetivos por naipe no puede superar 1000."};
  await prisma.$transaction(async tx=>{
    await tx.edicion.update({where:{id:edicionId,bateriaId},data:{planNaipes:plan}});
    await tx.auditoria.create({data:{bateriaId,usuarioId:user.id,registradoPor:user.name,accion:"guardarPlanNaipes",entidadId:edicionId,datos:{plan}}});
  });
  revalidatePath("/naipes");revalidatePath("/carnaval/naipes");return {ok:true};
}
