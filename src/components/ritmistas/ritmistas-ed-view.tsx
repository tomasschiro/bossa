"use client";
import { useNaipes } from "@/components/naipes/naipes-context";

import { useMemo, useState, useTransition } from "react";
import { Search, Printer, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NaipeChips } from "./naipe-chips";
import { MetricCard } from "./metric-card";
import { RitmistasEdTable } from "./ritmistas-ed-table";
import { FichaRitmista } from "./ficha-ritmista";
import { AddRitmistaDialog } from "./add-ritmista-dialog";
import { ImportRitmistasDialog } from "./import-ritmistas-dialog";
import type { EstadoLlegada, Naipe, Ritmista, RitmistaEdicion } from "@/lib/types";
import { ESTADOS_LLEGADA } from "@/lib/types";
import { naipeGroupOf } from "@/lib/ritmistas-utils";
import { createRitmista } from "@/lib/actions";

const ESTADO_COLOR: Record<EstadoLlegada, string> = {
  Confirmado: "text-success",
  "En duda": "text-warning",
  "No confirmado": "text-danger",
};

interface Row {
  ritmista: Ritmista;
  edicion: RitmistaEdicion;
}

interface RitmistasEdViewProps {
  initialRows: Row[];
  anio: number;
  edicionId?: string;
  readOnly: boolean;
  headerExtra?: React.ReactNode;
}

export function RitmistasEdView({ initialRows, anio, edicionId, readOnly, headerExtra }: RitmistasEdViewProps) {
  const catalogo = useNaipes();
  const NAIPES = [...new Set([...catalogo, ...initialRows.map((r) => naipeGroupOf(r.edicion.naipe))])];
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [search, setSearch] = useState("");
  const [naipeFilter, setNaipeFilter] = useState<Naipe | "Todos">("Todos");
  const [estadoFilter, setEstadoFilter] = useState<EstadoLlegada | "Todos">("Todos");
  const [naipeStatIndex, setNaipeStatIndex] = useState(0);
  const [estadoStatIndex, setEstadoStatIndex] = useState(0);
  const [fichaOpen, setFichaOpen] = useState<Row | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [, startTransition] = useTransition();

  const filteredRows = useMemo(() => {
    return rows.filter(({ ritmista, edicion }) => {
      const matchesNaipe = naipeFilter === "Todos" || naipeGroupOf(edicion.naipe) === naipeFilter;
      const matchesEstado = estadoFilter === "Todos" || edicion.estadoLlegada === estadoFilter;
      const matchesSearch = `${ritmista.nombre} ${ritmista.apellido}`
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesNaipe && matchesEstado && matchesSearch;
    });
  }, [rows, naipeFilter, estadoFilter, search]);

  const naipeStatName = NAIPES[naipeStatIndex % Math.max(NAIPES.length, 1)] ?? "Sin naipes";
  const naipeStatCount = rows.filter((r) => naipeGroupOf(r.edicion.naipe) === naipeStatName).length;

  const estadoStats: { name: EstadoLlegada; count: number }[] = ESTADOS_LLEGADA.map((name) => ({
    name,
    count: rows.filter((r) => r.edicion.estadoLlegada === name).length,
  }));
  const estadoStat = estadoStats[estadoStatIndex % estadoStats.length];

  const handleExport = () => {
    window.print();
  };

  const handleSave = (updatedRitmista: Ritmista, updatedEdicion: RitmistaEdicion | null) => {
    setRows((prev) =>
      prev.map((row) =>
        row.ritmista.id === updatedRitmista.id
          ? { ritmista: updatedRitmista, edicion: updatedEdicion ?? row.edicion }
          : row,
      ),
    );
    setFichaOpen(
      updatedEdicion ? { ritmista: updatedRitmista, edicion: updatedEdicion } : null,
    );
  };

  const handleCreateRitmista = (data: Omit<Ritmista, "id" | "historial">) => {
    startTransition(async () => {
      await createRitmista({
        edicionId,
        nombre: data.nombre,
        apellido: data.apellido,
        dni: data.dni,
        telefono: data.telefono,
        nacimientoIso: data.nacimientoIso,
        naipeReferencia: data.naipeReferencia,
        talleRemera: data.talleRemera,
        calzado: data.calzado,
      });
      // Feedback inmediato en la tabla; el server component confirma con datos reales al re-navegar.
      const tmpId = `tmp-${Date.now()}`;
      const nuevoRitmista: Ritmista = {
        ...data,
        id: tmpId,
        historial: [{ naipe: data.naipeReferencia, periodo: `${anio}`, desde: anio }],
      };
      const nuevaEdicion: RitmistaEdicion = {
        id: `tmp-re-${Date.now()}`,
        ritmistaId: tmpId,
        edicionAnio: anio,
        naipe: data.naipeReferencia,
        estadoLlegada: "No confirmado",
        movimientos: [],
        entregas: [],
        beneficiosAsignados: 0,
        beneficiosVendidos: 0,
        beneficios: [],
      };
      setRows((prev) => [...prev, { ritmista: nuevoRitmista, edicion: nuevaEdicion }]);
    });
  };

  if (fichaOpen) {
    return (
      <FichaRitmista readOnly={readOnly}
        ritmista={fichaOpen.ritmista}
        edicion={fichaOpen.edicion}
        onBack={() => setFichaOpen(null)}
        onSave={handleSave}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Ritmistas</h1>
          <p className="text-[13px] text-fg-secondary">
            {readOnly ? "Consulta · Carnaval " : "Trabajando para Carnaval "}<span className="font-mono-num">{anio}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerExtra}
          {!readOnly && (
            <>
              <Button
                variant="outline"
                className="gap-1.5 bg-card"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="size-3.5" />
                Importar ritmistas
              </Button>
              <Button variant="outline" className="bg-card" disabled title="Próximamente">
                Registrar pago
              </Button>
              <Button onClick={() => setAddOpen(true)}>+ Agregar ritmista</Button>
            </>
          )}
        </div>
      </div>

      {!readOnly && (
        <>
          <AddRitmistaDialog open={addOpen} onOpenChange={setAddOpen} onCreate={handleCreateRitmista} />
          <ImportRitmistasDialog open={importOpen} onOpenChange={setImportOpen} />
        </>
      )}

      <div className="mb-4 grid grid-cols-1 min-[360px]:grid-cols-3 gap-3">
        <MetricCard label="Ritmistas totales" value={rows.length} />
        <MetricCard
          label={naipeStatName}
          value={naipeStatCount}
          onPrev={() => setNaipeStatIndex((i) => (i - 1 + NAIPES.length) % Math.max(NAIPES.length, 1))}
          onNext={() => setNaipeStatIndex((i) => (i + 1) % Math.max(NAIPES.length, 1))}
        />
        <MetricCard
          label={estadoStat.name}
          value={estadoStat.count}
          valueClassName={ESTADO_COLOR[estadoStat.name]}
          onPrev={() => setEstadoStatIndex((i) => (i - 1 + estadoStats.length) % estadoStats.length)}
          onNext={() => setEstadoStatIndex((i) => (i + 1) % estadoStats.length)}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative w-full sm:w-64 sm:shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-tertiary" />
          <Input
            placeholder="Filtrar ritmistas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={estadoFilter}
          onValueChange={(v) => setEstadoFilter(v as EstadoLlegada | "Todos")}
        >
          <SelectTrigger className="w-44 shrink-0">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos los estados</SelectItem>
            {ESTADOS_LLEGADA.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="h-6 w-px shrink-0 bg-border" />
        <NaipeChips additionalOptions={NAIPES} value={naipeFilter} onChange={setNaipeFilter} compact />
        <div className="flex-1" />
        <Button variant="outline" size="icon" className="shrink-0 bg-card" onClick={handleExport} aria-label="Exportar / Imprimir">
          <Printer className="size-3.5" />
        </Button>
      </div>

      <RitmistasEdTable rows={filteredRows} onOpen={setFichaOpen} />
    </div>
  );
}
