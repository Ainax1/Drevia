import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { seal, type Draft, type MiniApp } from "@/lib/deriva/model";

const Input = z.object({
  mode: z.enum(["apps", "ideas"]),
  avoid: z.array(z.string().max(40)).max(40),
});

export type InventResult = { ok: true; apps: MiniApp[] } | { ok: false };

const SYSTEM = [
  "Eres Deriva, el criterio de un teléfono que se inventa aplicaciones raras y concretas.",
  "Escribes en español, sin emojis, sin consejos de productividad y sin marcas reales.",
  "Los nombres son cortos, como de objeto o de lugar.",
  "Responde únicamente con JSON válido.",
].join(" ");

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .join("");
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("sin json");
  return JSON.parse(body.slice(start, end + 1));
}

function appsFrom(payload: unknown): MiniApp[] {
  if (!payload || typeof payload !== "object" || !("apps" in payload)) return [];
  const list = (payload as { apps?: unknown }).apps;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => seal((item ?? {}) as Draft))
    .filter((item): item is MiniApp => item !== null)
    .slice(0, 4);
}

async function complete(apiKey: string, prompt: string, jsonMode: boolean): Promise<string> {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(18_000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 1,
      max_tokens: 800,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`xai ${res.status}`);
  const body = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
  return textOf(body.choices?.[0]?.message?.content);
}

export const inventWave = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<InventResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false };

    const prompt = [
      data.mode === "apps"
        ? "Inventa 4 apps para instalar en el teléfono."
        : "Inventa 4 ideas. No se instalan solas: solo se proponen.",
      `No repitas estos nombres: ${data.avoid.join(", ") || "ninguno"}.`,
      'Devuelve {"apps":[ exactamente 4 objetos ]}.',
      "Cada objeto tiene name, kind, pigment, line, lines, faces, items, prompt, yes, no, city, offset.",
      "kind es uno de: frase, dado, cuenta, lista, pregunta, reloj, oraculo.",
      "pigment es uno de: copper, wine, moss, sea, sand, ink.",
      "frase: lines con 4 frases cortas. dado: faces con 6 palabras.",
      "cuenta: line dice qué se cuenta. lista: items con 4 cosas.",
      "pregunta: prompt, yes y no. reloj: city ficticia y offset entre -11 y 13.",
      "oraculo: lines con 4 veredictos. line cabe bajo un icono.",
    ].join("\n");

    try {
      let text: string;
      try {
        text = await complete(apiKey, prompt, true);
      } catch {
        text = await complete(apiKey, prompt, false);
      }
      const apps = appsFrom(extractJson(text));
      if (apps.length === 0) return { ok: false };
      return { ok: true, apps };
    } catch {
      return { ok: false };
    }
  });
