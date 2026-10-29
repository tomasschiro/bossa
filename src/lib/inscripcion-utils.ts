import { fechaValida } from "./agenda-utils";
import { TALLES_CALZADO } from "./types";

/** Datos de la ficha pública, tal como los envía el formulario. */
export interface FichaInscripcion {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  nacimientoIso: string;
  naipe: string;
  talleRemera: string;
  calzado: string;
  telefonoTutor: string;
}

export type CampoFicha = keyof FichaInscripcion | "foto";
export type ErroresFicha = Partial<Record<CampoFicha, string>>;

export const FOTO_TIPOS = ["image/jpeg", "image/png", "image/webp"];
/** Ya comprimida en el celular pesa ~100 KB; el límite deja margen sin acercarse al 1 MB de las Server Actions. */
export const FOTO_MAX_BYTES = 600 * 1024;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const soloDigitos = (value: string) => value.replace(/\D/g, "");

/** Edad cumplida en `hoyIso` (ambas fechas YYYY-MM-DD, sin horario para evitar corrimientos por UTC). */
export function edadEn(nacimientoIso: string, hoyIso: string): number {
  const [ny, nm, nd] = nacimientoIso.split("-").map(Number);
  const [hy, hm, hd] = hoyIso.split("-").map(Number);
  return hy - ny - (hm < nm || (hm === nm && hd < nd) ? 1 : 0);
}

export function esMenor(nacimientoIso: string, hoyIso: string): boolean {
  return fechaValida(nacimientoIso) && nacimientoIso <= hoyIso && edadEn(nacimientoIso, hoyIso) < 18;
}

export function emailValido(email: string): boolean {
  return email.length <= 120 && EMAIL_RE.test(email);
}

/** Teléfono argentino con código de área: entre 8 y 12 dígitos (el máximo que admite formatTelefono). */
export function telefonoValido(telefono: string): boolean {
  const d = soloDigitos(telefono);
  return d.length >= 8 && d.length <= 12;
}

/** Misma validación en el celular (mensajes en línea) y en el servidor (la que vale). */
export function validarFicha(f: FichaInscripcion, hoyIso: string): ErroresFicha {
  const e: ErroresFicha = {};
  if (!f.nombre.trim()) e.nombre = "Completá tu nombre.";
  else if (f.nombre.trim().length > 60) e.nombre = "El nombre es demasiado largo.";
  if (!f.apellido.trim()) e.apellido = "Completá tu apellido.";
  else if (f.apellido.trim().length > 60) e.apellido = "El apellido es demasiado largo.";

  const dni = soloDigitos(f.dni);
  if (dni.length < 7 || dni.length > 8 || dni !== f.dni.replace(/\./g, "").trim()) e.dni = "Ingresá tu DNI (7 u 8 números).";

  if (!telefonoValido(f.telefono)) e.telefono = "Ingresá tu teléfono con código de área.";

  const email = f.email.trim();
  if (email && !emailValido(email)) e.email = "Revisá el mail, parece que tiene un error.";

  if (!fechaValida(f.nacimientoIso) || f.nacimientoIso > hoyIso) e.nacimientoIso = "Ingresá tu fecha de nacimiento.";
  else {
    const edad = edadEn(f.nacimientoIso, hoyIso);
    if (edad < 3 || edad > 100) e.nacimientoIso = "Revisá la fecha de nacimiento.";
  }

  if (!f.naipe.trim()) e.naipe = "Elegí tu instrumento.";
  if (!f.talleRemera.trim()) e.talleRemera = "Completá tu talle de remera.";
  else if (f.talleRemera.trim().length > 10) e.talleRemera = "Revisá el talle de remera.";
  if (!TALLES_CALZADO.includes(f.calzado)) e.calzado = "Elegí tu talle de calzado.";

  if (esMenor(f.nacimientoIso, hoyIso) && !telefonoValido(f.telefonoTutor)) {
    e.telefonoTutor = "Como sos menor de 18, necesitamos el teléfono de tu tutor responsable.";
  }
  return e;
}
