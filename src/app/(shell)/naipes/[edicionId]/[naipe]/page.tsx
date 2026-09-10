import { notFound } from "next/navigation";
import { getPlanNaipes } from "@/lib/naipes-plan-actions";
import { requireBateria } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NaipeFicha } from "@/components/naipes/naipe-ficha";
export default async function NaipeFichaPage({params,searchParams}:{params:Promise<{edicionId:string;naipe:string}>;searchParams:Promise<{confirmados?:string}>}) {
 const {edicionId,naipe}=await params;const {bateriaId}=await requireBateria();
 if(!await prisma.edicion.findUnique({where:{id:edicionId,bateriaId},select:{id:true}}))notFound();
 const data=await getPlanNaipes(edicionId);const row=data.rows.find(r=>r.nombre===naipe);
 if(!row||!data.edicion)notFound();
 return <NaipeFicha key={`${edicionId}:${naipe}`} row={row} rows={data.rows} edicion={data.edicion} confirmados={(await searchParams).confirmados==="1"}/>;
}
