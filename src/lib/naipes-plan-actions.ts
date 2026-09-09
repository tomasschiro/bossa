"use server";
import { familiaNaipe, unirMetas } from "./naipes-familias";
import { prisma } from "./prisma";
import { requireBateria } from "./session";
import { anioEnPreparacion } from "./carnaval-utils";
import { revalidatePath } from "next/cache";
import { validarMetas, validarFormacion, formacionVacia, type NaipeMeta, type FormacionPlan } from "./naipes-plan-utils";

type Guardado = { metas: NaipeMeta[]; formacion: FormacionPlan };

function leerGuardado(saved: unknown): Guardado {
  const value = saved && typeof saved === "object" ? saved as Record<string, unknown> : {};
  const metas = validarMetas(value.metas) ? unirMetas(value.metas) : [];
  const formacion = validarFormacion(value.formacion) ? value.formacion : formacionVacia();
  return { metas, formacion };
}

export async function getPlanNaipes(edicionId?: string) {
  const {bateriaId}=await requireBateria();
  const [ediciones,naipes,instrumentos]=await Promise.all([
    prisma.edicion.findMany({where:{bateriaId},orderBy:{anioCarnaval:"desc"}}),
    prisma.naipe.findMany({where:{bateriaId},orderBy:{orden:"asc"},include:{variantes:{orderBy:[{orden:"asc"},{id:"asc"}]}}}),
    prisma.instrumento.findMany({where:{bateriaId,estado:{in:["Bueno","Regular"]}},select:{tipo:true,cantidad:true}}),
  ]);
  const edicion=edicionId?ediciones.find(e=>e.id===edicionId):ediciones.find(e=>e.activa)??ediciones[0];
  if(edicionId&&!edicion)throw new Error("Edición no disponible");
  const anterior=edicion?ediciones.find(e=>e.anioCarnaval<edicion.anioCarnaval):undefined;
  const [actuales,previos]=await Promise.all([
    edicion?prisma.ritmistaEdicion.findMany({where:{edicionId:edicion.id,edicion:{bateriaId},ritmista:{bateriaId}},select:{naipe:true,estadoLlegada:true,ritmista:{select:{id:true,nombre:true,apellido:true,nivel:true,telefono:true}}}}):[],
    anterior?prisma.ritmistaEdicion.groupBy({by:["naipe"],where:{edicionId:anterior.id,edicion:{bateriaId},ritmista:{bateriaId}},_count:{_all:true}}):[],
  ]);
  const {metas,formacion}=leerGuardado(edicion?.planNaipes);
  const nombres=[...new Set([...naipes.map(n=>n.nombre),...actuales.map(r=>r.naipe),...previos.map(r=>r.naipe),...metas.map(r=>r.nombre)].map(familiaNaipe))];
  const rows=nombres.map(nombre=>{const cantidad=actuales.filter(r=>familiaNaipe(r.naipe)===nombre).length;const meta=metas.find(r=>r.nombre===nombre)??{nombre,objetivo:null,estado:"Pendiente" as const};return {nombre,integrantes:actuales.filter(r=>familiaNaipe(r.naipe)===nombre).map(r=>({...r.ritmista,naipe:r.naipe,estado:r.estadoLlegada})).sort((a,b)=>`${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`,"es")),actual:cantidad,confirmados:actuales.filter(r=>familiaNaipe(r.naipe)===nombre&&r.estadoLlegada==="Confirmado").length,anterior:previos.filter(r=>familiaNaipe(r.naipe)===nombre).reduce((n,r)=>n+r._count._all,0),plan:meta};});
  // Variantes del catálogo de Naipes (gestionadas desde Base de Datos → Naipes), la
  // fuente única para el desglose de Objetivo en Ecualización y para el selector de dos
  // pasos al pintar en Formación — reemplaza el texto libre de ritmistas para pintar.
  const catalogoVariantes: Record<string, string[]> = {};
  // ID real del naipe de catálogo detrás de cada nombre de familia — permite agregar una
  // variante nueva directo desde Ecualización sin ir a la pantalla de Naipes.
  const naipeIdPorNombre: Record<string, string> = {};
  for (const naipe of naipes) {
    const nombre = familiaNaipe(naipe.nombre);
    catalogoVariantes[nombre] = [...(catalogoVariantes[nombre] ?? []), ...naipe.variantes.map(v => v.nombre)];
    naipeIdPorNombre[nombre] ??= naipe.id;
  }
  // Instrumentos disponibles por naipe (estado Bueno o Regular), mismo criterio que
  // ecualización: para avisar faltante de instrumentos cuando se usa Objetivo.
  const instrumentosPorNaipe: Record<string, number> = {};
  for (const nombre of nombres) instrumentosPorNaipe[nombre] = 0;
  for (const inst of instrumentos) {
    const nombre = familiaNaipe(inst.tipo);
    instrumentosPorNaipe[nombre] = (instrumentosPorNaipe[nombre] ?? 0) + inst.cantidad;
  }
  // "Preparada" = hay una edición activa Y otra edición inactiva más nueva que ella
  // (preparada por delante mientras la actual sigue vigente). Sin edición activa no
  // hay nada "por delante" que comparar: cerrar la única edición existente no la
  // convierte en preparada, aunque quede inactiva.
  const activa=ediciones.find(e=>e.activa);
  const hayPreparada=!!activa&&ediciones.some(e=>!e.activa&&e.anioCarnaval>activa.anioCarnaval);
  return {hayAbierta:ediciones.some(e=>e.activa),hayPreparada,proximoAnio:Math.max(anioEnPreparacion(),...ediciones.map(e=>e.anioCarnaval+1)),ediciones:ediciones.map(e=>({id:e.id,anio:e.anioCarnaval,abierta:e.activa})),edicion:edicion?{id:edicion.id,anio:edicion.anioCarnaval,abierta:edicion.activa}:null,anterior:anterior?.anioCarnaval??null,rows,formacion,instrumentosPorNaipe,catalogoVariantes,naipeIdPorNombre};
}

export async function guardarMetasNaipes(edicionId: string, metas: NaipeMeta[]) {
  const {bateriaId,user}=await requireBateria();
  if(!validarMetas(metas))return {error:"Revisá las metas: valores enteros entre 0 y 1000."};
  metas = unirMetas(metas);
  if(!validarMetas(metas)) return {error:"La suma de objetivos por naipe no puede superar 1000."};
  await prisma.$transaction(async tx=>{
    const edicion=await tx.edicion.findUniqueOrThrow({where:{id:edicionId,bateriaId}});
    const {formacion}=leerGuardado(edicion.planNaipes);
    const guardado: Guardado = {metas,formacion};
    await tx.edicion.update({where:{id:edicionId,bateriaId},data:{planNaipes:guardado}});
    await tx.auditoria.create({data:{bateriaId,usuarioId:user.id,registradoPor:user.name,accion:"guardarMetasNaipes",entidadId:edicionId,datos:{metas}}});
  });
  revalidatePath("/naipes");revalidatePath("/carnaval/naipes");return {ok:true};
}

export async function guardarFormacionNaipes(edicionId: string, formacion: FormacionPlan) {
  const {bateriaId,user}=await requireBateria();
  if(!validarFormacion(formacion))return {error:"La formación tiene un formato inválido. Revisá anchos y secciones."};
  await prisma.$transaction(async tx=>{
    const edicion=await tx.edicion.findUniqueOrThrow({where:{id:edicionId,bateriaId}});
    const {metas}=leerGuardado(edicion.planNaipes);
    const guardado: Guardado = {metas,formacion};
    await tx.edicion.update({where:{id:edicionId,bateriaId},data:{planNaipes:guardado}});
    await tx.auditoria.create({data:{bateriaId,usuarioId:user.id,registradoPor:user.name,accion:"guardarFormacionNaipes",entidadId:edicionId,datos:{formacion}}});
  });
  revalidatePath("/naipes");revalidatePath("/carnaval/naipes");return {ok:true};
}
