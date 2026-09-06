
const HEADERS = [
  "Nombre",
  "Apellido",
  "DNI",
  "Teléfono",
  "Fecha de nacimiento (AAAA-MM-DD)",
  "Instrumento",
  "Talle de remera",
  "Calzado",
];

const EXAMPLE_ROW = [
  "Martina",
  "Paredes",
  "38.451.902",
  "+549 341 500 1234",
  "2001-03-14",
  "Caixas",
  "M",
  "38",
];

function toCsvRow(cells: string[]): string {
  return cells.map((c) => `"${c.replace(/"/g, '""')}"`).join(",");
}

export function downloadRitmistasTemplate(naipes: string[]) {
  const lines = [
    toCsvRow(HEADERS),
    toCsvRow(EXAMPLE_ROW.map((cell, index) => index === 5 ? naipes[0] ?? "" : cell)),
    "",
    toCsvRow([`Instrumentos válidos: ${naipes.join(", ")}`]),
  ];
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "plantilla-ritmistas.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
