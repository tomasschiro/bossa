export const PALETA_DEFAULT = { principal: "#00723F", principalOscuro: "#B4FFB1", acento: "#CBEECF" };
export type Paleta = typeof PALETA_DEFAULT;
export const colorValido = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
export function leerPaleta(value: unknown): Paleta {
  const object = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(PALETA_DEFAULT).map(([key, fallback]) => [key, colorValido(object[key]) ? object[key] : fallback])) as Paleta;
}
export function textoSobreColor(hex: string) {
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? "#FFFFFF" : "#000000";
}
// Values are normalized to six-digit hex before being interpolated into CSS.
export function cssPaleta(value: unknown) {
  const p = leerPaleta(value);
  return `:root { --primary: ${p.principal}; --primary-foreground: ${textoSobreColor(p.principal)}; --sidebar-primary: ${p.principal}; --sidebar-primary-foreground: ${textoSobreColor(p.principal)}; --ring: ${p.principal}; --accent: ${p.acento}; --accent-foreground: ${textoSobreColor(p.acento)}; }
  .dark { --primary: ${p.principalOscuro}; --primary-foreground: ${textoSobreColor(p.principalOscuro)}; --sidebar-primary: ${p.principalOscuro}; --sidebar-primary-foreground: ${textoSobreColor(p.principalOscuro)}; --ring: ${p.principalOscuro}; --accent: ${p.acento}; --accent-foreground: ${textoSobreColor(p.acento)}; }`;
}
