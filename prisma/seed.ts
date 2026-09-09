import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const NAIPES = ["Caixas", "Repiques", "Surdos", "Tamborines", "Chocalho", "Frigideiras", "Cuicas"];
const EDICION_HISTORICA = 2026;
const DIRECTOR_NOMBRE = "Tomás Schiro";

const ritmistasSeed = [
  {
    nombre: "Martina",
    apellido: "Paredes",
    dni: "38.451.902",
    telefono: "+549 341 500 1234",
    fechaNacimiento: "2001-03-14",
    nivel: "Avanzado" as const,
    talleRemera: "M",
    calzado: "38",
    naipeReferencia: "Caixas",
    historial: [{ naipe: "Caixa", periodo: "2023–2026", desde: 2023 }],
  },
  {
    nombre: "Joaquín",
    apellido: "Ríos",
    dni: "40.112.334",
    telefono: "+549 341 500 2345",
    fechaNacimiento: "1999-07-02",
    nivel: "Avanzado" as const,
    talleRemera: "L",
    calzado: "42",
    naipeReferencia: "Surdos",
    historial: [
      { naipe: "Repique", periodo: "2024", desde: 2024 },
      { naipe: "Surdo", periodo: "2025–2026", desde: 2025 },
    ],
  },
  {
    nombre: "Camila",
    apellido: "Vega",
    dni: "35.882.110",
    telefono: "+549 341 500 3456",
    fechaNacimiento: "2003-11-20",
    nivel: "Avanzado" as const,
    talleRemera: "S",
    calzado: "36",
    naipeReferencia: "Tamborines",
    historial: [{ naipe: "Tamborim", periodo: "2022–2026", desde: 2022 }],
  },
  {
    nombre: "Tomás",
    apellido: "Ferreyra",
    dni: "41.203.887",
    telefono: "+549 341 500 4567",
    fechaNacimiento: "2000-05-09",
    nivel: "Principiante" as const,
    talleRemera: "M",
    calzado: "41",
    naipeReferencia: "Chocalho",
    historial: [{ naipe: "Chocalho", periodo: "2025–2026", desde: 2025 }],
  },
  {
    nombre: "Lucía",
    apellido: "Sosa",
    dni: "39.774.501",
    telefono: "+549 341 500 5678",
    fechaNacimiento: "2002-01-27",
    nivel: "Avanzado" as const,
    talleRemera: "S",
    calzado: "37",
    naipeReferencia: "Surdos",
    historial: [{ naipe: "Surdo 3ra", periodo: "2023–2026", desde: 2023 }],
  },
  {
    nombre: "Bruno",
    apellido: "Núñez",
    dni: "42.560.775",
    telefono: "+549 341 500 6789",
    fechaNacimiento: "1998-09-30",
    nivel: "Principiante" as const,
    talleRemera: "XL",
    calzado: "43",
    naipeReferencia: "Frigideiras",
    historial: [{ naipe: "Frigideiras", periodo: "2026", desde: 2026 }],
  },
  {
    nombre: "Valentina",
    apellido: "Acosta",
    dni: "37.980.214",
    telefono: "+549 341 500 7890",
    fechaNacimiento: "2004-02-18",
    nivel: "Avanzado" as const,
    talleRemera: "S",
    calzado: "35",
    naipeReferencia: "Repiques",
    historial: [{ naipe: 'Repique 12"', periodo: "2021–2026", desde: 2021 }],
  },
  {
    nombre: "Ignacio",
    apellido: "Díaz",
    dni: "39.221.660",
    telefono: "+549 341 500 8901",
    fechaNacimiento: "1997-12-05",
    nivel: "Avanzado" as const,
    talleRemera: "L",
    calzado: "44",
    naipeReferencia: "Caixas",
    historial: [
      { naipe: 'Caixa 12"', periodo: "2022", desde: 2022 },
      { naipe: 'Caixa 14"', periodo: "2023–2026", desde: 2023 },
    ],
  },
  {
    nombre: "Rocío",
    apellido: "Medina",
    dni: "40.885.331",
    telefono: "+549 341 500 9012",
    fechaNacimiento: "2002-08-22",
    nivel: "Principiante" as const,
    talleRemera: "M",
    calzado: "37",
    naipeReferencia: "Cuicas",
    historial: [{ naipe: "Cuica", periodo: "2024–2026", desde: 2024 }],
  },
  {
    nombre: "Gastón",
    apellido: "Silva",
    dni: "38.109.982",
    telefono: "+549 341 500 0123",
    fechaNacimiento: "1996-04-11",
    nivel: "Avanzado" as const,
    talleRemera: "XL",
    calzado: "45",
    naipeReferencia: "Surdos",
    historial: [{ naipe: "Surdo 1ra", periodo: "2020–2026", desde: 2020 }],
  },
];

const INDUMENTARIA_ITEMS = [
  "RemeraOficial",
  "Pantalon",
  "Zapatillas",
  "Medias",
  "Gorra",
  "AccesorioDeNaipe",
] as const;

// Etiquetas legibles usadas solo para matchear contra `entregasPendientes` (strings del mock original)
const INDUMENTARIA_LABEL: Record<(typeof INDUMENTARIA_ITEMS)[number], string> = {
  RemeraOficial: "Remera oficial",
  Pantalon: "Pantalón",
  Zapatillas: "Zapatillas",
  Medias: "Medias",
  Gorra: "Gorra",
  AccesorioDeNaipe: "Accesorio de naipe",
};

function entregasDefault(pendienteExtra: string[] = []) {
  return INDUMENTARIA_ITEMS.map((item) => {
    const pendiente = pendienteExtra.includes(INDUMENTARIA_LABEL[item]);
    const estado: "Entregado" | "Pendiente" = pendiente ? "Pendiente" : "Entregado";
    return {
      item,
      estado,
      fechaEntrega: pendiente ? null : new Date("2026-02-10"),
      entregadoPor: pendiente ? null : DIRECTOR_NOMBRE,
    };
  });
}

const edicionDataByIndex: Record<
  number,
  {
    naipe: string;
    estadoLlegada: "Confirmado" | "EnDuda" | "NoConfirmado";
    movimientos: { tipo: "traje" | "remera" | "rifa" | "pago" | "ajuste"; concepto: string; fecha: string; monto: number; estado: "Pagado" | "Pendiente" | "Parcial"; registradoPor: string }[];
    entregasPendientes: string[];
    beneficiosAsignados: number;
    beneficiosVendidos: number;
    beneficios: { concepto: string; fecha: string; monto: number; estado: "Rendido" | "Pendiente"; registradoPor: string }[];
  }
> = {
  0: {
    naipe: 'Caixa 14"',
    estadoLlegada: "Confirmado",
    movimientos: [
      { tipo: "traje", concepto: "Traje oficial 2026", fecha: "2026-01-10", monto: 42000, estado: "Pendiente", registradoPor: DIRECTOR_NOMBRE },
      { tipo: "pago", concepto: "Pago en efectivo", fecha: "2026-01-20", monto: 20000, estado: "Pagado", registradoPor: DIRECTOR_NOMBRE },
      { tipo: "pago", concepto: "Transferencia", fecha: "2026-02-05", monto: 15000, estado: "Pagado", registradoPor: "Tesorería" },
    ],
    entregasPendientes: ["Medias"],
    beneficiosAsignados: 15,
    beneficiosVendidos: 12,
    beneficios: [{ concepto: "Rifa navideña", fecha: "2025-12-15", monto: 60000, estado: "Rendido", registradoPor: DIRECTOR_NOMBRE }],
  },
  1: {
    naipe: "Surdo 2da",
    estadoLlegada: "EnDuda",
    movimientos: [
      { tipo: "traje", concepto: "Traje oficial 2026", fecha: "2026-01-10", monto: 20000, estado: "Pendiente", registradoPor: DIRECTOR_NOMBRE },
      { tipo: "pago", concepto: "Pago en efectivo", fecha: "2026-01-25", monto: 10000, estado: "Pagado", registradoPor: DIRECTOR_NOMBRE },
    ],
    entregasPendientes: ["Medias", "Zapatillas"],
    beneficiosAsignados: 10,
    beneficiosVendidos: 6,
    beneficios: [{ concepto: "Rifa navideña", fecha: "2025-12-15", monto: 30000, estado: "Pendiente", registradoPor: "Tesorería" }],
  },
  2: {
    naipe: "Tamborim",
    estadoLlegada: "Confirmado",
    movimientos: [
      { tipo: "traje", concepto: "Traje oficial 2026", fecha: "2026-01-10", monto: 20000, estado: "Pagado", registradoPor: DIRECTOR_NOMBRE },
      { tipo: "pago", concepto: "Pago total", fecha: "2026-01-15", monto: 20000, estado: "Pagado", registradoPor: DIRECTOR_NOMBRE },
    ],
    entregasPendientes: [],
    beneficiosAsignados: 10,
    beneficiosVendidos: 10,
    beneficios: [{ concepto: "Rifa navideña", fecha: "2025-12-15", monto: 50000, estado: "Rendido", registradoPor: DIRECTOR_NOMBRE }],
  },
  3: {
    naipe: "Chocalho",
    estadoLlegada: "NoConfirmado",
    movimientos: [{ tipo: "traje", concepto: "Traje oficial 2026", fecha: "2026-01-10", monto: 20000, estado: "Pendiente", registradoPor: DIRECTOR_NOMBRE }],
    entregasPendientes: ["Zapatillas", "Accesorio de naipe"],
    beneficiosAsignados: 10,
    beneficiosVendidos: 2,
    beneficios: [{ concepto: "Rifa navideña", fecha: "2025-12-15", monto: 10000, estado: "Pendiente", registradoPor: "Tesorería" }],
  },
  4: {
    naipe: "Surdo 3ra",
    estadoLlegada: "Confirmado",
    movimientos: [
      { tipo: "traje", concepto: "Traje oficial 2026", fecha: "2026-01-10", monto: 20000, estado: "Pagado", registradoPor: DIRECTOR_NOMBRE },
      { tipo: "pago", concepto: "Pago total", fecha: "2026-01-12", monto: 20000, estado: "Pagado", registradoPor: DIRECTOR_NOMBRE },
    ],
    entregasPendientes: [],
    beneficiosAsignados: 10,
    beneficiosVendidos: 10,
    beneficios: [{ concepto: "Rifa navideña", fecha: "2025-12-15", monto: 50000, estado: "Rendido", registradoPor: DIRECTOR_NOMBRE }],
  },
  5: {
    naipe: "Frigideiras",
    estadoLlegada: "EnDuda",
    movimientos: [
      { tipo: "traje", concepto: "Traje oficial 2026", fecha: "2026-01-10", monto: 20000, estado: "Pendiente", registradoPor: DIRECTOR_NOMBRE },
      { tipo: "pago", concepto: "Seña", fecha: "2026-01-18", monto: 5000, estado: "Pagado", registradoPor: "Tesorería" },
    ],
    entregasPendientes: ["Zapatillas"],
    beneficiosAsignados: 10,
    beneficiosVendidos: 6,
    beneficios: [{ concepto: "Rifa navideña", fecha: "2025-12-15", monto: 30000, estado: "Pendiente", registradoPor: "Tesorería" }],
  },
  6: {
    naipe: 'Repique 12"',
    estadoLlegada: "Confirmado",
    movimientos: [
      { tipo: "traje", concepto: "Traje oficial 2026", fecha: "2026-01-10", monto: 20000, estado: "Pagado", registradoPor: DIRECTOR_NOMBRE },
      { tipo: "pago", concepto: "Pago total", fecha: "2026-01-11", monto: 20000, estado: "Pagado", registradoPor: DIRECTOR_NOMBRE },
    ],
    entregasPendientes: [],
    beneficiosAsignados: 10,
    beneficiosVendidos: 10,
    beneficios: [{ concepto: "Rifa navideña", fecha: "2025-12-15", monto: 50000, estado: "Rendido", registradoPor: DIRECTOR_NOMBRE }],
  },
  7: {
    naipe: 'Caixa 14"',
    estadoLlegada: "NoConfirmado",
    movimientos: [{ tipo: "traje", concepto: "Traje oficial 2026", fecha: "2026-01-10", monto: 20000, estado: "Pendiente", registradoPor: DIRECTOR_NOMBRE }],
    entregasPendientes: ["Zapatillas", "Accesorio de naipe"],
    beneficiosAsignados: 10,
    beneficiosVendidos: 2,
    beneficios: [{ concepto: "Rifa navideña", fecha: "2025-12-15", monto: 10000, estado: "Pendiente", registradoPor: "Tesorería" }],
  },
  8: {
    naipe: "Cuica",
    estadoLlegada: "EnDuda",
    movimientos: [
      { tipo: "traje", concepto: "Traje oficial 2026", fecha: "2026-01-10", monto: 20000, estado: "Pendiente", registradoPor: DIRECTOR_NOMBRE },
      { tipo: "pago", concepto: "Seña", fecha: "2026-01-22", monto: 12000, estado: "Pagado", registradoPor: "Tesorería" },
    ],
    entregasPendientes: ["Medias"],
    beneficiosAsignados: 10,
    beneficiosVendidos: 6,
    beneficios: [{ concepto: "Rifa navideña", fecha: "2025-12-15", monto: 30000, estado: "Pendiente", registradoPor: "Tesorería" }],
  },
  9: {
    naipe: "Surdo 1ra",
    estadoLlegada: "Confirmado",
    movimientos: [
      { tipo: "traje", concepto: "Traje oficial 2026", fecha: "2026-01-10", monto: 20000, estado: "Pagado", registradoPor: DIRECTOR_NOMBRE },
      { tipo: "pago", concepto: "Pago total", fecha: "2026-01-13", monto: 20000, estado: "Pagado", registradoPor: DIRECTOR_NOMBRE },
    ],
    entregasPendientes: [],
    beneficiosAsignados: 10,
    beneficiosVendidos: 10,
    beneficios: [{ concepto: "Rifa navideña", fecha: "2025-12-15", monto: 50000, estado: "Rendido", registradoPor: DIRECTOR_NOMBRE }],
  },
};

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("El seed de prueba no se ejecuta en producción");
  console.log("Seeding Bossa / Zum Zum...");

  const bateria = await prisma.bateria.upsert({
    where: { id: "zumzum" },
    update: {},
    create: { id: "zumzum", nombre: "Zum Zum", comparsa: "Comparsa Zum Zum" },
  });

  const usuario = await prisma.usuario.upsert({
    where: { email: "director@zumzum.com" }, update: {},
    create: { email: "director@zumzum.com", nombre: DIRECTOR_NOMBRE, esSuperAdmin: true },
  });
  await prisma.account.upsert({
    where: { issuer_accountId: { issuer: "local:credential", accountId: usuario.id } },
    update: {},
    create: { issuer: "local:credential", providerId: "credential", accountId: usuario.id, userId: usuario.id,
      password: await hashPassword(process.env.SEED_DIRECTOR_PASSWORD ?? "ZumZum2026!"),
    },
  });
  await prisma.membresia.upsert({
    where: { usuarioId_bateriaId: { usuarioId: usuario.id, bateriaId: bateria.id } },
    update: {}, create: { usuarioId: usuario.id, bateriaId: bateria.id, rol: "director" },
  });

  for (const [i, nombre] of NAIPES.entries()) {
    await prisma.naipe.upsert({
      where: { id: `naipe-${bateria.id}-${nombre}` },
      update: {},
      create: { id: `naipe-${bateria.id}-${nombre}`, bateriaId: bateria.id, nombre, orden: i },
    });
  }

  const edicion = await prisma.edicion.upsert({
    where: { bateriaId_anioCarnaval: { bateriaId: bateria.id, anioCarnaval: EDICION_HISTORICA } },
    update: {},
    create: { bateriaId: bateria.id, anioCarnaval: EDICION_HISTORICA, activa: false },
  });

  for (const [i, r] of ritmistasSeed.entries()) {
    const ritmista = await prisma.ritmista.upsert({
      where: { id: `ritmista-${i + 1}` },
      update: {},
      create: {
        id: `ritmista-${i + 1}`,
        bateriaId: bateria.id,
        nombre: r.nombre,
        apellido: r.apellido,
        dni: r.dni,
        telefono: r.telefono,
        fechaNacimiento: new Date(r.fechaNacimiento),
        nivel: r.nivel,
        talleRemera: r.talleRemera,
        calzado: r.calzado,
        naipeReferencia: r.naipeReferencia,
        historial: {
          create: r.historial.map((h) => ({ naipe: h.naipe, periodo: h.periodo, desde: h.desde })),
        },
      },
    });

    const ed = edicionDataByIndex[i];
    if (!ed) continue;

    const entregas = entregasDefault(ed.entregasPendientes);

    await prisma.ritmistaEdicion.upsert({
      where: { edicionId_ritmistaId: { edicionId: edicion.id, ritmistaId: ritmista.id } },
      update: {},
      create: {
        edicionId: edicion.id,
        ritmistaId: ritmista.id,
        naipe: ed.naipe,
        estadoLlegada: ed.estadoLlegada,
        beneficiosAsignados: ed.beneficiosAsignados,
        beneficiosVendidos: ed.beneficiosVendidos,
        movimientos: {
          create: ed.movimientos.map((m) => ({
            tipo: m.tipo,
            concepto: m.concepto,
            fecha: new Date(m.fecha),
            monto: m.monto,
            estado: m.estado,
            registradoPor: m.registradoPor,
          })),
        },
        entregas: {
          create: entregas.map((e) => ({
            item: e.item,
            estado: e.estado,
            fechaEntrega: e.fechaEntrega,
            entregadoPor: e.entregadoPor,
          })),
        },
        beneficios: {
          create: ed.beneficios.map((b) => ({
            concepto: b.concepto,
            fecha: new Date(b.fecha),
            monto: b.monto,
            estado: b.estado,
            registradoPor: b.registradoPor,
          })),
        },
      },
    });
  }

  console.log("Seed completo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
