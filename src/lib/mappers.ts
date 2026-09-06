import type {
  Ritmista as PrismaRitmista,
  NaipeHistorialItem as PrismaHistorial,
  RitmistaEdicion as PrismaRitmistaEdicion,
  MovimientoCuentaCorriente as PrismaMovimiento,
  EntregaIndumentaria as PrismaEntrega,
  BeneficioMovimiento as PrismaBeneficio,
  Instrumento as PrismaInstrumento,
  Repuesto as PrismaRepuesto,
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
} from "./types";

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
  return { naipe: h.naipe, periodo: h.periodo, desde: h.desde };
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
