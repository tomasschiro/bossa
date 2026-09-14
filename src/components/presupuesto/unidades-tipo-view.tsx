"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MetricCard } from "./metric-card";
import type { BeneficioDistribuidoTipo, BeneficioDistribuidoUnidad, BeneficioDistribuidoVendedor } from "@/lib/types";
import { formatMoney } from "@/lib/ritmistas-utils";

interface UnidadesTipoViewProps {
  tipo: BeneficioDistribuidoTipo;
  onAddVendedor: () => void;
  onGenerarVendedores: () => void;
  generandoVendedores?: boolean;
  onAsignar: (vendedor: BeneficioDistribuidoVendedor) => void;
  onVender: (unidad: BeneficioDistribuidoUnidad) => void;
  onDevolver: (unidad: BeneficioDistribuidoUnidad) => void;
  onReingresar: (unidad: BeneficioDistribuidoUnidad) => void;
  onAddVenta: (vendedor: BeneficioDistribuidoVendedor) => void;
}

const ESTADO_CLASS: Record<string, string> = {
  "Sin asignar": "border-border bg-bg-subtle text-fg-secondary",
  Asignado: "border-warning-soft bg-warning-soft text-warning",
  Vendido: "border-success-soft bg-success-soft text-success",
  Devuelto: "border-danger-soft bg-danger-soft text-danger",
};

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={`inline-flex h-5 items-center rounded-full border px-2 text-[10.5px] font-medium ${ESTADO_CLASS[estado]}`}>
      {estado}
    </span>
  );
}

export function UnidadesTipoView({
  tipo,
  onAddVendedor,
  onGenerarVendedores,
  generandoVendedores,
  onAsignar,
  onVender,
  onDevolver,
  onReingresar,
  onAddVenta,
}: UnidadesTipoViewProps) {
  const [vista, setVista] = useState<"general" | string>("general");

  const vendedorActual = vista !== "general" ? tipo.vendedores.find((v) => v.id === vista) ?? null : null;

  if (!tipo.trackearNumeros) {
    const totalAsignadas = tipo.vendedores.reduce((s, v) => s + v.unidadesAsignadas, 0);
    const totalVendidas = tipo.vendedores.reduce((s, v) => s + v.ventas.reduce((s2, ve) => s2 + (ve.unidades ?? 0), 0), 0);
    const totalVendido = tipo.vendedores.reduce((s, v) => s + v.ventas.reduce((s2, ve) => s2 + ve.monto, 0), 0);
    const vendedoresVisibles = vendedorActual ? [vendedorActual] : tipo.vendedores;

    return (
      <div className="border-t border-border p-4">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard label="Unidades asignadas" value={totalAsignadas} />
          <MetricCard label="Unidades vendidas" value={totalVendidas} colorClassName="text-success" />
          <MetricCard label="Total vendido" value={formatMoney(totalVendido)} />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setVista("general")}
            className={`h-8 shrink-0 rounded-full border px-3 text-[12px] font-semibold ${vista === "general" ? "border-transparent bg-foreground text-background" : "border-border bg-card text-fg-secondary"}`}
          >
            Vista general
          </button>

          <VendedorCombobox
            vendedores={tipo.vendedores}
            value={vendedorActual?.id ?? null}
            onChange={(id) => setVista(id ?? "general")}
          />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="bg-card" onClick={onGenerarVendedores} disabled={generandoVendedores}>
              {generandoVendedores ? "Generando..." : "Generar vendedores"}
            </Button>
            <Button variant="outline" size="sm" className="bg-card" onClick={onAddVendedor}>
              + Vendedor
            </Button>
            {vendedorActual && (
              <Button size="sm" onClick={() => onAsignar(vendedorActual)}>
                + Asignar cantidad
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold text-fg-tertiary uppercase">
                <th className="p-2.5">Vendedor</th>
                <th className="p-2.5">Asignadas</th>
                <th className="p-2.5">Vendidas</th>
                <th className="p-2.5">Disponibles</th>
                <th className="p-2.5" />
              </tr>
            </thead>
            <tbody>
              {vendedoresVisibles.map((v) => {
                const vendidasV = v.ventas.reduce((s, ve) => s + (ve.unidades ?? 0), 0);
                const disponibles = v.unidadesAsignadas - vendidasV;
                return (
                  <tr key={v.id} className="border-b border-border last:border-0">
                    <td className="p-2.5 font-medium">{v.ritmistaNombre ?? v.nombreExterno}</td>
                    <td className="p-2.5 font-mono-num">{v.unidadesAsignadas}</td>
                    <td className="p-2.5 font-mono-num">{vendidasV}</td>
                    <td className="p-2.5 font-mono-num">{disponibles}</td>
                    <td className="p-2.5 text-right">
                      {disponibles > 0 && (
                        <Button variant="outline" size="sm" className="h-7 bg-card px-2 text-xs" onClick={() => onAddVenta(v)}>
                          Vender
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {vendedoresVisibles.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-fg-tertiary">
                    Sin vendedores para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const sinAsignar = tipo.unidades.filter((u) => u.estado === "Sin asignar").length;
  const asignados = tipo.unidades.filter((u) => u.estado === "Asignado").length;
  const vendidos = tipo.unidades.filter((u) => u.estado === "Vendido").length;
  const devueltos = tipo.unidades.filter((u) => u.estado === "Devuelto").length;

  const unidadesVisibles = vendedorActual
    ? tipo.unidades.filter((u) => u.vendedorId === vendedorActual.id)
    : tipo.unidades;

  return (
    <div className="border-t border-border p-4">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Sin asignar" value={sinAsignar} />
        <MetricCard label="Asignados sin vender" value={asignados} colorClassName="text-warning" />
        <MetricCard label="Vendidos" value={vendidos} colorClassName="text-success" />
        <MetricCard label="Devueltos pendientes de reasignar" value={devueltos} colorClassName={devueltos > 0 ? "text-danger" : undefined} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setVista("general")}
          className={`h-8 shrink-0 rounded-full border px-3 text-[12px] font-semibold ${vista === "general" ? "border-transparent bg-foreground text-background" : "border-border bg-card text-fg-secondary"}`}
        >
          Vista general
        </button>

        <VendedorCombobox
          vendedores={tipo.vendedores}
          value={vendedorActual?.id ?? null}
          onChange={(id) => setVista(id ?? "general")}
        />

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="bg-card" onClick={onGenerarVendedores} disabled={generandoVendedores}>
            {generandoVendedores ? "Generando..." : "Generar vendedores"}
          </Button>
          <Button size="sm" onClick={onAddVendedor}>
            + Asignar rifa
          </Button>
          {vendedorActual && (
            <Button size="sm" onClick={() => onAsignar(vendedorActual)}>
              + Asignar números
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-border">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-[11px] font-semibold text-fg-tertiary uppercase">
              <th className="p-2.5">Número</th>
              <th className="p-2.5">Estado</th>
              {vista === "general" && <th className="p-2.5">Vendedor</th>}
              <th className="p-2.5" />
            </tr>
          </thead>
          <tbody>
            {unidadesVisibles.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="p-2.5 font-mono-num font-semibold">#{u.numero}</td>
                <td className="p-2.5">
                  <EstadoBadge estado={u.estado} />
                </td>
                {vista === "general" && <td className="p-2.5 text-fg-secondary">{u.vendedorNombre ?? "Sin asignar"}</td>}
                <td className="p-2.5 text-right">
                  {u.estado === "Asignado" && (
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 bg-card px-2 text-xs" onClick={() => onVender(u)}>
                        Vender ({formatMoney(tipo.precioUnidad)})
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 bg-card px-2 text-xs" onClick={() => onDevolver(u)}>
                        Devolver
                      </Button>
                    </div>
                  )}
                  {u.estado === "Devuelto" && (
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" className="h-7 bg-card px-2 text-xs" onClick={() => onReingresar(u)}>
                        Reingresar
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {unidadesVisibles.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-fg-tertiary">
                  Sin números para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VendedorCombobox({
  vendedores,
  value,
  onChange,
}: {
  vendedores: BeneficioDistribuidoVendedor[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const actual = vendedores.find((v) => v.id === value) ?? null;
  const nombreDe = (v: BeneficioDistribuidoVendedor) => v.ritmistaNombre ?? v.nombreExterno ?? "Sin nombre";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="h-8 min-w-52 justify-between bg-card font-normal">
          <span className={actual ? "" : "text-fg-tertiary"}>{actual ? nombreDe(actual) : `Buscar vendedor (${vendedores.length})`}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar por nombre..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {vendedores.map((v) => (
                <CommandItem
                  key={v.id}
                  value={nombreDe(v)}
                  onSelect={() => {
                    onChange(v.id);
                    setSearch("");
                    setOpen(false);
                  }}
                  data-checked={v.id === value}
                >
                  {nombreDe(v)}
                  {!v.ritmistaNombre && <span className="ml-2 text-[10px] text-fg-tertiary">Externo</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
