import type {
  Ritmista as PrismaRitmista,
  NaipeHistorialItem as PrismaHistorial,
  RitmistaEdicion as PrismaRitmistaEdicion,
  MovimientoCuentaCorriente as PrismaMovimiento,
  EntregaIndumentaria as PrismaEntrega,
  BeneficioMovimiento as PrismaBeneficio,
  Instrumento as PrismaInstrumento,
  Repuesto as PrismaRepuesto,
  CajaMovimiento as PrismaCajaMovimiento,
  PresupuestoGasto as PrismaPresupuestoGasto,
  PresupuestoRubro as PrismaPresupuestoRubro,
  Beneficio as PrismaBeneficioGeneral,
  BeneficioGasto as PrismaBeneficioGasto,
  BeneficioDistribuidoTipo as PrismaBeneficioDistribuidoTipo,
  BeneficioDistribuidoVendedor as PrismaBeneficioDistribuidoVendedor,
  BeneficioDistribuidoVenta as PrismaBeneficioDistribuidoVenta,
  Prisma,
} from "@prisma/client";
import type {
  Ritmista,
  NaipeHistorialItem,
  RitmistaEdicion,
  MovimientoCuentaCorriente,
  EntregaIndumentaria,
  BeneficioMovimiento,
  Naipe,
  Nivel,
  EstadoLlegada,
  IndumentariaItem,
  Instrumento,
  Repuesto,
  InstrumentoEstado,
  ItemEtiqueta,
  TipoCaixa,
  CajaCategoriaUI,
  CajaMovimiento,
  PresupuestoGasto,
  PresupuestoRubro,
  PresupuestoRubroTipo,
  BeneficioGasto,
  BeneficioGeneral,
  BeneficioDistribuidoTipo,
  BeneficioDistribuidoVendedor,
  BeneficioDistribuidoVenta,
} from "./types";
import { gananciaNetaBeneficio } from "./presupuesto-utils";

const ESTADO_DB_TO_UI: Record<string, EstadoLlegada> = {
  Confirmado: "Confirmado",
  EnDuda: "En duda",
  NoConfirmado: "No confirmado",
};

export const ESTADO_UI_TO_DB: Record<EstadoLlegada, "Confirmado" | "EnDuda" | "NoConfirmado"> = {
  Confirmado: "Confirmado",
  "En duda": "EnDuda",
  "No confirmado": "NoConfirmado",
};

const INDUMENTARIA_DB_TO_UI: Record<string, IndumentariaItem> = {
  RemeraOficial: "Remera oficial",
  Pantalon: "Pantalón",
  Zapatillas: "Zapatillas",
  Medias: "Medias",
  Gorra: "Gorra",
  AccesorioDeNaipe: "Accesorio de naipe",
};

export const INDUMENTARIA_UI_TO_DB: Record<
  IndumentariaItem,
  "RemeraOficial" | "Pantalon" | "Zapatillas" | "Medias" | "Gorra" | "AccesorioDeNaipe"
> = {
  "Remera oficial": "RemeraOficial",
  Pantalón: "Pantalon",
  Zapatillas: "Zapatillas",
  Medias: "Medias",
  Gorra: "Gorra",
  "Accesorio de naipe": "AccesorioDeNaipe",
};

const INSTRUMENTO_ESTADO_DB_TO_UI: Record<string, InstrumentoEstado> = {
  Bueno: "Bueno",
  Regular: "Regular",
  NecesitaReparacion: "Necesita reparación",
  DeBaja: "De baja",
};

export const INSTRUMENTO_ESTADO_UI_TO_DB: Record<InstrumentoEstado, "Bueno" | "Regular" | "NecesitaReparacion" | "DeBaja"> = {
  Bueno: "Bueno",
  Regular: "Regular",
  "Necesita reparación": "NecesitaReparacion",
  "De baja": "DeBaja",
};

const ETIQUETA_DB_TO_UI: Record<string, ItemEtiqueta> = {
  Necesidad: "Necesidad",
  ParaVenta: "Para venta",
};

export const ETIQUETA_UI_TO_DB: Record<ItemEtiqueta, "Necesidad" | "ParaVenta"> = {
  Necesidad: "Necesidad",
  "Para venta": "ParaVenta",
};

const TIPO_CAIXA_DB_TO_UI: Record<string, TipoCaixa> = {
  Vazada: "Vazada",
  ConCilindro: "Con cilindro",
};

export const TIPO_CAIXA_UI_TO_DB: Record<TipoCaixa, "Vazada" | "ConCilindro"> = {
  Vazada: "Vazada",
  "Con cilindro": "ConCilindro",
};


function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function mapHistorial(h: PrismaHistorial): NaipeHistorialItem {
  return { id: h.id, naipe: h.naipe, periodo: h.periodo, desde: h.desde };
}

export function mapRitmista(r: PrismaRitmista & { historial: PrismaHistorial[] }): Ritmista {
  return {
    id: r.id,
    nombre: r.nombre,
    apellido: r.apellido,
    dni: r.dni,
    telefono: r.telefono,
    nacimientoIso: toIso(r.fechaNacimiento),
    nivel: r.nivel as Nivel,
    talleRemera: r.talleRemera,
    calzado: r.calzado,
    naipeReferencia: r.naipeReferencia as Naipe,
    historial: r.historial
      .map(mapHistorial)
      .sort((a, b) => a.desde - b.desde),
  };
}

export function mapMovimiento(m: PrismaMovimiento): MovimientoCuentaCorriente {
  return {
    id: m.id,
    tipo: m.tipo,
    concepto: m.concepto,
    fechaIso: toIso(m.fecha),
    monto: Number(m.monto),
    estado: m.estado,
    registradoPor: m.registradoPor,
  };
}

export function mapEntrega(e: PrismaEntrega): EntregaIndumentaria {
  return {
    id: e.id,
    item: INDUMENTARIA_DB_TO_UI[e.item],
    estado: e.estado,
    fechaEntregaIso: e.fechaEntrega ? toIso(e.fechaEntrega) : null,
    entregadoPor: e.entregadoPor,
  };
}

export function mapBeneficio(b: PrismaBeneficio): BeneficioMovimiento {
  return {
    id: b.id,
    concepto: b.concepto,
    fechaIso: toIso(b.fecha),
    monto: Number(b.monto),
    estado: b.estado,
    registradoPor: b.registradoPor,
  };
}

export function mapRitmistaEdicion(
  re: PrismaRitmistaEdicion & {
    movimientos: PrismaMovimiento[];
    entregas: PrismaEntrega[];
    beneficios: PrismaBeneficio[];
  },
): RitmistaEdicion {
  return {
    id: re.id,
    ritmistaId: re.ritmistaId,
    edicionAnio: 0, // se completa desde el llamador si hace falta
    naipe: re.naipe,
    estadoLlegada: ESTADO_DB_TO_UI[re.estadoLlegada],
    movimientos: re.movimientos.map(mapMovimiento),
    entregas: re.entregas.map(mapEntrega),
    beneficiosAsignados: re.beneficiosAsignados,
    beneficiosVendidos: re.beneficiosVendidos,
    beneficios: re.beneficios.map(mapBeneficio),
  };
}

export function mapInstrumento(i: PrismaInstrumento): Instrumento {
  return {
    id: i.id,
    tipo: i.tipo,
    marca: i.marca,
    pulgadas: i.pulgadas ? Number(i.pulgadas) : null,
    tipoCaixa: i.tipoCaixa ? TIPO_CAIXA_DB_TO_UI[i.tipoCaixa] : null,
    estado: INSTRUMENTO_ESTADO_DB_TO_UI[i.estado],
    cantidad: i.cantidad,
    etiqueta: i.etiqueta ? ETIQUETA_DB_TO_UI[i.etiqueta] : null,
    prioridad: i.prioridad,
    costoEstimado: i.costoEstimado ? Number(i.costoEstimado) : null,
  };
}

export function mapRepuesto(r: PrismaRepuesto): Repuesto {
  return {
    id: r.id,
    categoria: r.categoria,
    descripcion: r.descripcion,
    cantidad: r.cantidad,
    etiqueta: r.etiqueta ? ETIQUETA_DB_TO_UI[r.etiqueta] : null,
    prioridad: r.prioridad,
    costoEstimado: r.costoEstimado ? Number(r.costoEstimado) : null,
  };
}

// ---- Presupuesto ----

const CAJA_CATEGORIA_DB_TO_UI: Record<string, CajaCategoriaUI> = {
  General: "General",
  FantasiaTematica: "Fantasía/temática",
  Trajes: "Trajes",
  Remeras: "Remeras",
  InstrumentosRepuestos: "Instrumentos y repuestos",
  EnsayosLogistica: "Ensayos/logística",
  OtrosGastosGenerales: "Otros gastos generales",
};

export const CAJA_CATEGORIA_UI_TO_DB: Record<
  CajaCategoriaUI,
  "General" | "FantasiaTematica" | "Trajes" | "Remeras" | "InstrumentosRepuestos" | "EnsayosLogistica" | "OtrosGastosGenerales"
> = {
  General: "General",
  "Fantasía/temática": "FantasiaTematica",
  Trajes: "Trajes",
  Remeras: "Remeras",
  "Instrumentos y repuestos": "InstrumentosRepuestos",
  "Ensayos/logística": "EnsayosLogistica",
  "Otros gastos generales": "OtrosGastosGenerales",
};

export function mapCajaMovimiento(m: PrismaCajaMovimiento): CajaMovimiento {
  return {
    id: m.id,
    tipo: m.tipo,
    categoria: CAJA_CATEGORIA_DB_TO_UI[m.categoria],
    concepto: m.concepto,
    monto: Number(m.monto),
    fechaIso: toIso(m.fecha),
    esTraspaso: m.esTraspaso,
    registradoPor: m.registradoPor,
  };
}

export function mapPresupuestoGasto(g: PrismaPresupuestoGasto): PresupuestoGasto {
  return {
    id: g.id,
    categoria: g.categoria,
    concepto: g.concepto,
    costoUnidad: Number(g.costoUnidad),
    cantidad: g.cantidad,
    monto: Number(g.monto),
    fechaIso: toIso(g.fecha),
    cajaMovimientoId: g.cajaMovimientoId,
    registradoPor: g.registradoPor,
  };
}

export function mapPresupuestoRubro(
  r: PrismaPresupuestoRubro & { gastos: PrismaPresupuestoGasto[] },
): PresupuestoRubro {
  return {
    rubro: r.rubro as PresupuestoRubroTipo,
    montoEstimado: Number(r.montoEstimado),
    gastos: r.gastos.map(mapPresupuestoGasto),
  };
}

export function mapBeneficioGastoItem(g: PrismaBeneficioGasto): BeneficioGasto {
  return { id: g.id, concepto: g.concepto, costoUnidad: Number(g.costoUnidad), cantidad: g.cantidad, monto: Number(g.monto) };
}

export function mapBeneficioGeneral(
  b: PrismaBeneficioGeneral & { gastos: PrismaBeneficioGasto[] },
): BeneficioGeneral {
  const gastos = b.gastos.map(mapBeneficioGastoItem);
  return {
    id: b.id,
    nombre: b.nombre,
    fechaIso: toIso(b.fecha),
    objetivoRecaudacion: b.objetivoRecaudacion ? Number(b.objetivoRecaudacion) : null,
    ingresoBruto: Number(b.ingresoBruto),
    gastos,
    gananciaNeta: gananciaNetaBeneficio(Number(b.ingresoBruto), gastos),
    agendaEventoId: b.agendaEventoId,
    cajaMovimientoId: b.cajaMovimientoId,
    registradoPor: b.registradoPor,
  };
}

export function mapBeneficioDistribuidoVenta(
  v: PrismaBeneficioDistribuidoVenta & { cajaMovimiento?: { monto: Prisma.Decimal } | null },
): BeneficioDistribuidoVenta {
  return {
    id: v.id,
    unidades: v.unidades,
    monto: Number(v.monto),
    montoEnCaja: v.cajaMovimiento ? Number(v.cajaMovimiento.monto) : null,
    fechaIso: toIso(v.fecha),
    movimientoCuentaCorrienteId: v.movimientoCuentaCorrienteId,
    cajaMovimientoId: v.cajaMovimientoId,
    registradoPor: v.registradoPor,
  };
}

export function mapBeneficioDistribuidoVendedor(
  v: PrismaBeneficioDistribuidoVendedor & {
    ventas: PrismaBeneficioDistribuidoVenta[];
    ritmistaEdicion?: (PrismaRitmistaEdicion & { ritmista: PrismaRitmista; movimientos: PrismaMovimiento[] }) | null;
  },
  saldoPendienteFn?: (re: RitmistaEdicion) => number,
): BeneficioDistribuidoVendedor {
  let ritmistaNombre: string | null = null;
  let ritmistaSaldoPendiente: number | null = null;
  if (v.ritmistaEdicion) {
    ritmistaNombre = `${v.ritmistaEdicion.ritmista.nombre} ${v.ritmistaEdicion.ritmista.apellido}`;
    if (saldoPendienteFn) {
      ritmistaSaldoPendiente = saldoPendienteFn({
        id: v.ritmistaEdicion.id,
        ritmistaId: v.ritmistaEdicion.ritmistaId,
        edicionAnio: 0,
        naipe: v.ritmistaEdicion.naipe,
        estadoLlegada: ESTADO_DB_TO_UI[v.ritmistaEdicion.estadoLlegada],
        movimientos: v.ritmistaEdicion.movimientos.map(mapMovimiento),
        entregas: [],
        beneficiosAsignados: v.ritmistaEdicion.beneficiosAsignados,
        beneficiosVendidos: v.ritmistaEdicion.beneficiosVendidos,
        beneficios: [],
      });
    }
  }
  return {
    id: v.id,
    tipoId: v.tipoId,
    ritmistaEdicionId: v.ritmistaEdicionId,
    ritmistaNombre,
    ritmistaSaldoPendiente,
    nombreExterno: v.nombreExterno,
    contactoExterno: v.contactoExterno,
    unidadesAsignadas: v.unidadesAsignadas,
    ventas: v.ventas.map(mapBeneficioDistribuidoVenta),
  };
}

export function mapBeneficioDistribuidoTipo(
  t: PrismaBeneficioDistribuidoTipo & {
    vendedores: (PrismaBeneficioDistribuidoVendedor & {
      ventas: PrismaBeneficioDistribuidoVenta[];
      ritmistaEdicion?: (PrismaRitmistaEdicion & { ritmista: PrismaRitmista; movimientos: PrismaMovimiento[] }) | null;
    })[];
  },
  saldoPendienteFn?: (re: RitmistaEdicion) => number,
): BeneficioDistribuidoTipo {
  return {
    id: t.id,
    nombre: t.nombre,
    precioUnidad: Number(t.precioUnidad),
    fechaLimiteIso: toIso(t.fechaLimite),
    vendedores: t.vendedores.map((v) => mapBeneficioDistribuidoVendedor(v, saldoPendienteFn)),
  };
}
