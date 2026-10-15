export const KINDS = ["frase", "dado", "cuenta", "lista", "pregunta", "reloj", "oraculo"] as const;
export type Kind = (typeof KINDS)[number];

export const PIGMENTS = ["copper", "wine", "moss", "sea", "sand", "ink"] as const;
export type Pigment = (typeof PIGMENTS)[number];

export const MAX_APPS = 9;
const STORAGE_KEY = "deriva-phone-v1";

export type MiniApp = {
  id: string;
  name: string;
  kind: Kind;
  pigment: Pigment;
  line: string;
  lines: string[];
  faces: string[];
  items: string[];
  prompt: string;
  yes: string;
  no: string;
  city: string;
  offset: number;
  count: number;
  checks: boolean[];
};

export type Draft = {
  id?: string;
  name?: string;
  kind?: string;
  pigment?: string;
  line?: string;
  lines?: unknown;
  faces?: unknown;
  items?: unknown;
  prompt?: string;
  yes?: string;
  no?: string;
  city?: string;
  offset?: unknown;
  count?: unknown;
  checks?: unknown;
};

const FALLBACK_LINES = ["Nada que decir todavía.", "Vuelve a tocar.", "Sigue vacío.", "Otra vez."];
const FALLBACK_FACES = ["sí", "no", "tarde", "nunca", "casi", "otra"];
const FALLBACK_ITEMS = ["una llave que no abre", "el recibo", "silencio"];

function strings(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 90))
    .slice(0, max);
}

function clampOffset(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  if (!Number.isFinite(n)) return 0;
  return Math.max(-12, Math.min(14, Math.round(n * 2) / 2));
}

export function seal(input: Draft): MiniApp | null {
  const name = (input.name ?? "").trim().slice(0, 22);
  if (!name) return null;
  if (!KINDS.includes(input.kind as Kind)) return null;
  const kind = input.kind as Kind;
  const pigment = PIGMENTS.includes(input.pigment as Pigment)
    ? (input.pigment as Pigment)
    : "copper";
  const lines = strings(input.lines, 6);
  const faces = strings(input.faces, 6);
  const items = strings(input.items, 5);
  const list = items.length > 0 ? items : FALLBACK_ITEMS;
  const checksIn = Array.isArray(input.checks) ? input.checks : [];
  const countRaw = typeof input.count === "number" ? input.count : 0;
  const count = Number.isFinite(countRaw) ? Math.max(0, Math.min(999, Math.round(countRaw))) : 0;

  return {
    id: typeof input.id === "string" && input.id ? input.id : crypto.randomUUID(),
    name,
    kind,
    pigment,
    line: (input.line ?? "").trim().slice(0, 72),
    lines: lines.length > 0 ? lines : FALLBACK_LINES,
    faces: faces.length >= 2 ? faces : FALLBACK_FACES,
    items: list,
    prompt: (input.prompt ?? "").trim().slice(0, 120) || "¿Sigues ahí?",
    yes: (input.yes ?? "").trim().slice(0, 80) || "Sí. Y no cambia nada.",
    no: (input.no ?? "").trim().slice(0, 80) || "No. Se queda como estaba.",
    city: (input.city ?? "").trim().slice(0, 32) || "Ninguna parte",
    offset: clampOffset(input.offset),
    count,
    checks: list.map((_, index) => Boolean(checksIn[index])),
  };
}

const PRESETS: Draft[] = [
  {
    name: "Marea",
    kind: "frase",
    pigment: "sea",
    line: "Lo que el agua se quedó",
    lines: [
      "La orilla sube un dedo y no avisa.",
      "Hay una hora en que el mar devuelve los nombres.",
      "Hoy la marea vino sin sal.",
      "Alguien dejó un zapato donde empieza el agua.",
    ],
  },
  {
    name: "Hueso",
    kind: "dado",
    pigment: "sand",
    line: "Seis palabras, ninguna cifra",
    faces: ["norte", "sal", "nadie", "tarde", "umbral", "casi"],
  },
  {
    name: "Techo",
    kind: "cuenta",
    pigment: "ink",
    line: "Veces que miraste arriba",
  },
  {
    name: "Cajón",
    kind: "lista",
    pigment: "copper",
    line: "Cosas que no deberían estar",
    items: ["un botón sin camisa", "la entrada de ayer", "un nombre tachado", "polvo con forma"],
  },
  {
    name: "La otra silla",
    kind: "pregunta",
    pigment: "wine",
    line: "Una sola pregunta",
    prompt: "¿Había alguien sentado cuando entraste?",
    yes: "Entonces no mires el cojín.",
    no: "Igual está caliente.",
  },
  {
    name: "Puerto Lento",
    kind: "reloj",
    pigment: "sea",
    line: "Una ciudad que no aparece",
    city: "Puerto Lento",
    offset: 5.5,
  },
  {
    name: "Umbral",
    kind: "oraculo",
    pigment: "moss",
    line: "Responde y no explica",
    lines: [
      "Entra, pero deja la puerta entreabierta.",
      "Hoy no. Mañana tampoco es seguro.",
      "El sí ya estaba dicho antes de preguntar.",
      "Cruza. Lo que temes se queda de este lado.",
    ],
  },
  {
    name: "Oficio",
    kind: "frase",
    pigment: "copper",
    line: "Trabajos que nadie encargó",
    lines: [
      "Contar las ventanas apagadas de enfrente.",
      "Doblar una sombra que no es tuya.",
      "Aprender de memoria un número que no marcas.",
      "Guardar el silencio en un vaso.",
    ],
  },
  {
    name: "Moneda ciega",
    kind: "dado",
    pigment: "copper",
    line: "Cae de canto, a veces",
    faces: ["quédate", "vende", "calla", "repite", "suelta", "espera"],
  },
  {
    name: "Pasos de más",
    kind: "cuenta",
    pigment: "moss",
    line: "Los que diste sin ir a ningún sitio",
  },
  {
    name: "Bolso ajeno",
    kind: "lista",
    pigment: "sand",
    line: "No es tuyo. Igual míralo",
    items: [
      "un peine con un pelo",
      "monedas de otro país",
      "una llave marcada con cinta",
      "un papel húmedo",
    ],
  },
  {
    name: "Hotel Sin Número",
    kind: "reloj",
    pigment: "ink",
    line: "Allí siempre es otra hora",
    city: "Hotel Sin Número",
    offset: -7,
  },
  {
    name: "Veredicto",
    kind: "oraculo",
    pigment: "wine",
    line: "Corto, y no se apela",
    lines: [
      "Culpable de haber mirado dos veces.",
      "Absuelto. El cuarto estaba vacío.",
      "Se aplaza hasta que dejes el teléfono.",
      "Ni sí ni no: las dos cosas ya pasaron.",
    ],
  },
  {
    name: "Y si no",
    kind: "pregunta",
    pigment: "sea",
    line: "La pregunta que evitaste",
    prompt: "¿Y si no vuelves por esta calle?",
    yes: "Entonces memoriza el farol de la esquina.",
    no: "Vas a pasar igual, más despacio.",
  },
  {
    name: "Dedo",
    kind: "dado",
    pigment: "moss",
    line: "Señala sin mano",
    faces: ["la lámpara", "el cajón", "la ventana", "el suelo", "nadie", "tú"],
  },
  {
    name: "Calle Mediodía",
    kind: "reloj",
    pigment: "sand",
    line: "El sol no se mueve de ahí",
    city: "Calle Mediodía",
    offset: 1,
  },
];

export function localInvent(avoid: string[], count = 4): MiniApp[] {
  const blocked = new Set(avoid.map((name) => name.toLowerCase()));
  const pool = [...PRESETS].sort(() => Math.random() - 0.5);
  const picked: MiniApp[] = [];
  for (const preset of pool) {
    if (picked.length >= count) break;
    if (blocked.has((preset.name ?? "").toLowerCase())) continue;
    const app = seal(preset);
    if (app) picked.push(app);
  }
  return picked;
}

export function loadApps(): MiniApp[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => seal(item as Draft))
      .filter((item): item is MiniApp => item !== null)
      .slice(0, MAX_APPS);
  } catch {
    return [];
  }
}

export function saveApps(apps: MiniApp[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps.slice(0, MAX_APPS)));
}

export function sourceLine(source: "ia" | "aparato" | null): string {
  if (source === "ia") return "Lo eligió la IA.";
  if (source === "aparato") return "La IA no respondió: improvisó el teléfono.";
  return "";
}

export const KIND_LABEL: Record<Kind, string> = {
  frase: "Frase",
  dado: "Dado",
  cuenta: "Cuenta",
  lista: "Lista",
  pregunta: "Pregunta",
  reloj: "Reloj",
  oraculo: "Oráculo",
};

export const PIGMENT_CLASS: Record<Pigment, string> = {
  copper: "bg-pigment-copper",
  wine: "bg-pigment-wine",
  moss: "bg-pigment-moss",
  sea: "bg-pigment-sea",
  sand: "bg-pigment-sand",
  ink: "bg-pigment-ink",
};
