export type Naipe = string;

export const NAIPES: Naipe[] = [
  "Caixas",
  "Repiques",
  "Surdos",
  "Tamborins",
  "Chocalho",
  "Frigideiras",
  "Cuicas",
];

export const NAIPE_ABBR: Record<Naipe, string> = {
  Caixas: "CX",
  Repiques: "RP",
  Surdos: "SD",
  Tamborins: "TB",
  Chocalho: "CH",
  Frigideiras: "FR",
  Cuicas: "CU",
};

export type Nivel = "Principiante" | "Avanzado";

export type EstadoLlegada = "Confirmado" | "En duda" | "No confirmado";

export const ESTADOS_LLEGADA: EstadoLlegada[] = [
  "Confirmado",
  "En duda",
  "No confirmado",
];

/** Un ítem del historial: qué naipe tocó en qué año/ediciones. */
export interface NaipeHistorialItem {
  naipe: string;
  /** Ej. "2023–2026" o "2024" */
  periodo: string;
  /** Primer año del período, para calcular antigüedad */
  desde: number;
}

/** Padrón general — Base de Datos (atemporal, sin año) */
export interface Ritmista {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  nacimientoIso: string;
  nivel: Nivel;
  talleRemera: string;
  calzado: string;
  /** naipe de referencia actual */
  naipeReferencia: Naipe;
  /** historial completo, ordenado ascendente por año */
  historial: NaipeHistorialItem[];
}

export type MovimientoTipo = "traje" | "remera" | "rifa" | "pago" | "ajuste";
export type MovimientoEstado = "Pagado" | "Pendiente" | "Parcial";

export interface MovimientoCuentaCorriente {
  id: string;
  tipo: MovimientoTipo;
  concepto: string;
  fechaIso: string;
  monto: number;
  estado: MovimientoEstado;
  registradoPor: string;
}

export type IndumentariaItem =
  | "Remera oficial"
  | "Pantalón"
  | "Zapatillas"
  | "Medias"
  | "Gorra"
  | "Accesorio de naipe";

export interface EntregaIndumentaria {
  id: string;
  item: IndumentariaItem;
  estado: "Entregado" | "Pendiente";
  fechaEntregaIso: string | null;
  entregadoPor: string | null;
}

export type BeneficioEstado = "Rendido" | "Pendiente";

export interface BeneficioMovimiento {
  id: string;
  concepto: string;
  fechaIso: string;
  monto: number;
  estado: BeneficioEstado;
  registradoPor: string;
}

export type InstrumentoEstado = "Bueno" | "Regular" | "Necesita reparación" | "De baja";

export const ESTADOS_INSTRUMENTO: InstrumentoEstado[] = [
  "Bueno",
  "Regular",
  "Necesita reparación",
  "De baja",
];

export type ItemEtiqueta = "Necesidad" | "Para venta";
export type ItemPrioridad = "Urgente" | "Deseable";

export type TipoCaixa = "Vazada" | "Con cilindro";
export const TIPOS_CAIXA: TipoCaixa[] = ["Vazada", "Con cilindro"];

export type CategoriaRepuesto = string;

export const TIPOS_INSTRUMENTO_DEFAULT = [
  "Caixa",
  "Tamborim",
  "Repique",
  "Chocalho",
  "Surdo",
  "Frigideira",
  "Cuica",
];

export interface Instrumento {
  id: string;
  tipo: string;
  marca: string | null;
  pulgadas: number | null;
  tipoCaixa: TipoCaixa | null;
  estado: InstrumentoEstado;
  cantidad: number;
  etiqueta: ItemEtiqueta | null;
  prioridad: ItemPrioridad | null;
  costoEstimado: number | null;
}

export interface Repuesto {
  id: string;
  categoria: CategoriaRepuesto;
  descripcion: string;
  cantidad: number;
  etiqueta: ItemEtiqueta | null;
  prioridad: ItemPrioridad | null;
  costoEstimado: number | null;
}

/** Ritmista dentro de una edición específica de Carnaval (tabla puente ritmistas_edicion) */
export interface RitmistaEdicion {
  id: string;
  ritmistaId: string;
  edicionAnio: number;
  naipe: string; // naipe tocado esta edición (puede tener subtipo, ej "Caixa 14\"")
  estadoLlegada: EstadoLlegada;
  movimientos: MovimientoCuentaCorriente[];
  entregas: EntregaIndumentaria[];
  beneficiosAsignados: number;
  beneficiosVendidos: number;
  beneficios: BeneficioMovimiento[];
}
