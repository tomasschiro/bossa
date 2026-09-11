"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NaipeChips } from "./naipe-chips";
import { RitmistasDbTable } from "./ritmistas-db-table";
import { FichaRitmista } from "./ficha-ritmista";
import { AddRitmistaDialog } from "./add-ritmista-dialog";
import type { Naipe, Ritmista } from "@/lib/types";
import { fullName } from "@/lib/ritmistas-utils";
import { createRitmista } from "@/lib/actions";

interface RitmistasDbViewProps {
  initialRitmistas: Ritmista[];
  variantesPorNaipe: Record<string, string[]>;
}

export function RitmistasDbView({ initialRitmistas, variantesPorNaipe }: RitmistasDbViewProps) {
  const [ritmistas, setRitmistas] = useState<Ritmista[]>(initialRitmistas);
  const [search, setSearch] = useState("");
  const [naipeFilter, setNaipeFilter] = useState<Naipe | "Todos">("Todos");
  const [fichaOpen, setFichaOpen] = useState<Ritmista | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return ritmistas.filter((r) => {
      const matchesNaipe = naipeFilter === "Todos" || r.naipeReferencia === naipeFilter;
      const matchesSearch = fullName(r).toLowerCase().includes(search.toLowerCase());
      return matchesNaipe && matchesSearch;
    });
  }, [ritmistas, naipeFilter, search]);

  const handleSave = (updated: Ritmista) => {
    setRitmistas((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setFichaOpen(updated);
  };

  const handleCreate = (data: Omit<Ritmista, "id" | "historial">) => {
    startTransition(async () => {
      await createRitmista({
        nombre: data.nombre,
        apellido: data.apellido,
        dni: data.dni,
        telefono: data.telefono,
        nacimientoIso: data.nacimientoIso,
        naipeReferencia: data.naipeReferencia,
        talleRemera: data.talleRemera,
        calzado: data.calzado,
        nivel: data.nivel,
      });
      // El padrón se refresca al re-navegar; agregamos localmente para feedback inmediato.
      setRitmistas((prev) => [
        ...prev,
        { ...data, id: `tmp-${Date.now()}`, historial: [] },
      ]);
    });
  };

  if (fichaOpen) {
    return (
      <FichaRitmista
        ritmista={fichaOpen}
        edicion={null}
        variantesPorNaipe={variantesPorNaipe}
        onBack={() => setFichaOpen(null)}
        onSave={(updated) => handleSave(updated)}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Ritmistas</h1>
          <p className="text-[13px] text-fg-secondary">Padrón histórico completo</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>+ Nuevo ritmista</Button>
      </div>

      <AddRitmistaDialog open={addOpen} onOpenChange={setAddOpen} onCreate={handleCreate} variantesPorNaipe={variantesPorNaipe} />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative w-full sm:w-64 sm:shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-tertiary" />
          <Input
            placeholder="Buscar ritmista por nombre"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="h-6 w-px shrink-0 bg-border" />
        <NaipeChips value={naipeFilter} onChange={setNaipeFilter} compact />
      </div>

      <RitmistasDbTable
        ritmistas={filtered}
        onOpen={setFichaOpen}
        variantesPorNaipe={variantesPorNaipe}
        onInlineSaved={(updated) => setRitmistas((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))}
      />
    </div>
  );
}
