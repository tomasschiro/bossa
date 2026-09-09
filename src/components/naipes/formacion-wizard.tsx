"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, GripVertical, Trash2, X } from "lucide-react";
import { nuevaSeccionId, filasSeccion, grillaVacia, type Seccion } from "@/lib/naipes-plan-utils";

type WizardSeccion = { id: string; nombre: string; naipes: string[] };
type PasoId = "anchos" | "secciones" | "cantidades" | "espejo" | "confirmar";

export function FormacionWizard({open,onOpenChange,nombresNaipes,cantidadPorNaipe,onConfirmar}:{open:boolean;onOpenChange:(open:boolean)=>void;nombresNaipes:string[];cantidadPorNaipe:Record<string,{actual:number;objetivo:number}>;onConfirmar:(plan:{anchoMitad:number;anchoPasillo:number;espejarDerecha:boolean;secciones:Seccion[];source:"actual"|"objetivo"})=>void}) {
 const [pasoIdx,setPasoIdx]=useState(0);
 const [anchoMitad,setAnchoMitad]=useState(8);
 const [anchoPasillo,setAnchoPasillo]=useState(4);
 const [secciones,setSecciones]=useState<WizardSeccion[]>([]);
 const [nombreNueva,setNombreNueva]=useState("");
 const [seleccionNueva,setSeleccionNueva]=useState<string[]>([]);
 const [source,setSource]=useState<"actual"|"objetivo">("actual");
 const [espejarDerecha,setEspejarDerecha]=useState(true);

 function reiniciar(){setPasoIdx(0);setSecciones([]);setNombreNueva("");setSeleccionNueva([]);setSource("actual");setEspejarDerecha(true);}
 function cerrar(open:boolean){if(!open)reiniciar();onOpenChange(open);}

 const disponibles=nombresNaipes.filter(n=>!seleccionNueva.includes(n));
 const pasos: PasoId[] = ["anchos","secciones","cantidades","espejo","confirmar"];
 const paso = pasos[Math.min(pasoIdx,pasos.length-1)];

 const cantidadSimple=(nombre:string)=>source==="objetivo"?(cantidadPorNaipe[nombre]?.objetivo??0):(cantidadPorNaipe[nombre]?.actual??0);
 function cantidadPorNaipeMap(){const m:Record<string,number>={};for(const n of nombresNaipes)m[n]=cantidadSimple(n);return m;}

 function agregarSeccion(){
  if(!seleccionNueva.length) return;
  const nombre=seleccionNueva.length===1?seleccionNueva[0]:(nombreNueva.trim()||seleccionNueva.join(" + "));
  const id=nuevaSeccionId(secciones,nombre);
  setSecciones([...secciones,{id,nombre,naipes:seleccionNueva}]);
  setNombreNueva("");setSeleccionNueva([]);
 }
 function quitarSeccion(id:string){setSecciones(secciones.filter(s=>s.id!==id));}
 function moverSeccion(id:string,dir:-1|1){
  const i=secciones.findIndex(s=>s.id===id),j=i+dir;
  if(i<0||j<0||j>=secciones.length) return;
  const copia=[...secciones];[copia[i],copia[j]]=[copia[j],copia[i]];setSecciones(copia);
 }

 function confirmar(){
  const cant=cantidadPorNaipeMap();
  const seccionesFinal:Seccion[]=secciones.map(s=>{
   const base:Seccion={id:s.id,nombre:s.nombre,naipes:s.naipes,grilla:[]};
   if(s.naipes.length===1) return base;
   const filas=filasSeccion(base,anchoMitad,cant);
   const vacia=grillaVacia(filas,anchoMitad);
   return {id:s.id,nombre:s.nombre,naipes:s.naipes,grilla:vacia,...(espejarDerecha?{}:{grillaDerecha:grillaVacia(filas,anchoMitad)})};
  });
  onConfirmar({anchoMitad,anchoPasillo,espejarDerecha,secciones:seccionesFinal,source});
  cerrar(false);
 }

 function siguiente(){ setPasoIdx(i=>Math.min(pasos.length-1,i+1)); }
 function atras(){ setPasoIdx(i=>Math.max(0,i-1)); }

 const puedeAvanzar = !(paso==="secciones"&&!secciones.length);

 return <Dialog open={open} onOpenChange={cerrar}>
  <DialogContent className="max-w-lg">
   <DialogHeader>
    <DialogTitle>Asistente de formación</DialogTitle>
    <DialogDescription>Paso {pasoIdx+1} de {pasos.length}</DialogDescription>
   </DialogHeader>

   {paso==="anchos"&&<div className="space-y-4">
    <p className="text-sm text-fg-secondary">Definí el ancho de cada mitad de la batería y el pasillo central donde paran los directores.</p>
    <div className="grid grid-cols-2 gap-3">
     <label className="text-xs">Ancho de cada mitad (columnas)<Input className="mt-1 h-9" type="number" min={1} max={40} value={anchoMitad} onChange={e=>setAnchoMitad(Math.max(1,Math.min(40,Number(e.target.value)||1)))}/></label>
     <label className="text-xs">Ancho del pasillo central (columnas)<Input className="mt-1 h-9" type="number" min={0} max={20} value={anchoPasillo} onChange={e=>setAnchoPasillo(Math.max(0,Math.min(20,Number(e.target.value)||0)))}/></label>
    </div>
   </div>}

   {paso==="secciones"&&<div className="space-y-4">
    <p className="text-sm text-fg-secondary">Armá las secciones de adelante hacia atrás. Una sección puede ser un solo naipe o varios agrupados (ej. &quot;Cocina&quot; = Caixa + Repique + Surdo).</p>
    <div className="space-y-2 rounded-lg border border-border p-3">
     <p className="text-xs font-semibold">Nueva sección</p>
     <div className="flex flex-wrap gap-1.5">{disponibles.map(n=><button key={n} type="button" onClick={()=>setSeleccionNueva([...seleccionNueva,n])} className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-bg-subtle">{n}</button>)}{!disponibles.length&&<p className="text-xs text-fg-tertiary">Todos los naipes ya están en alguna sección.</p>}</div>
     {seleccionNueva.length>0&&<div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">{seleccionNueva.map(n=><span key={n} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{n}<button type="button" aria-label={`Quitar ${n}`} onClick={()=>setSeleccionNueva(seleccionNueva.filter(x=>x!==n))}><X className="size-3"/></button></span>)}</div>
      {seleccionNueva.length>1&&<Input className="h-8 text-xs" placeholder="Nombre de la sección (ej. Cocina)" value={nombreNueva} onChange={e=>setNombreNueva(e.target.value)}/>}
      <Button size="sm" className="h-8 text-xs" onClick={agregarSeccion}>Agregar sección</Button>
     </div>}
    </div>
    {secciones.length>0&&<div className="space-y-1.5">
     <p className="text-xs font-semibold">Orden (adelante → atrás)</p>
     {secciones.map((s,i)=><div key={s.id} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs">
      <GripVertical className="size-3.5 text-fg-tertiary"/>
      <span className="flex-1 font-medium">{i+1}. {s.nombre}{s.naipes.length>1&&<span className="ml-1 font-normal text-fg-secondary">({s.naipes.join(", ")})</span>}</span>
      <Button variant="outline" size="icon-sm" aria-label="Subir" disabled={i===0} onClick={()=>moverSeccion(s.id,-1)}><ArrowLeft className="size-3.5 -rotate-90"/></Button>
      <Button variant="outline" size="icon-sm" aria-label="Bajar" disabled={i===secciones.length-1} onClick={()=>moverSeccion(s.id,1)}><ArrowRight className="size-3.5 rotate-90"/></Button>
      <Button variant="outline" size="icon-sm" aria-label={`Quitar ${s.nombre}`} onClick={()=>quitarSeccion(s.id)}><Trash2 className="size-3.5"/></Button>
     </div>)}
    </div>}
   </div>}

   {paso==="cantidades"&&<div className="space-y-4">
    <p className="text-sm text-fg-secondary">¿Con qué cantidades calculamos el tamaño de cada sección?</p>
    <div className="flex gap-2">
     <Button variant={source==="actual"?"default":"outline"} className="flex-1" onClick={()=>setSource("actual")}>Integrantes actuales</Button>
     <Button variant={source==="objetivo"?"default":"outline"} className="flex-1" onClick={()=>setSource("objetivo")}>Cantidades objetivo</Button>
    </div>
   </div>}

   {paso==="espejo"&&<div className="space-y-4">
    <p className="text-sm text-fg-secondary">¿El lado derecho se completa solo, reflejando lo que pintes del lado izquierdo, o lo pintás aparte?</p>
    <div className="flex gap-2">
     <Button variant={espejarDerecha?"default":"outline"} className="flex-1" onClick={()=>setEspejarDerecha(true)}>Espejar (se completa solo)</Button>
     <Button variant={!espejarDerecha?"default":"outline"} className="flex-1" onClick={()=>setEspejarDerecha(false)}>Pintar aparte</Button>
    </div>
   </div>}

   {paso==="confirmar"&&<div className="space-y-4">
    <p className="text-sm text-fg-secondary">Listo. Se generan las dos mitades con el pasillo central; las secciones mezcladas quedan vacías, listas para pintar directo sobre el plano.</p>
   </div>}

   <div className="flex items-center justify-between border-t border-border pt-3">
    <Button variant="outline" className="h-9 text-xs" disabled={pasoIdx===0} onClick={atras}>Atrás</Button>
    {paso!=="confirmar"?<Button className="h-9 text-xs" disabled={!puedeAvanzar} onClick={siguiente}>Siguiente</Button>
    :<Button className="h-9 text-xs" onClick={confirmar}>Generar formación</Button>}
   </div>
  </DialogContent>
 </Dialog>;
}
