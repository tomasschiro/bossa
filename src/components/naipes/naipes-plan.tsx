"use client";
import { Fragment, useEffect, useState, useTransition } from "react";
import { prepararCarnaval } from "@/lib/carnaval-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { usePathname, useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Save, LayoutGrid, ChartNoAxesCombined, Wand2, Trash2, Plus, ChevronDown, ChevronsDownUp, MoreVertical, Download, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { guardarMetasNaipes, guardarFormacionNaipes, type getPlanNaipes } from "@/lib/naipes-plan-actions";
import { guardarVariante } from "@/lib/naipes-actions";
import { porcentajes, celdasMitad, contarSuperposiciones, altoFormacion, filasSeccion, anchoSeccion, grillaVacia, grillaRedimensionada, grillaBooleanaRedimensionada, nuevaSeccionId, desgloseDesbalanceado, type NaipeMeta, type FormacionPlan, type Seccion } from "@/lib/naipes-plan-utils";
import { FormacionWizard } from "@/components/naipes/formacion-wizard";
const COLORS=["#078566","#2563eb","#b45309","#9333ea","#db2777","#0891b2","#64748b","#6d7c0e"];
type Data=Awaited<ReturnType<typeof getPlanNaipes>>;
type Celda={x:number;y:number;seccionId:string;naipe:string|null;fila:number;col:number};
type PintarObjetivo={lado:"izquierda"|"derecha";seccionId:string;fila:number;col:number;px:number;py:number};
type Ubicacion={lado:"izquierda"|"derecha";seccionId:string;fila:number;col:number};
function claveCelda(u:Ubicacion){return `${u.lado}:${u.seccionId}:${u.fila}:${u.col}`;}

export function NaipesPlan({data,initialTab="equilibrio"}:{data:Data;initialTab?:string}) {
 const [draft,setPlans]=useState(data.rows.map(r=>r.plan));
 const plans=data.rows.map(r=>draft.find(p=>p.nombre===r.nombre)??r.plan);
 const [tab,setTab]=useState(initialTab==="formacion"?"formacion":"equilibrio");const [soloConfirmados,setSoloConfirmados]=useState(false);
 const [source,setSource]=useState<"actual"|"objetivo">("actual");
 const [dirty,setDirty]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 const [pending,startTransition]=useTransition();const router=useRouter(),pathname=usePathname();
 const [preparar,setPreparar]=useState(false);const [copiar,setCopiar]=useState(false);const [prepareError,setPrepareError]=useState("");

 const [formacion,setFormacion]=useState<FormacionPlan>(data.formacion);
 const [formacionDirty,setFormacionDirty]=useState(false);
 const [wizardOpen,setWizardOpen]=useState(false);
 const [seccionSel,setSeccionSel]=useState(0);
 const [pintarObjetivo,setPintarObjetivo]=useState<PintarObjetivo|null>(null);
 const [pintarNaipe,setPintarNaipe]=useState<string|null>(null);
 const [desgloseAbierto,setDesgloseAbierto]=useState<string|null>(null);
 const [agregarVarianteAbierto,setAgregarVarianteAbierto]=useState<string|null>(null);
 const [nuevaVarianteNombre,setNuevaVarianteNombre]=useState("");
 const [nuevaVarianteError,setNuevaVarianteError]=useState("");
 const [nuevaSeccionAbierta,setNuevaSeccionAbierta]=useState(false);
 const [nuevaSeccionNombre,setNuevaSeccionNombre]=useState("");
 const [nuevaSeccionNaipes,setNuevaSeccionNaipes]=useState<string[]>([]);
 const [alertasAbiertas,setAlertasAbiertas]=useState(false);
 const [panelProgresoAbierto,setPanelProgresoAbierto]=useState(true);
 const [ayudaAbierta,setAyudaAbierta]=useState(false);
 const [ajustesSeccionAbiertos,setAjustesSeccionAbiertos]=useState<string|null>(null);
 // Selección múltiple de casilleros del plano (para copiar/pegar y mover en bloque):
 // Ctrl/Cmd+clic suma casilleros sueltos; arrastrar sobre el fondo dibuja un lazo
 // rectangular que selecciona todo lo que toca. `arrastrandoDesde` guarda el origen de
 // un drag-and-drop de un casillero pintado (mover); `portapapeles` guarda el bloque
 // copiado con Ctrl/Cmd+C, listo para pegar con Ctrl/Cmd+V sobre el último clickeado.
 const [seleccion,setSeleccion]=useState<Set<string>>(new Set());
 const [lazo,setLazo]=useState<{lado:"izquierda"|"derecha";x0:number;y0:number;x1:number;y1:number}|null>(null);
 const [arrastrandoDesde,setArrastrandoDesde]=useState<Ubicacion|null>(null);
 const [ultimoClick,setUltimoClick]=useState<Ubicacion|null>(null);
 const [portapapeles,setPortapapeles]=useState<{filaBase:number;colBase:number;celdas:{fila:number;col:number;naipe:string|null}[]}|null>(null);
 // Con Shift apretado, arrastrar sobre CUALQUIER casillero (pintado o no) dibuja el
 // lazo de selección en vez de mover ese casillero — sin Shift, arrastrar un
 // casillero pintado lo mueve como siempre. Rastreado a nivel de ventana porque el
 // gesto empieza antes del mousedown sobre el plano.
 const [shiftApretado,setShiftApretado]=useState(false);
 useEffect(()=>{
  function onKeyDown(e:KeyboardEvent){if(e.key==="Shift")setShiftApretado(true);}
  function onKeyUp(e:KeyboardEvent){if(e.key==="Shift")setShiftApretado(false);}
  window.addEventListener("keydown",onKeyDown);window.addEventListener("keyup",onKeyUp);
  return ()=>{window.removeEventListener("keydown",onKeyDown);window.removeEventListener("keyup",onKeyUp);};
 },[]);
 // Si se suelta el mouse fuera del plano por completo (afuera del <svg>, ej. el
 // usuario arrastra y suelta sobre otra parte de la pantalla), el arrastre en curso
 // queda colgado porque ningún onMouseUp del plano llega a ejecutarse: este listener
 // global lo cancela sin mover nada.
 useEffect(()=>{
  if(!arrastrandoDesde)return;
  function onWindowMouseUp(){setArrastrandoDesde(null);}
  window.addEventListener("mouseup",onWindowMouseUp);
  return ()=>window.removeEventListener("mouseup",onWindowMouseUp);
 },[arrastrandoDesde]);

 function abrirNaipe(nombre:string){if(!data.edicion)return;if(dirty&&!window.confirm("Tenés cambios sin guardar. ¿Querés abrir la ficha y descartarlos?"))return;router.push(`${pathname}/${encodeURIComponent(data.edicion.id)}/${encodeURIComponent(nombre)}${soloConfirmados?"?confirmados=1":""}`);}
 const readonly=!data.edicion;
 const current=data.rows.map(r=>soloConfirmados?r.confirmados:r.actual),goals=plans.map(p=>p.objetivo??0);
 const total=current.reduce((a,b)=>a+b,0),target=goals.reduce((a,b)=>a+b,0),previous=data.rows.reduce((a,r)=>a+r.anterior,0);
 const pct=porcentajes(current),goalPct=porcentajes(goals),prevPct=porcentajes(data.rows.map(r=>r.anterior));
 const faltan=plans.reduce((n,p,i)=>n+(p.objetivo===null?0:Math.max(0,p.objetivo-current[i])),0);
 const sinMeta=plans.filter(p=>p.objetivo===null).length;
 function update(i:number,changes:Partial<NaipeMeta>){setPlans(plans.map((r,j)=>j===i?{...r,...changes}:r));setDirty(true);setMessage("");setError("");}
 function changeEdition(id:string){if(dirty&&!window.confirm("Tenés cambios sin guardar. ¿Querés cambiar de edición y descartarlos?"))return;startTransition(()=>router.push(`${pathname}?edicion=${encodeURIComponent(id)}&vista=${tab}`,{scroll:false}));}

 const cantidadPorNaipe:Record<string,number>={};
 data.rows.forEach((r,i)=>{cantidadPorNaipe[r.nombre]=source==="objetivo"?goals[i]:current[i];});

 // El plano tiene que crecer o achicarse solo cuando cambian las secciones, el modo
 // Actual/Objetivo o el ancho de mitad: redimensiono la grilla de cada sección
 // mezclada al tamaño que le corresponde ahora mismo, conservando lo ya pintado que
 // siga entrando. Esta es la formación que se usa para dibujar, pintar y guardar.
 const formacionEfectiva:FormacionPlan={...formacion,secciones:formacion.secciones.map(s=>{
  if(s.naipes.length===1) return s;
  const ancho=anchoSeccion(s,formacion.anchoMitad,cantidadPorNaipe);
  const filas=filasSeccion(s,formacion.anchoMitad,cantidadPorNaipe);
  const seccion:Seccion={...s,grilla:grillaRedimensionada(s.grilla,filas,ancho)};
  if(s.grillaDerecha) seccion.grillaDerecha=grillaRedimensionada(s.grillaDerecha,filas,ancho);
  if(s.desvinculadaDerecha) seccion.desvinculadaDerecha=grillaBooleanaRedimensionada(s.desvinculadaDerecha,filas,ancho);
  return seccion;
 })};

 const izquierda:Celda[]=celdasMitad(formacionEfectiva.secciones,formacionEfectiva.anchoMitad,cantidadPorNaipe,"izquierda",formacionEfectiva.espejarDerecha);
 const derecha:Celda[]=celdasMitad(formacionEfectiva.secciones,formacionEfectiva.anchoMitad,cantidadPorNaipe,"derecha",formacionEfectiva.espejarDerecha);
 const overlap=contarSuperposiciones(izquierda.filter(c=>c.naipe))+contarSuperposiciones(derecha.filter(c=>c.naipe));
 const altoTotal=altoFormacion(formacionEfectiva.secciones,formacionEfectiva.anchoMitad,cantidadPorNaipe);
 const anchoTotal=formacionEfectiva.anchoMitad*2+formacionEfectiva.anchoPasillo;
 const seccionFocada=formacionEfectiva.secciones[seccionSel];
 function colorDe(nombre:string){const i=data.rows.findIndex(r=>r.nombre===nombre);return COLORS[(i<0?0:i)%COLORS.length];}
 // Una celda pintada guarda "<naipe general> <variante>" (ej. "Surdos 1ra") cuando el
 // naipe tiene variantes cargadas en el catálogo. Para colorear siempre con el color
 // base del naipe (nunca el de otro), y para mostrar solo la variante como etiqueta de
 // texto en el casillero, hay que separar ambas partes buscando qué naipe de la sección
 // es prefijo del valor pintado — nunca adivinar por posición ni por texto libre.
 function naipeYVarianteDe(seccion:Seccion|undefined,valor:string):{naipe:string;variante:string|null}{
  const naipe=seccion?.naipes.find(n=>valor===n||valor.startsWith(`${n} `))??valor;
  const variante=valor===naipe?null:valor.slice(naipe.length+1);
  return {naipe,variante};
 }

 // Faltantes solo tienen sentido cuando el tamaño de la formación se calcula con
 // Objetivo: comparan el objetivo contra la realidad (ritmistas activos e inventario
 // disponible), por separado — puede faltar gente sin faltar instrumentos o viceversa.
 const faltantesPersonas=source==="objetivo"?data.rows.map((r,i)=>({nombre:r.nombre,faltan:Math.max(0,goals[i]-current[i])})).filter(f=>f.faltan>0):[];
 const faltantesInstrumentos=source==="objetivo"?data.rows.map((r,i)=>({nombre:r.nombre,faltan:Math.max(0,goals[i]-(data.instrumentosPorNaipe[r.nombre]??0))})).filter(f=>f.faltan>0):[];

 // Pinta un casillero con una variante. Si hay una selección múltiple activa que
 // incluye ese mismo casillero (punto 9: pintado en lote), pinta TODOS los
 // seleccionados de una sola vez con la misma elección, en vez de solo el que abrió
 // el popover — así no hace falta tocarlos uno por uno.
 function pintarCelda(seccionId:string,lado:"izquierda"|"derecha",fila:number,col:number,variante:string|null){
  const objetivo:Ubicacion={lado,seccionId,fila,col};
  const enLote=seleccion.size>1&&seleccion.has(claveCelda(objetivo));
  const destinos=enLote?[...seleccion].map(k=>{const [l,sid,f,c]=k.split(":");return {lado:l as "izquierda"|"derecha",seccionId:sid,fila:Number(f),col:Number(c)};}):[objetivo];
  escribirCeldas(destinos.map(u=>({u,valor:variante})));
  if(enLote)setSeleccion(new Set());
  setPintarObjetivo(null);setPintarNaipe(null);
 }
 // Lee el valor REALMENTE pintado de una celda (lo que se ve en el plano), de
 // cualquier sección/lado. Para la derecha con espejo activo, esto es distinto de
 // leer `grillaDerecha` en crudo: una celda que nunca se editó a mano no tiene nada
 // guardado ahí — su valor visible viene del espejo de la izquierda (`celdasMitad` ya
 // hace ese cálculo para dibujar el plano), así que hay que leerlo de ahí para poder
 // arrastrarla/moverla igual que cualquier otra.
 function valorCelda(u:Ubicacion):string|null{
  const celdas=u.lado==="izquierda"?izquierda:derecha;
  return celdas.find(c=>c.seccionId===u.seccionId&&c.fila===u.fila&&c.col===u.col)?.naipe??null;
 }
 // Aplica una lista de escrituras {ubicacion, valor} en una sola actualización de
 // estado, agrupadas por sección — necesario porque mover, pegar o pintar en lote
 // escribe varias celdas de la MISMA sección/lado a la vez: aplicarlas una por una
 // sobre el estado previo (en vez de partir todas de la misma grilla "efectiva" del
 // render actual) perdería las escrituras anteriores dentro del mismo lote.
 function escribirCeldas(escrituras:{u:Ubicacion;valor:string|null}[]){
  if(!escrituras.length)return;
  setFormacion(f=>({...f,secciones:f.secciones.map(s=>{
   const propias=escrituras.filter(e=>e.u.seccionId===s.id);
   if(!propias.length)return s;
   const filas=filasSeccion(s,f.anchoMitad,cantidadPorNaipe),ancho=anchoSeccion(s,f.anchoMitad,cantidadPorNaipe);
   let grilla=grillaRedimensionada(s.grilla,filas,ancho);
   let grillaDerecha=s.grillaDerecha?grillaRedimensionada(s.grillaDerecha,filas,ancho):undefined;
   let desvinculadaDerecha=s.desvinculadaDerecha?grillaBooleanaRedimensionada(s.desvinculadaDerecha,filas,ancho):undefined;
   for(const {u,valor} of propias){
    if(u.fila<0||u.fila>=filas||u.col<0||u.col>=ancho)continue;
    if(u.lado==="izquierda"){
     grilla=grilla.map((fila,fi)=>fi===u.fila?fila.map((v,ci)=>ci===u.col?valor:v):fila);
    } else {
     const base=grillaDerecha??grillaVacia(filas,ancho);
     grillaDerecha=base.map((fila,fi)=>fi===u.fila?fila.map((v,ci)=>ci===u.col?valor:v):fila);
     if(f.espejarDerecha){
      const baseDesv=desvinculadaDerecha??Array.from({length:filas},()=>Array.from({length:ancho},()=>false));
      desvinculadaDerecha=baseDesv.map((fila,fi)=>fi===u.fila?fila.map((v,ci)=>ci===u.col?true:v):fila);
     }
    }
   }
   return {...s,grilla,...(grillaDerecha?{grillaDerecha}:{}),...(desvinculadaDerecha?{desvinculadaDerecha}:{})};
  })}));
  setFormacionDirty(true);setMessage("");setError("");
 }
 // Mover (arrastrar) un casillero pintado a cualquier otro casillero del plano, sin
 // restricción de sección ni lado. Si el destino está vacío, el origen se muda ahí. Si
 // el destino ya tiene algo pintado, se intercambian los dos (swap) — ninguno se pierde.
 function moverCelda(origen:Ubicacion,destino:Ubicacion){
  if(origen.lado===destino.lado&&origen.seccionId===destino.seccionId&&origen.fila===destino.fila&&origen.col===destino.col)return;
  const valorOrigen=valorCelda(origen);
  if(valorOrigen===null)return;
  const valorDestino=valorCelda(destino);
  escribirCeldas([{u:origen,valor:valorDestino},{u:destino,valor:valorOrigen}]);
 }
 // Mover un bloque completo (selección múltiple), manteniendo las posiciones
 // relativas entre sí. `ancla` es el casillero que se soltó sobre `destino`; puede
 // cruzar a cualquier sección/lado, igual que mover un único casillero. A diferencia
 // de mover un casillero suelto, acá no hay swap (con cuál de los varios casilleros
 // del bloque intercambiaría cada celda ocupada del destino sería ambiguo): lo que
 // ya estuviera pintado en el destino se sobreescribe.
 function moverBloque(ubicaciones:Ubicacion[],ancla:Ubicacion,destino:Ubicacion){
  const dFila=destino.fila-ancla.fila,dCol=destino.col-ancla.col;
  if(dFila===0&&dCol===0&&ancla.seccionId===destino.seccionId&&ancla.lado===destino.lado)return;
  const valores=ubicaciones.map(u=>({u,valor:valorCelda(u)})).filter(v=>v.valor!==null);
  const escrituras=[
   ...valores.map(({u})=>({u,valor:null})),
   ...valores.map(({u,valor})=>({u:{lado:destino.lado,seccionId:destino.seccionId,fila:u.fila+dFila,col:u.col+dCol},valor})),
  ];
  escribirCeldas(escrituras);
 }
 // Copiar la selección actual: guarda cada casillero seleccionado con su posición
 // relativa al más arriba-a-la-izquierda del bloque, para poder pegarlo anclado donde
 // se clickee después, en cualquier sección/lado.
 function copiarSeleccion(){
  if(!seleccion.size)return;
  const ubicaciones=[...seleccion].map(k=>{const [lado,seccionId,fila,col]=k.split(":");return {lado:lado as "izquierda"|"derecha",seccionId,fila:Number(fila),col:Number(col)};});
  const filaBase=Math.min(...ubicaciones.map(u=>u.fila)),colBase=Math.min(...ubicaciones.map(u=>u.col));
  const celdas=ubicaciones.map(u=>({fila:u.fila-filaBase,col:u.col-colBase,naipe:valorCelda(u)}));
  setPortapapeles({filaBase,colBase,celdas});
 }
 // Pegar el bloque copiado, anclado al casillero donde se clickeó último — en
 // cualquier sección/lado, igual que arrastrar.
 function pegarSeleccion(destino:Ubicacion){
  if(!portapapeles)return;
  const escrituras=portapapeles.celdas.filter(c=>c.naipe!==null).map(c=>({u:{lado:destino.lado,seccionId:destino.seccionId,fila:destino.fila+c.fila,col:destino.col+c.col},valor:c.naipe}));
  escribirCeldas(escrituras);
 }
 useEffect(()=>{
  function onKeyDown(e:KeyboardEvent){
   if(!(e.ctrlKey||e.metaKey))return;
   if(e.key==="c"||e.key==="C"){if(seleccion.size){copiarSeleccion();e.preventDefault();}}
   else if(e.key==="v"||e.key==="V"){if(portapapeles&&ultimoClick){pegarSeleccion(ultimoClick);e.preventDefault();}}
  }
  window.addEventListener("keydown",onKeyDown);
  return ()=>window.removeEventListener("keydown",onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[seleccion,portapapeles,ultimoClick,formacionEfectiva]);
 function moverSeccion(id:string,dir:-1|1){
  const i=formacion.secciones.findIndex(s=>s.id===id),j=i+dir;
  if(i<0||j<0||j>=formacion.secciones.length)return;
  const copia=[...formacion.secciones];[copia[i],copia[j]]=[copia[j],copia[i]];
  setFormacion(f=>({...f,secciones:copia}));setFormacionDirty(true);setSeccionSel(j);
 }
 function eliminarSeccion(id:string){setFormacion(f=>({...f,secciones:f.secciones.filter(s=>s.id!==id)}));setSeccionSel(0);setFormacionDirty(true);}
 function cerrarAgregarVariante(){setAgregarVarianteAbierto(null);setNuevaVarianteNombre("");setNuevaVarianteError("");}
 function agregarVarianteDesdeEcualizacion(nombre:string){
  const naipeId=data.naipeIdPorNombre[nombre];
  if(!naipeId||!nuevaVarianteNombre.trim())return;
  setNuevaVarianteError("");
  startTransition(async()=>{
   try{const result=await guardarVariante({naipeId,nombre:nuevaVarianteNombre});if(result.error){setNuevaVarianteError(result.error);return;}cerrarAgregarVariante();router.refresh();}
   catch{setNuevaVarianteError("No se pudo guardar la variante. Intentá nuevamente.");}
  });
 }
 function guardarFormacion(){
  setError("");setMessage("");
  startTransition(async()=>{
   try{
    const result=await guardarFormacionNaipes(data.edicion!.id,formacionEfectiva);
    if(result.error)setError(result.error);
    else{setFormacion(formacionEfectiva);setFormacionDirty(false);setMessage("Formación guardada.");}
   }catch{setError("No se pudo guardar. Intentá nuevamente.");}
  });
 }
 // Exporta el plano actual como PNG: serializa el SVG del plano tal cual está en
 // pantalla, le agrega una leyenda de colores debajo (mismo criterio que la leyenda
 // en pantalla), y rasteriza todo junto vía canvas — sin depender de ninguna
 // biblioteca externa ni de la pantalla completa.
 function exportarPlanoPng(){
  const svgOriginal=document.querySelector<SVGSVGElement>('svg[aria-label="Plano de formación por mitades"]');
  if(!svgOriginal)return;
  const anchoPx=Number(svgOriginal.getAttribute("width")),altoPlanoPx=Number(svgOriginal.getAttribute("height"));
  const filaLeyenda=18,leyendaPorFila=Math.max(1,Math.floor(anchoPx/140)),filasLeyenda=Math.ceil(data.rows.length/leyendaPorFila);
  const altoLeyenda=16+filasLeyenda*filaLeyenda,altoPx=altoPlanoPx+altoLeyenda;
  const ns="http://www.w3.org/2000/svg";
  const svgExport=document.createElementNS(ns,"svg");
  svgExport.setAttribute("xmlns",ns);svgExport.setAttribute("width",String(anchoPx));svgExport.setAttribute("height",String(altoPx));
  const fondo=document.createElementNS(ns,"rect");fondo.setAttribute("width","100%");fondo.setAttribute("height","100%");fondo.setAttribute("fill","#ffffff");svgExport.appendChild(fondo);
  svgExport.appendChild(svgOriginal.cloneNode(true));
  data.rows.forEach((r,i)=>{
   const fila=Math.floor(i/leyendaPorFila),col=i%leyendaPorFila;
   const lx=8+col*140,ly=altoPlanoPx+12+fila*filaLeyenda;
   const swatch=document.createElementNS(ns,"rect");swatch.setAttribute("x",String(lx));swatch.setAttribute("y",String(ly));swatch.setAttribute("width","10");swatch.setAttribute("height","10");swatch.setAttribute("rx","2");swatch.setAttribute("fill",COLORS[i%COLORS.length]);svgExport.appendChild(swatch);
   const texto=document.createElementNS(ns,"text");texto.setAttribute("x",String(lx+14));texto.setAttribute("y",String(ly+9));texto.setAttribute("font-size","10");texto.setAttribute("fill","#111827");texto.textContent=`${r.nombre} (${cantidadPorNaipe[r.nombre]??0})`;svgExport.appendChild(texto);
  });
  const svgTexto=new XMLSerializer().serializeToString(svgExport);
  const img=new Image();
  img.onload=()=>{
   const canvas=document.createElement("canvas");canvas.width=anchoPx;canvas.height=altoPx;
   const ctx2d=canvas.getContext("2d");if(!ctx2d)return;
   ctx2d.fillStyle="#ffffff";ctx2d.fillRect(0,0,anchoPx,altoPx);ctx2d.drawImage(img,0,0);
   canvas.toBlob(blob=>{
    if(!blob)return;
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=`formacion-${data.edicion?.anio??"plano"}.png`;a.click();
    URL.revokeObjectURL(url);
   },"image/png");
  };
  img.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgTexto)}`;
 }
 const naipesEnUso=new Set(formacion.secciones.flatMap(s=>s.naipes));
 const naipesDisponiblesNueva=data.rows.map(r=>r.nombre).filter(n=>!naipesEnUso.has(n));
 function cerrarNuevaSeccion(){setNuevaSeccionAbierta(false);setNuevaSeccionNombre("");setNuevaSeccionNaipes([]);}
 function agregarSeccionNueva(){
  if(!nuevaSeccionNaipes.length)return;
  const nombre=nuevaSeccionNaipes.length===1?nuevaSeccionNaipes[0]:(nuevaSeccionNombre.trim()||nuevaSeccionNaipes.join(" + "));
  const id=nuevaSeccionId(formacion.secciones,nombre);
  const base:Seccion={id,nombre,naipes:nuevaSeccionNaipes,grilla:[]};
  if(nuevaSeccionNaipes.length>1){
   const filas=filasSeccion(base,formacion.anchoMitad,cantidadPorNaipe);
   base.grilla=grillaVacia(filas,formacion.anchoMitad);
   if(!formacion.espejarDerecha)base.grillaDerecha=grillaVacia(filas,formacion.anchoMitad);
  }
  setFormacion(f=>({...f,secciones:[...f.secciones,base]}));
  setSeccionSel(formacion.secciones.length);
  setFormacionDirty(true);setMessage("");setError("");
  cerrarNuevaSeccion();
 }

 const seccionPintando=pintarObjetivo?formacionEfectiva.secciones.find(s=>s.id===pintarObjetivo.seccionId):undefined;
 // Selector de dos pasos: primero el naipe general de la sección; si ese naipe tiene
 // variantes cargadas en el catálogo de Naipes, un segundo paso para elegir cuál. La
 // fuente de variantes es siempre el catálogo (punto 1), nunca el texto libre de
 // ritmistas — igual en modo Actual y en modo Objetivo.
 const variantesDelNaipePintando=pintarNaipe?data.catalogoVariantes[pintarNaipe]??[]:[];
 const mostrarPasoVariante=!!pintarNaipe&&variantesDelNaipePintando.length>0;
 // Contador en vivo (solo en Objetivo): cuántas celdas ya tienen pintada cada variante
 // exacta, contra el desglose que el director cargó en Ecualización para ese naipe.
 const metaPintando=pintarNaipe?plans.find(p=>p.nombre===pintarNaipe):undefined;
 function contarPintadasVariante(variante:string):number{
  const pintado=`${pintarNaipe} ${variante}`;
  return izquierda.filter(c=>c.naipe===pintado).length+derecha.filter(c=>c.naipe===pintado).length;
 }

 // Panel lateral de progreso (punto 7): por cada naipe, si tiene desglose por variante
 // cargado en Ecualización se muestra línea por variante (igual criterio que el
 // contador en vivo del popover de pintado); si no, una sola línea con el total del
 // naipe. Cuenta lo ya pintado en el plano (ambas mitades) contra el total configurado
 // según el modo Actual/Objetivo vigente.
 const todasLasCeldas=[...izquierda,...derecha];
 function contarPintadas(valor:string):number{
  return todasLasCeldas.filter(c=>c.naipe===valor).length;
 }
 const progresoPorNaipe=plans.map(p=>{
  const variantesCatalogo=data.catalogoVariantes[p.nombre]??[];
  const variantesConMeta=variantesCatalogo.filter(v=>p.desglose?.[v]!==undefined);
  if(variantesConMeta.length>0){
   return {nombre:p.nombre,items:variantesConMeta.map(v=>({label:`${p.nombre} ${v}`,pintadas:contarPintadas(`${p.nombre} ${v}`),total:p.desglose![v]}))};
  }
  return {nombre:p.nombre,items:[{label:p.nombre,pintadas:contarPintadas(p.nombre)+variantesCatalogo.reduce((n,v)=>n+contarPintadas(`${p.nombre} ${v}`),0),total:source==="objetivo"?(p.objetivo??0):(cantidadPorNaipe[p.nombre]??0)}]};
 }).flatMap(g=>g.items);

 return <section className="space-y-3">
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
   <div><h1 className="text-xl font-bold tracking-tight">Naipes y formación</h1><p className="mt-0.5 text-xs text-fg-secondary">Equilibrio de integrantes y distribución en la avenida.</p></div>
   <div className="flex flex-wrap items-end gap-3"><label className="text-xs text-fg-secondary">Carnaval<select disabled={pending} aria-label="Carnaval del plan" className="mt-1 block h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground" value={data.edicion?.id??""} onChange={e=>changeEdition(e.target.value)}>{!data.edicion&&<option value="">Sin edición</option>}{data.ediciones.map(e=><option key={e.id} value={e.id}>{e.anio}</option>)}</select></label>{!data.hayPreparada&&<Button className="h-9 text-xs" variant="outline" onClick={()=>setPreparar(true)}>Preparar {data.proximoAnio}</Button>}
    {tab==="equilibrio"&&<Button className="h-9 text-xs" disabled={readonly||pending||!dirty} onClick={()=>{setError("");setMessage("");startTransition(async()=>{try{const result=await guardarMetasNaipes(data.edicion!.id,plans);if(result.error)setError(result.error);else{setDirty(false);setMessage("Objetivos guardados.");}}catch{setError("No se pudo guardar. Intentá nuevamente.");}});}}><Save className="size-4"/>{pending?"Guardando…":"Guardar objetivos"}</Button>}
   </div>
  </header>
  {!data.edicion?<p className="rounded-xl border border-border bg-card p-5 text-sm">Prepará un Carnaval desde Configuración para definir sus objetivos y formación.</p>:!data.edicion.abierta?<p className="rounded-xl bg-bg-subtle p-3 text-sm">Carnaval {data.edicion.anio} · Edición cerrada. Podés editar el plan; los participantes y movimientos conservan sus datos históricos.</p>:null}
  {error&&<p role="alert" className="text-sm text-danger">{error}</p>}{message&&<p role="status" className="text-sm text-success">{message}</p>}{tab==="equilibrio"&&dirty&&<p className="text-xs text-fg-secondary">Cambios sin guardar</p>}{tab==="formacion"&&formacionDirty&&<p className="text-xs text-fg-secondary">Cambios sin guardar</p>}
  {tab==="formacion"&&<div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-4">{[["Integrantes actuales",total],["Objetivo total",plans.every(p=>p.objetivo===null)?"Sin definir":target],["Lugares por cubrir",faltan],["Edición anterior",data.anterior?`${previous} · ${data.anterior}`:"Sin datos"]].map(([label,value])=><div key={label} className="border-r border-border px-3 py-2 last:border-r-0"><p className="text-[11px] text-fg-secondary">{label}</p><p className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums">{value}</p></div>)}</div>}
  <div className="flex flex-wrap items-center justify-between gap-3"><div role="tablist" aria-label="Vista de naipes" className="flex rounded-xl bg-bg-subtle p-1">{[{id:"equilibrio",name:"Ecualización",Icon:ChartNoAxesCombined},{id:"formacion",name:"Formación",Icon:LayoutGrid}].map(({id,name,Icon})=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>setTab(id)} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${tab===id?"bg-card shadow-sm":"text-fg-secondary"}`}><Icon className="size-4"/>{name}</button>)}</div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={soloConfirmados} onChange={e=>setSoloConfirmados(e.target.checked)}/>Solo confirmados</label></div>
  {tab==="equilibrio"?<div className="overflow-hidden rounded-xl border border-border bg-card">
   <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-3"><div><h2 className="text-sm font-semibold">Ecualización por naipe</h2><p className="mt-0.5 text-xs text-fg-secondary">Editá Objetivo y Seguimiento. Actual y porcentajes se calculan desde Ritmistas.</p></div><span className="text-[11px] text-fg-secondary">Actual · Objetivo</span></div>
   {readonly&&<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary/5 px-3 py-3"><p className="text-xs">{data.edicion?`La edición ${data.edicion.anio} está cerrada.`:"Todavía no hay una edición."} Para modificar esta tabla, trabajá en un Carnaval abierto.</p>{!data.hayAbierta&&!data.hayPreparada?<Button className="h-8 text-xs" onClick={()=>setPreparar(true)}>Habilitar edición {data.proximoAnio}</Button>:<Button className="h-8 text-xs" onClick={()=>{const abierta=data.ediciones.find(e=>e.abierta);if(abierta)changeEdition(abierta.id);}}>Ir al Carnaval abierto</Button>}</div>}
   <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-bg-subtle text-xs text-fg-secondary"><tr>{["Naipe","Actual","% actual","Objetivo","% objetivo",data.anterior?`Carnaval ${data.anterior}`:"Anterior","Balance","Seguimiento"].map(h=><th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead><tbody>{plans.map((p,i)=>{
     const variantesCatalogo=data.catalogoVariantes[p.nombre]??[];
     const desbalanceado=desgloseDesbalanceado(p);
     return <Fragment key={p.nombre}>
     <tr onDoubleClick={e=>{if((e.target as HTMLElement).closest("input,select,button,a"))return;abrirNaipe(p.nombre);}} className="group border-t border-border transition-colors hover:bg-bg-subtle/50"><td className="px-3 py-2 font-semibold">{variantesCatalogo.length>0?<button type="button" aria-expanded={desgloseAbierto===p.nombre} aria-label={desgloseAbierto===p.nombre?`Ocultar desglose de ${p.nombre}`:`Desglosar ${p.nombre} por variante`} onClick={()=>setDesgloseAbierto(desgloseAbierto===p.nombre?null:p.nombre)} className="flex items-center gap-1 rounded py-1 text-left hover:text-primary"><ChevronDown className={`size-3.5 shrink-0 text-fg-tertiary transition-transform ${desgloseAbierto===p.nombre?"rotate-180":""}`}/><span className="mr-1 inline-block size-2 rounded-full" style={{backgroundColor:COLORS[i%COLORS.length]}}/>{p.nombre}</button>:<button type="button" aria-label={`Ver integrantes de ${p.nombre}`} onClick={()=>abrirNaipe(p.nombre)} className="rounded py-1 text-left hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"><span className="mr-2 inline-block size-2 rounded-full" style={{backgroundColor:COLORS[i%COLORS.length]}}/>{p.nombre}</button>}</td><td className="px-3 py-2">{current[i]}</td><td className="px-3 py-2"><div className="w-24"><span className="tabular-nums">{pct[i]}%</span><div className="mt-1 h-1 rounded-full bg-bg-subtle"><div className="h-1 rounded-full" style={{width:`${pct[i]}%`,backgroundColor:COLORS[i%COLORS.length]}}/></div></div></td><td className="px-3 py-2"><Input aria-label={`Objetivo ${p.nombre}`} className="h-8 w-20 rounded-md border-border bg-card text-xs font-semibold shadow-none hover:border-border focus:border-primary focus:bg-card" type="number" min={0} max={1000} step={1} placeholder="—" disabled={readonly||pending} value={p.objetivo??""} onChange={e=>{const n=Number(e.target.value);if(e.target.value==="")update(i,{objetivo:null});else if(Number.isInteger(n)&&n>=0&&n<=1000)update(i,{objetivo:n});}}/></td><td className="px-3 py-2"><div className="w-24"><span className="tabular-nums">{p.objetivo===null?"—":`${goalPct[i]}%`}</span><div className="mt-1 h-1 rounded-full bg-bg-subtle"><div className="h-1 rounded-full opacity-40" style={{width:`${goalPct[i]}%`,backgroundColor:COLORS[i%COLORS.length]}}/></div></div></td><td className="px-3 py-2 text-fg-secondary">{data.anterior?`${data.rows[i].anterior} (${prevPct[i]}%)`:"—"}</td><td className="px-3 py-2 whitespace-nowrap">{p.objetivo===null?"Definir meta":p.objetivo>current[i]?`Faltan ${p.objetivo-current[i]}`:p.objetivo<current[i]?`Excedente ${current[i]-p.objetivo}`:"En objetivo"}</td><td className="px-3 py-2"><select aria-label={`Seguimiento ${p.nombre}`} disabled={readonly||pending} className="h-8 rounded-md border border-transparent bg-transparent px-2 text-xs hover:border-border focus:border-primary focus:bg-card" value={p.estado} onChange={e=>update(i,{estado:e.target.value as NaipeMeta["estado"]})}>{["Pendiente","En trabajo","Listo"].map(s=><option key={s}>{s}</option>)}</select></td></tr>
     {desgloseAbierto===p.nombre&&variantesCatalogo.length>0&&<tr className="border-t border-border bg-bg-subtle/40"><td colSpan={8} className="px-3 py-3"><div className="space-y-2"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">Desglose de {p.nombre} por variante</p><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" aria-label={`Más opciones de ${p.nombre}`} disabled={readonly||pending}><MoreVertical className="size-3.5"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>setAgregarVarianteAbierto(p.nombre)}><Plus className="size-3.5"/>Agregar variante</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><div className="flex flex-wrap gap-3">{variantesCatalogo.map(v=><label key={v} className="text-xs">{v}<Input aria-label={`Objetivo ${p.nombre} ${v}`} className="mt-1 h-8 w-20 text-xs" type="number" min={0} max={1000} step={1} disabled={readonly||pending} value={p.desglose?.[v]??""} onChange={e=>{const n=Number(e.target.value);const desglose={...p.desglose};if(e.target.value===""){delete desglose[v];}else if(Number.isInteger(n)&&n>=0&&n<=1000){desglose[v]=n;}update(i,{desglose:Object.keys(desglose).length?desglose:undefined});}}/></label>)}</div>{desbalanceado&&<p role="alert" className="text-xs text-danger">La suma del desglose ({Object.values(p.desglose??{}).reduce((a,b)=>a+b,0)}) no coincide con el Objetivo total ({p.objetivo}).</p>}{agregarVarianteAbierto===p.nombre&&<form className="flex items-center gap-2" onSubmit={e=>{e.preventDefault();agregarVarianteDesdeEcualizacion(p.nombre);}}><Input aria-label={`Nueva variante de ${p.nombre}`} autoFocus className="h-8 w-32 text-xs" maxLength={30} placeholder='Ej. 16"' value={nuevaVarianteNombre} onChange={e=>setNuevaVarianteNombre(e.target.value)} disabled={pending}/><Button type="submit" size="sm" className="h-8 text-xs" disabled={pending||!nuevaVarianteNombre.trim()}>Agregar</Button><Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={cerrarAgregarVariante}>Cancelar</Button></form>}{agregarVarianteAbierto===p.nombre&&nuevaVarianteError&&<p role="alert" className="text-xs text-danger">{nuevaVarianteError}</p>}</div></td></tr>}
     </Fragment>;
    })}</tbody><tfoot className="border-t border-border bg-bg-subtle font-semibold"><tr><td className="px-3 py-2">Total</td><td className="px-3 py-2">{total}</td><td className="px-3 py-2">{total?100:0}%</td><td className="px-3 py-2">{target}</td><td className="px-3 py-2">{target?100:0}%</td><td className="px-3 py-2">{previous}</td><td/><td className="px-3 py-2">{plans.filter(p=>p.estado==="Listo").length}/{plans.length} listos</td></tr></tfoot></table></div>
   <p className="border-t border-border px-3 py-2 text-[11px] text-fg-secondary">{sinMeta?`${sinMeta} naipes sin objetivo. `:""}Los porcentajes se recalculan sobre cada total y suman 100% cuando hay integrantes. El anterior incluye todos sus participantes. Las variantes de tamaño y voz se agrupan por naipe.</p>
  </div>:<div className="grid items-start gap-3 lg:grid-cols-[240px_1fr_auto]">
   <div className="space-y-3 rounded-xl border border-border bg-card p-3">
    <h2 className="text-sm font-semibold">Estructura de la formación</h2>
    {readonly&&<p className="rounded-lg bg-bg-subtle p-2 text-xs">Edición cerrada: elegí una edición abierta o prepará la próxima para editar.</p>}
    <Button className="h-8 w-full text-xs" disabled={readonly||pending} onClick={()=>setWizardOpen(true)}><Wand2 className="size-4"/>{formacion.secciones.length?"Rehacer con el asistente":"Iniciar asistente"}</Button>
    <label className="block text-xs">Cantidad de posiciones<select aria-label="Cantidad de posiciones" className="mt-1 h-8 w-full rounded-lg border border-border bg-card px-2 text-sm" value={source} onChange={e=>setSource(e.target.value as "actual"|"objetivo")}><option value="actual">Integrantes actuales</option><option value="objetivo">Cantidades objetivo</option></select></label>
    {formacion.secciones.length>0&&<>
     <div className="grid grid-cols-2 gap-2">
      <label className="text-xs">Ancho de mitad<Input className="mt-1 h-8 text-xs" type="number" min={1} max={40} disabled={readonly||pending} value={formacion.anchoMitad} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=40){setFormacion(f=>({...f,anchoMitad:n}));setFormacionDirty(true);}}}/></label>
      <label className="text-xs">Ancho pasillo<Input className="mt-1 h-8 text-xs" type="number" min={0} max={20} disabled={readonly||pending} value={formacion.anchoPasillo} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=0&&n<=20){setFormacion(f=>({...f,anchoPasillo:n}));setFormacionDirty(true);}}}/></label>
     </div>
     <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={formacion.espejarDerecha} disabled={readonly||pending} onChange={e=>{setFormacion(f=>({...f,espejarDerecha:e.target.checked}));setFormacionDirty(true);}}/>Espejar lado derecho</label>
     <div className="space-y-1.5">
      <p className="text-xs font-semibold">Secciones (adelante → atrás)</p>
      {formacionEfectiva.secciones.map((s,i)=><div key={s.id} className={`space-y-1 rounded-lg border p-2 text-xs ${seccionSel===i?"border-primary bg-primary/5":"border-border"}`}>
       <div role="button" tabIndex={0} className="flex w-full items-center justify-between gap-1 text-left" onClick={()=>setSeccionSel(i)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSeccionSel(i);}}}>
        <span className="truncate font-medium" title={`${i+1}. ${s.nombre}`}>{i+1}. {s.nombre}</span>
        <span className="flex shrink-0 items-center gap-0.5">
         {s.naipes.length>1&&<Button variant="outline" size="icon-sm" aria-label={ajustesSeccionAbiertos===s.id?`Ocultar ajustes de ${s.nombre}`:`Ajustes de ${s.nombre}`} aria-expanded={ajustesSeccionAbiertos===s.id} onClick={e=>{e.stopPropagation();setAjustesSeccionAbiertos(a=>a===s.id?null:s.id);}}><Settings2 className="size-3.5"/></Button>}
         <Button variant="outline" size="icon-sm" aria-label={`Subir ${s.nombre}`} disabled={readonly||pending||i===0} onClick={e=>{e.stopPropagation();moverSeccion(s.id,-1);}}><ArrowUp className="size-3.5"/></Button>
         <Button variant="outline" size="icon-sm" aria-label={`Bajar ${s.nombre}`} disabled={readonly||pending||i===formacionEfectiva.secciones.length-1} onClick={e=>{e.stopPropagation();moverSeccion(s.id,1);}}><ArrowDown className="size-3.5"/></Button>
         <Button variant="outline" size="icon-sm" aria-label={`Eliminar ${s.nombre}`} disabled={readonly||pending} onClick={e=>{e.stopPropagation();eliminarSeccion(s.id);}}><Trash2 className="size-3.5"/></Button>
        </span>
       </div>
       {s.naipes.length>1&&<p className="text-fg-secondary">{s.grilla.flat().filter(Boolean).length} de {s.grilla.flat().length} casilleros pintados</p>}
       {s.naipes.length>1&&ajustesSeccionAbiertos===s.id&&<div className="flex items-center gap-3 border-t border-border pt-1.5">
        <label className="flex items-center gap-1.5 text-fg-secondary">Ancho<Input aria-label={`Ancho propio de ${s.nombre}`} className="h-6 w-12 text-xs" type="number" min={1} max={40} placeholder={String(formacion.anchoMitad)} disabled={readonly||pending||s.filas!==undefined} value={s.filas!==undefined?anchoSeccion(s,formacion.anchoMitad,cantidadPorNaipe):(s.ancho??"")} onChange={e=>{const n=Number(e.target.value);const ancho=e.target.value===""?undefined:(Number.isInteger(n)&&n>=1&&n<=40?n:s.ancho);setFormacion(f=>({...f,secciones:f.secciones.map(x=>x.id===s.id?{...x,ancho}:x)}));setFormacionDirty(true);}}/></label>
        <label className="flex items-center gap-1.5 text-fg-secondary">Filas<Input aria-label={`Filas de ${s.nombre}`} className="h-6 w-12 text-xs" type="number" min={1} max={200} placeholder="Auto" disabled={readonly||pending} value={s.filas??""} onChange={e=>{const n=Number(e.target.value);const filas=e.target.value===""?undefined:(Number.isInteger(n)&&n>=1&&n<=200?n:s.filas);setFormacion(f=>({...f,secciones:f.secciones.map(x=>x.id===s.id?{...x,filas}:x)}));setFormacionDirty(true);}}/></label>
       </div>}
      </div>)}
      {!nuevaSeccionAbierta?<Button variant="outline" className="h-8 w-full text-xs" disabled={readonly||pending||!naipesDisponiblesNueva.length} onClick={()=>setNuevaSeccionAbierta(true)}><Plus className="size-3.5"/>Agregar sección</Button>
      :<div className="space-y-2 rounded-lg border border-border p-2">
        <p className="text-xs font-semibold">Nueva sección</p>
        <div className="flex flex-wrap gap-1.5">{naipesDisponiblesNueva.map(n=><button key={n} type="button" onClick={()=>setNuevaSeccionNaipes(nuevaSeccionNaipes.includes(n)?nuevaSeccionNaipes.filter(x=>x!==n):[...nuevaSeccionNaipes,n])} className={`rounded-full border px-2.5 py-1 text-xs ${nuevaSeccionNaipes.includes(n)?"border-primary bg-primary/10 text-primary":"border-border hover:bg-bg-subtle"}`}>{n}</button>)}</div>
        {nuevaSeccionNaipes.length>1&&<Input className="h-8 text-xs" placeholder="Nombre de la sección (ej. Cocina)" value={nuevaSeccionNombre} onChange={e=>setNuevaSeccionNombre(e.target.value)}/>}
        <div className="flex gap-2"><Button size="sm" className="h-8 flex-1 text-xs" disabled={!nuevaSeccionNaipes.length} onClick={agregarSeccionNueva}>Agregar</Button><Button size="sm" variant="outline" className="h-8 text-xs" onClick={cerrarNuevaSeccion}>Cancelar</Button></div>
       </div>}
     </div>
    </>}
    {!formacion.secciones.length&&<p className="text-xs text-fg-secondary">Todavía no hay una formación armada. Usá el asistente para generar las dos mitades con el pasillo central.</p>}
   </div>
   <div className="min-w-0 space-y-3">
    <div className="rounded-xl border border-border bg-card p-4">
     <div className="mb-3 flex items-center justify-between gap-2 text-xs"><span className="font-semibold uppercase tracking-widest">↑ Frente de la batería</span><span className="flex items-center gap-2"><span>{source==="objetivo"?"Plan objetivo":"Formación actual"}</span><Button variant="outline" size="sm" className="h-7 text-xs" disabled={!formacion.secciones.length} onClick={exportarPlanoPng}><Download className="size-3.5"/>Exportar PNG</Button><Button size="sm" className="h-7 text-xs" disabled={readonly||pending||!formacionDirty} onClick={guardarFormacion}><Save className="size-3.5"/>{pending?"Guardando…":"Guardar formación"}</Button></span></div>
     {overlap>0&&<p role="alert" className="mb-3 rounded-lg bg-bg-subtle p-3 text-sm text-danger">Hay {overlap} posiciones superpuestas. Ajustá los anchos o lo pintado en las secciones mezcladas.</p>}
     {(faltantesPersonas.length>0||faltantesInstrumentos.length>0)&&<div className="mb-3 rounded-lg bg-bg-subtle text-sm text-danger">
      <button type="button" aria-expanded={alertasAbiertas} onClick={()=>setAlertasAbiertas(a=>!a)} className="flex w-full items-center justify-between gap-2 p-3 text-left font-medium">
       <span>{faltantesPersonas.length+faltantesInstrumentos.length} alerta{faltantesPersonas.length+faltantesInstrumentos.length===1?"":"s"} de faltante</span>
       <ChevronDown className={`size-3.5 shrink-0 transition-transform ${alertasAbiertas?"rotate-180":""}`}/>
      </button>
      {alertasAbiertas&&<div className="space-y-1.5 px-3 pb-3">
       {faltantesPersonas.length>0&&<p role="alert">{faltantesPersonas.map(f=>`Te faltan ${f.faltan} persona${f.faltan===1?"":"s"} para ${f.nombre}`).join(". ")}.</p>}
       {faltantesInstrumentos.length>0&&<p role="alert">{faltantesInstrumentos.map(f=>`Te faltan ${f.faltan} instrumento${f.faltan===1?"":"s"} de ${f.nombre}`).join(". ")}.</p>}
      </div>}
     </div>}
     {seccionFocada&&<div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs"><span>Sección seleccionada: <strong>{seccionFocada.nombre}</strong></span><span className="flex items-center gap-1">
       <Button variant="outline" size="icon-sm" aria-label={`Mover ${seccionFocada.nombre} más adelante`} disabled={readonly||pending||seccionSel===0} onClick={()=>moverSeccion(seccionFocada.id,-1)}><ArrowUp className="size-3.5"/></Button>
       <Button variant="outline" size="icon-sm" aria-label={`Mover ${seccionFocada.nombre} más atrás`} disabled={readonly||pending||seccionSel===formacionEfectiva.secciones.length-1} onClick={()=>moverSeccion(seccionFocada.id,1)}><ArrowDown className="size-3.5"/></Button>
      </span></div>}
     {seleccion.size>0&&<div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
      <span>{seleccion.size} casillero{seleccion.size===1?"":"s"} seleccionado{seleccion.size===1?"":"s"}</span>
      <span className="flex items-center gap-1.5">
       <Button variant="outline" size="sm" className="h-7 text-xs" onClick={copiarSeleccion}>Copiar</Button>
       <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={()=>setSeleccion(new Set())}>Deseleccionar</Button>
      </span>
     </div>}
     <div className="relative max-h-[560px] overflow-auto rounded-xl bg-bg-subtle p-2 text-center">
      <svg role="img" aria-label="Plano de formación por mitades" width={anchoTotal*28+8} height={Math.max(1,altoTotal)*28+8} style={{display:"inline-block",cursor:arrastrandoDesde?"grabbing":undefined}}
       onMouseDown={e=>{
        // El lazo arranca al apretar sobre el fondo vacío del plano, o sobre
        // cualquier casillero (pintado o no) si se mantiene Shift. Un casillero
        // pintado sin Shift arranca su propio arrastre para moverlo (ver el
        // onMouseDown de cada celda), así que acá no hace falta distinguirlo: si ya
        // se inició un arrastre de celda, no se pisa con el lazo.
        if(readonly||pending||e.button!==0||arrastrandoDesde)return;
        const target=e.target as SVGElement;
        const grupo=target.closest("g");
        const celdaPintada=grupo?.getAttribute("data-pintada")==="true";
        if(celdaPintada&&!shiftApretado)return;
        const rect=e.currentTarget.getBoundingClientRect();
        const x=e.clientX-rect.left,y=e.clientY-rect.top;
        const lado=x<formacionEfectiva.anchoMitad*28+4?"izquierda":"derecha";
        setLazo({lado,x0:x,y0:y,x1:x,y1:y});
       }}
       onMouseMove={e=>{
        if(lazo){
         const rect=e.currentTarget.getBoundingClientRect();
         setLazo({...lazo,x1:e.clientX-rect.left,y1:e.clientY-rect.top});
        }
       }}
       onMouseUp={()=>{
        // Soltar sobre una celda ya limpia `arrastrandoDesde` en su propio
        // onMouseUp (con stopPropagation, así que este handler del <svg> no llega a
        // ejecutarse ahí). Si llegamos hasta acá con un arrastre en curso, es porque
        // se soltó fuera de cualquier casillero (fondo o pasillo): se cancela sin
        // mover nada.
        if(arrastrandoDesde)setArrastrandoDesde(null);
        if(!lazo)return;
        const xMin=Math.min(lazo.x0,lazo.x1),xMax=Math.max(lazo.x0,lazo.x1),yMin=Math.min(lazo.y0,lazo.y1),yMax=Math.max(lazo.y0,lazo.y1);
        const celdasLado=lazo.lado==="izquierda"?izquierda:derecha;
        const nuevos=new Set(seleccion);
        celdasLado.forEach(c=>{
         const seccion=formacionEfectiva.secciones.find(s=>s.id===c.seccionId);
         if((seccion?.naipes.length??0)<=1)return;
         const offsetX=lazo.lado==="izquierda"?0:(formacionEfectiva.anchoMitad+formacionEfectiva.anchoPasillo);
         const px=(c.x+offsetX)*28+4,py=c.y*28+4;
         if(px+22>=xMin&&px<=xMax&&py+22>=yMin&&py<=yMax)nuevos.add(claveCelda({lado:lazo.lado,seccionId:c.seccionId,fila:c.fila,col:c.col}));
        });
        setSeleccion(nuevos);
        setLazo(null);
       }}>
       <defs><pattern id="formacion-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeOpacity=".08"/></pattern></defs>
       <rect width="100%" height="100%" fill="url(#formacion-grid)"/>
       {formacionEfectiva.anchoPasillo>0&&<rect x={formacionEfectiva.anchoMitad*28+4} y={4} width={formacionEfectiva.anchoPasillo*28-8} height={Math.max(1,altoTotal)*28-8} fill="currentColor" fillOpacity=".04" stroke="currentColor" strokeOpacity=".12" strokeDasharray="4 3"/>}
       {izquierda.map((c,n)=>{
        const seccion=formacionEfectiva.secciones.find(s=>s.id===c.seccionId);
        const esMezclada=(seccion?.naipes.length??0)>1;
        const px=c.x*28+4,py=c.y*28+4;
        const {naipe,variante}=c.naipe?naipeYVarianteDe(seccion,c.naipe):{naipe:null,variante:null};
        const ubicacion:Ubicacion={lado:"izquierda",seccionId:c.seccionId,fila:c.fila,col:c.col};
        const seleccionada=seleccion.has(claveCelda(ubicacion));
        return <g key={`i${n}`}
         data-pintada={c.naipe?"true":"false"}
         onMouseDown={e=>{
          if(e.button!==0||readonly||pending||!esMezclada||!seccion)return;
          if(shiftApretado||!c.naipe)return; // Shift o casillero vacío: que gane el lazo del <svg>
          e.stopPropagation();
          setArrastrandoDesde(ubicacion);
         }}
         onMouseUp={e=>{
          if(!arrastrandoDesde||!esMezclada||readonly||pending||!seccion)return;
          e.stopPropagation();
          if(seleccion.size>1&&seleccion.has(claveCelda(arrastrandoDesde))){
           const ubicaciones=[...seleccion].map(k=>{const [lado,seccionId,fila,col]=k.split(":");return {lado:lado as "izquierda"|"derecha",seccionId,fila:Number(fila),col:Number(col)};});
           moverBloque(ubicaciones,arrastrandoDesde,ubicacion);
          } else {
           moverCelda(arrastrandoDesde,ubicacion);
          }
          setArrastrandoDesde(null);
         }}
         onClick={e=>{
          const idx=formacionEfectiva.secciones.findIndex(s=>s.id===c.seccionId);if(idx>=0)setSeccionSel(idx);
          if(!esMezclada||readonly||pending||!seccion)return;
          // Un arrastre que empezó y terminó en esta misma celda (sin soltar en otro
          // destino) no tiene que abrir el popover de pintado — solo un clic real.
          if(arrastrandoDesde){setArrastrandoDesde(null);return;}
          setUltimoClick(ubicacion);
          if(e.ctrlKey||e.metaKey){
           const clave=claveCelda(ubicacion);
           const nuevos=new Set(seleccion);
           if(nuevos.has(clave))nuevos.delete(clave);else nuevos.add(clave);
           setSeleccion(nuevos);
           return;
          }
          setSeleccion(new Set());
          const rect=e.currentTarget.ownerSVGElement!.getBoundingClientRect();setPintarObjetivo({lado:"izquierda",seccionId:c.seccionId,fila:c.fila,col:c.col,px:rect.left+px+13,py:rect.top+py+13});
         }} style={{cursor:esMezclada?(c.naipe?(arrastrandoDesde?"grabbing":"grab"):"pointer"):"default"}}>
         <title>{c.naipe??"Vacío"} · {seccion?.nombre}</title>
         <rect x={px} y={py} width={22} height={22} rx={5} fill={naipe?colorDe(naipe):"transparent"} stroke={seleccionada?"var(--primary)":arrastrandoDesde&&claveCelda(ubicacion)===claveCelda(arrastrandoDesde)?"var(--primary)":c.naipe?(seccionFocada?.id===c.seccionId?"var(--foreground)":"none"):"var(--border)"} strokeWidth={seleccionada||(arrastrandoDesde&&claveCelda(ubicacion)===claveCelda(arrastrandoDesde))?2:c.naipe?(seccionFocada?.id===c.seccionId?1.5:0):1} strokeDasharray={c.naipe?undefined:"3 2"} opacity={arrastrandoDesde&&claveCelda(ubicacion)===claveCelda(arrastrandoDesde)?0.5:1}/>
         {variante&&<text x={px+11} y={py+15} textAnchor="middle" fontSize="8" fill="#fff" style={{pointerEvents:"none"}}>{variante}</text>}
        </g>;
       })}
       {derecha.map((c,n)=>{
        const seccion=formacionEfectiva.secciones.find(s=>s.id===c.seccionId);
        const esMezclada=(seccion?.naipes.length??0)>1;
        // Cualquier casillero de la derecha se puede editar a mano, con o sin espejo
        // activo: con espejo, editarlo lo desvincula (deja de recalcularse solo).
        const px=(formacionEfectiva.anchoMitad+formacionEfectiva.anchoPasillo+c.x)*28+4,py=c.y*28+4;
        const {naipe,variante}=c.naipe?naipeYVarianteDe(seccion,c.naipe):{naipe:null,variante:null};
        const ubicacion:Ubicacion={lado:"derecha",seccionId:c.seccionId,fila:c.fila,col:c.col};
        const seleccionada=seleccion.has(claveCelda(ubicacion));
        // Indicador quieto (sin acción, sin ícono de deshacer): un casillero de la
        // derecha que ya se desvinculó del espejo — a mano o al moverlo/pintarlo —
        // queda marcado con un pin, así se distingue de un vistazo cuál sigue
        // siguiendo al espejo y cuál ya no se va a actualizar solo.
        const desvinculada=!!(formacionEfectiva.espejarDerecha&&seccion?.desvinculadaDerecha?.[c.fila]?.[c.col]);
        return <g key={`d${n}`}
         data-pintada={c.naipe?"true":"false"}
         onMouseDown={e=>{
          if(e.button!==0||readonly||pending||!esMezclada||!seccion)return;
          if(shiftApretado||!c.naipe)return;
          e.stopPropagation();
          setArrastrandoDesde(ubicacion);
         }}
         onMouseUp={e=>{
          if(!arrastrandoDesde||!esMezclada||readonly||pending||!seccion)return;
          e.stopPropagation();
          if(seleccion.size>1&&seleccion.has(claveCelda(arrastrandoDesde))){
           const ubicaciones=[...seleccion].map(k=>{const [lado,seccionId,fila,col]=k.split(":");return {lado:lado as "izquierda"|"derecha",seccionId,fila:Number(fila),col:Number(col)};});
           moverBloque(ubicaciones,arrastrandoDesde,ubicacion);
          } else {
           moverCelda(arrastrandoDesde,ubicacion);
          }
          setArrastrandoDesde(null);
         }}
         onClick={e=>{
          const idx=formacionEfectiva.secciones.findIndex(s=>s.id===c.seccionId);if(idx>=0)setSeccionSel(idx);
          if(!esMezclada||readonly||pending||!seccion)return;
          if(arrastrandoDesde){setArrastrandoDesde(null);return;}
          setUltimoClick(ubicacion);
          if(e.ctrlKey||e.metaKey){
           const clave=claveCelda(ubicacion);
           const nuevos=new Set(seleccion);
           if(nuevos.has(clave))nuevos.delete(clave);else nuevos.add(clave);
           setSeleccion(nuevos);
           return;
          }
          setSeleccion(new Set());
          const rect=e.currentTarget.ownerSVGElement!.getBoundingClientRect();setPintarObjetivo({lado:"derecha",seccionId:c.seccionId,fila:c.fila,col:c.col,px:rect.left+px+13,py:rect.top+py+13});
         }} style={{cursor:esMezclada?(c.naipe?(arrastrandoDesde?"grabbing":"grab"):"pointer"):"default"}}>
         <title>{c.naipe??"Vacío"} · {seccion?.nombre}{desvinculada?" (desvinculado del espejo)":""}</title>
         <rect x={px} y={py} width={22} height={22} rx={5} fill={naipe?colorDe(naipe):"transparent"} stroke={seleccionada?"var(--primary)":arrastrandoDesde&&claveCelda(ubicacion)===claveCelda(arrastrandoDesde)?"var(--primary)":c.naipe?(seccionFocada?.id===c.seccionId?"var(--foreground)":"none"):"var(--border)"} strokeWidth={seleccionada||(arrastrandoDesde&&claveCelda(ubicacion)===claveCelda(arrastrandoDesde))?2:c.naipe?(seccionFocada?.id===c.seccionId?1.5:0):1} strokeDasharray={c.naipe?undefined:"3 2"} opacity={arrastrandoDesde&&claveCelda(ubicacion)===claveCelda(arrastrandoDesde)?0.5:1}/>
         {variante&&<text x={px+11} y={py+15} textAnchor="middle" fontSize="8" fill="#fff" style={{pointerEvents:"none"}}>{variante}</text>}
        </g>;
       })}
       {lazo&&<rect x={Math.min(lazo.x0,lazo.x1)} y={Math.min(lazo.y0,lazo.y1)} width={Math.abs(lazo.x1-lazo.x0)} height={Math.abs(lazo.y1-lazo.y0)} fill="var(--primary)" fillOpacity=".1" stroke="var(--primary)" strokeDasharray="3 2" style={{pointerEvents:"none"}}/>}
      </svg>
     </div>
     <div className="mt-3 flex flex-wrap gap-3">{data.rows.map((r,i)=><span key={r.nombre} className="flex items-center gap-1.5 text-xs"><span className="size-3 rounded" style={{background:COLORS[i%COLORS.length]}}/>{r.nombre} ({cantidadPorNaipe[r.nombre]??0})</span>)}</div>
    </div>
    <p className="text-xs text-fg-secondary">Plano esquemático, sin escala en metros. El pasillo central queda reservado para los directores.</p>
    <div className="rounded-lg border border-border bg-card text-xs">
     <button type="button" aria-expanded={ayudaAbierta} onClick={()=>setAyudaAbierta(a=>!a)} className="flex w-full items-center justify-between gap-2 p-2 text-left font-semibold">
      <span>Comandos del plano</span>
      <ChevronDown className={`size-3.5 shrink-0 text-fg-tertiary transition-transform ${ayudaAbierta?"rotate-180":""}`}/>
     </button>
     {ayudaAbierta&&<ul className="space-y-1 border-t border-border px-2 py-2 text-fg-secondary">
      <li><strong className="text-foreground">Clic</strong> en un casillero vacío de una sección mezclada: elegir qué naipe/variante va ahí.</li>
      <li><strong className="text-foreground">Arrastrar</strong> un casillero pintado a uno vacío: lo mueve.</li>
      <li><strong className="text-foreground">Arrastrar</strong> un casillero pintado sobre otro pintado: los intercambia (swap).</li>
      <li><strong className="text-foreground">Ctrl/Cmd+clic</strong>: suma o saca un casillero de la selección.</li>
      <li><strong className="text-foreground">Arrastrar un lazo</strong> sobre el plano: selecciona todos los casilleros que toca.</li>
      <li><strong className="text-foreground">Shift+arrastrar</strong>: dibuja el lazo aunque empiece sobre un casillero pintado (sin Shift, ahí arrancaría a moverlo).</li>
      <li><strong className="text-foreground">Ctrl/Cmd+C</strong>: copia la selección actual.</li>
      <li><strong className="text-foreground">Ctrl/Cmd+V</strong>: pega lo copiado, anclado al último casillero clickeado.</li>
      <li>Elegir un naipe/variante con <strong className="text-foreground">varios casilleros seleccionados</strong>: los pinta todos de una vez.</li>
     </ul>}
    </div>
   </div>
   <div className={`space-y-1.5 rounded-xl border border-border bg-card p-3 ${panelProgresoAbierto?"w-48":""}`}>
    <button type="button" aria-expanded={panelProgresoAbierto} aria-label="Progreso" onClick={()=>setPanelProgresoAbierto(a=>!a)} className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold">
     {panelProgresoAbierto&&<span aria-hidden="true">Progreso</span>}
     <ChevronsDownUp className={`size-3.5 shrink-0 text-fg-tertiary ${panelProgresoAbierto?"":"rotate-90"}`}/>
    </button>
    {panelProgresoAbierto&&<ul className="space-y-1 text-xs">{progresoPorNaipe.map(item=><li key={item.label} className="flex items-center justify-between gap-2 tabular-nums"><span className="truncate text-fg-secondary">{item.label}</span><span className={item.pintadas>=item.total&&item.total>0?"font-medium text-success":""}>{item.pintadas}/{item.total}</span></li>)}</ul>}
   </div>
  </div>}
  <Popover open={!!pintarObjetivo} onOpenChange={open=>{if(!open){setPintarObjetivo(null);setPintarNaipe(null);}}}>
   <PopoverAnchor asChild><div style={{position:"fixed",left:pintarObjetivo?.px??0,top:pintarObjetivo?.py??0,width:1,height:1,pointerEvents:"none"}}/></PopoverAnchor>
   <PopoverContent className="w-56" onOpenAutoFocus={e=>e.preventDefault()}>
    {!mostrarPasoVariante?<>
     <p className="mb-1 text-xs font-semibold">Elegir naipe</p>
     <div className="mb-1.5 flex flex-wrap gap-1.5">
      {(seccionPintando?.naipes??[]).map(n=><button key={n} type="button" aria-label={`Elegir ${n}`} className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-bg-subtle" onClick={()=>{
        const variantes=data.catalogoVariantes[n]??[];
        if(variantes.length>0){setPintarNaipe(n);return;}
        if(pintarObjetivo)pintarCelda(pintarObjetivo.seccionId,pintarObjetivo.lado,pintarObjetivo.fila,pintarObjetivo.col,n);
       }}><span className="size-2.5 rounded-full" style={{background:colorDe(n)}}/>{n}</button>)}
      {!seccionPintando?.naipes.length&&<p className="text-xs text-fg-tertiary">Esta sección no tiene naipes configurados.</p>}
     </div>
    </>:<>
     <div className="mb-1 flex items-center gap-1"><Button type="button" variant="ghost" size="icon-sm" aria-label="Volver a elegir naipe" onClick={()=>setPintarNaipe(null)}><ArrowUp className="size-3.5 -rotate-90"/></Button><p className="text-xs font-semibold">Variante de {pintarNaipe}</p></div>
     <div className="flex flex-wrap gap-1.5">
      {variantesDelNaipePintando.map(v=>{
       const objetivoVariante=metaPintando?.desglose?.[v];
       const pintadas=source==="objetivo"&&objetivoVariante!==undefined?contarPintadasVariante(v):null;
       return <button key={v} type="button" aria-label={`Pintar ${pintarNaipe} ${v}`} className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-bg-subtle" onClick={()=>{if(pintarObjetivo&&pintarNaipe)pintarCelda(pintarObjetivo.seccionId,pintarObjetivo.lado,pintarObjetivo.fila,pintarObjetivo.col,`${pintarNaipe} ${v}`);}}>
        <span className="size-2.5 rounded-full" style={{background:colorDe(pintarNaipe!)}}/>{v}
        {pintadas!==null&&<span className="text-fg-tertiary">· faltan {Math.max(0,objetivoVariante!-pintadas)}</span>}
       </button>;
      })}
     </div>
    </>}
   </PopoverContent>
  </Popover>
  <FormacionWizard open={wizardOpen} onOpenChange={setWizardOpen} nombresNaipes={data.rows.map(r=>r.nombre)} cantidadPorNaipe={Object.fromEntries(data.rows.map((r,i)=>[r.nombre,{actual:current[i],objetivo:goals[i]}]))} onConfirmar={({anchoMitad,anchoPasillo,espejarDerecha,secciones,source:src})=>{setFormacion({anchoMitad,anchoPasillo,espejarDerecha,secciones});setSource(src);setSeccionSel(0);setFormacionDirty(true);setMessage("");setError("");}}/>
  <Dialog open={preparar} onOpenChange={open=>{if(!pending)setPreparar(open);}}><DialogContent><DialogHeader><DialogTitle>Preparar Carnaval {data.proximoAnio}</DialogTitle><DialogDescription>Creá la próxima edición para editar objetivos y formación en paralelo. El Carnaval activo sigue vigente hasta que lo cierres.</DialogDescription></DialogHeader><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={copiar} onChange={e=>setCopiar(e.target.checked)}/>Copiar participantes del Carnaval anterior, sin pagos, beneficios ni entregas.</label><p className="text-xs text-fg-secondary">Las noches de Carnaval se pueden completar después desde Configuración.</p>{prepareError&&<p role="alert" className="text-sm text-danger">{prepareError}</p>}<Button disabled={pending} onClick={()=>{setPrepareError("");startTransition(async()=>{try{const result=await prepararCarnaval({anio:data.proximoAnio,copiarRitmistas:copiar});if(result.error){setPrepareError(result.error);return;}setPreparar(false);router.push(`${pathname}?edicion=${encodeURIComponent(result.edicionId!)}&vista=${tab}`);router.refresh();}catch{setPrepareError("No se pudo preparar la edición. Recargá e intentá nuevamente.");}});}}>{pending?"Preparando…":`Crear Carnaval ${data.proximoAnio}`}</Button></DialogContent></Dialog>
 </section>;
}
