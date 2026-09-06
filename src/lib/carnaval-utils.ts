import { hoyArgentina } from "./agenda-utils";
export function anioEnPreparacion(hoy = hoyArgentina()) { return Number(hoy.slice(0, 4)) + 1; }
