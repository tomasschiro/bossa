import { RitmistasEdView } from "@/components/ritmistas/ritmistas-ed-view";
import { RitmistasEdicionSelector } from "@/components/ritmistas/ritmistas-edicion-selector";
import { getRitmistasEdicion } from "@/lib/actions";
import { getNaipes } from "@/lib/naipes-actions";
import { getCarnaval } from "@/lib/carnaval";
import { contarInscripcionesPendientes } from "@/lib/inscripciones-actions";
import { InscripcionesButton } from "@/components/inscripciones/inscripciones-button";
import Link from "next/link";

export default async function RitmistasCarnavalPage({ searchParams }: { searchParams: Promise<{ edicion?: string }> }) {
  const { edicion: edicionParam } = await searchParams;
  const { actual, preparada, proximoAnio } = await getCarnaval();
  const opciones = [actual, preparada].filter((e): e is NonNullable<typeof e> => e !== null);
  const seleccionada = opciones.find((e) => e.id === edicionParam) ?? actual ?? preparada;
  const [rows, naipes, pendientes] = await Promise.all([getRitmistasEdicion(seleccionada?.id), getNaipes(), contarInscripcionesPendientes()]);
  const variantesPorNaipe = Object.fromEntries(naipes.map((n) => [n.nombre, n.variantes.map((v) => v.nombre)]));
  return (
    <>
      {!seleccionada && <p className="mb-4 rounded-xl border border-border bg-card p-4 text-sm">Prepará el Carnaval {proximoAnio} desde <Link className="font-semibold text-primary underline" href="/configuracion">Configuración</Link>.</p>}
      <RitmistasEdView
        key={seleccionada?.id ?? "nueva"}
        initialRows={rows}
        anio={seleccionada?.anioCarnaval ?? proximoAnio}
        edicionId={seleccionada?.id}
        readOnly={!seleccionada}
        variantesPorNaipe={variantesPorNaipe}
        headerExtra={<>{opciones.length > 1 && <RitmistasEdicionSelector opciones={opciones} seleccionadaId={seleccionada?.id ?? ""} />}<InscripcionesButton pendientes={pendientes} /></>}
      />
    </>
  );
}
