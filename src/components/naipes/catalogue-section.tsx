"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
export function CatalogueSection({children}:{children:React.ReactNode}) {
  const [open,setOpen]=useState(false);
  return <section className="rounded-xl border border-border bg-card px-4 py-3"><button type="button" aria-expanded={open} onClick={()=>setOpen(!open)} className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold">Administrar catálogo de naipes<ChevronDown className={`size-4 transition-transform ${open?"rotate-180":""}`}/></button><div hidden={!open} className="mt-5">{children}</div></section>;
}
