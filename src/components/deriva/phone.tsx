import { useEffect, useRef, useState } from "react";
import {
  Check,
  CircleHelp,
  Clock,
  Dices,
  Eye,
  Feather,
  Hash,
  Hourglass,
  List,
  Play,
  Quote,
  Square,
} from "lucide-react";
import { inventWave } from "@/lib/deriva/invent";
import {
  KIND_LABEL,
  MAX_APPS,
  PIGMENT_CLASS,
  loadApps,
  localInvent,
  saveApps,
  sourceLine,
  type Kind,
  type MiniApp,
} from "@/lib/deriva/model";

type Mode = "espera" | "marcha" | "parado";
type Source = "ia" | "aparato" | null;

const ICONS: Record<Kind, typeof Quote> = {
  frase: Quote,
  dado: Dices,
  cuenta: Hash,
  lista: List,
  pregunta: CircleHelp,
  reloj: Clock,
  oraculo: Eye,
};

export function Phone() {
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [ideas, setIdeas] = useState<MiniApp[]>([]);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("espera");
  const [queue, setQueue] = useState<MiniApp[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("En espera. Todavía no ha empezado.");
  const [source, setSource] = useState<Source>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [arrived, setArrived] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const gen = useRef(0);
  const hydrated = useRef(false);
  const appsRef = useRef(apps);
  appsRef.current = apps;

  useEffect(() => {
    const stored = loadApps();
    if (stored.length > 0) {
      setApps(stored);
      setNotice("En espera. Lo de antes sigue en el teléfono.");
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    saveApps(apps);
  }, [apps]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (mode !== "marcha" || queue.length === 0) return;
    const next = queue[0];
    if (!next) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => {
        const prev = appsRef.current;
        if (prev.length >= MAX_APPS) {
          setQueue([]);
          setMode("espera");
          setNotice("Está lleno. Entra en una app y quítala.");
          return;
        }
        const duplicate = prev.some((app) => app.name.toLowerCase() === next.name.toLowerCase());
        if (!duplicate) {
          setApps((current) =>
            current.some((app) => app.id === next.id) ? current : [...current, next],
          );
          setArrived(next.id);
        }
        setQueue((current) => current.slice(1));
        setNotice(
          duplicate ? `«${next.name}» ya estaba.` : `Puso «${next.name}». ${sourceLine(source)}`,
        );
        if (queue.length === 1) setMode("espera");
      },
      reduce ? 0 : 1100,
    );
    return () => window.clearTimeout(timer);
  }, [mode, queue, source]);

  async function ask(kind: "apps" | "ideas") {
    const token = ++gen.current;
    setBusy(true);
    if (kind === "ideas") setIdeasOpen(true);
    const avoid = appsRef.current.map((app) => app.name);
    let result: { apps: MiniApp[]; source: Source } = {
      apps: [],
      source: "aparato",
    };
    try {
      const remote = await inventWave({ data: { mode: kind, avoid } });
      if (gen.current !== token) return;
      if (remote.ok && remote.apps.length > 0) {
        result = { apps: remote.apps, source: "ia" };
      }
    } catch {
      if (gen.current !== token) return;
    }
    if (result.apps.length === 0) {
      result = { apps: localInvent(avoid, 4), source: "aparato" };
    }
    if (gen.current !== token) return;
    setBusy(false);
    setSource(result.source);
    const via = sourceLine(result.source);
    if (result.apps.length === 0) {
      setNotice("No se le ocurrió nada nuevo.");
      return;
    }
    if (kind === "ideas") {
      setIdeas(result.apps);
      setNotice(`Ideas listas. Nada instalado. ${via}`);
      return;
    }
    setIdeasOpen(false);
    setOpenId(null);
    setQueue(result.apps);
    setMode("marcha");
    setNotice(`Ya eligió ${result.apps.length}. ${via}`);
  }

  function onIniciar() {
    setIdeasOpen(false);
    setOpenId(null);
    if (apps.length >= MAX_APPS) {
      setNotice("Está lleno. Entra en una app y quítala.");
      setMode("espera");
      return;
    }
    if (queue.length > 0) {
      setMode("marcha");
      setNotice("Sigue con lo que ya había elegido.");
      return;
    }
    void ask("apps");
  }

  function onParar() {
    gen.current += 1;
    setBusy(false);
    setQueue([]);
    setMode("parado");
    setNotice("Parado. No va a poner nada más.");
  }

  function onEsperar() {
    gen.current += 1;
    setBusy(false);
    setMode("espera");
    setNotice(
      queue.length > 0
        ? "En espera. Lo que faltaba no se instala hasta que inicies."
        : "En espera. No hace nada.",
    );
  }

  function put(app: MiniApp) {
    if (apps.some((item) => item.name.toLowerCase() === app.name.toLowerCase())) {
      setNotice(`«${app.name}» ya está en el teléfono.`);
      return;
    }
    if (apps.length >= MAX_APPS) {
      setNotice("Está lleno. Quita una antes.");
      return;
    }
    setApps((current) => [...current, app]);
    setArrived(app.id);
    setIdeasOpen(false);
    setNotice(`Pusiste «${app.name}».`);
  }

  function patch(next: MiniApp) {
    setApps((current) => current.map((app) => (app.id === next.id ? next : app)));
  }

  function remove(id: string) {
    setApps((current) => current.filter((app) => app.id !== id));
    setOpenId(null);
    setNotice("Quitada. El hueco queda libre.");
  }

  const open = apps.find((app) => app.id === openId) ?? null;
  const clock = now
    ? now.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
    : "––:––";
  const modeLabel =
    busy && ideasOpen
      ? "Pensando ideas"
      : busy
        ? "Eligiendo"
        : ideasOpen
          ? "Ideas"
          : mode === "marcha"
            ? queue.length > 0
              ? `En marcha · ${queue.length}`
              : "En marcha"
            : mode === "parado"
              ? "Parado"
              : "En espera";

  return (
    <div className="min-h-dvh bg-desk text-ink md:grid md:place-items-center md:p-6">
      <section className="device mx-auto flex w-full max-w-md flex-col overflow-hidden bg-paper font-sans md:border md:border-line md:shadow-2xl">
        <div className="hidden justify-center pt-3 md:flex" aria-hidden>
          <span className="h-1.5 w-16 rounded-full bg-bone" />
        </div>
        <header className="flex items-center justify-between px-5 pt-4 pb-2">
          <time className="w-16 text-sm tabular-nums" dateTime={now?.toISOString()}>
            {clock}
          </time>
          <p className="font-display text-lg leading-none">Deriva</p>
          <span className="flex w-16 items-end justify-end gap-1" aria-hidden>
            <i className="block h-2 w-1 rounded-full bg-ink" />
            <i className="block h-2.5 w-1 rounded-full bg-ink" />
            <i
              className={`block h-3 w-1 rounded-full ${mode === "marcha" ? "bg-copper motion-safe:animate-pulse" : "bg-muted"}`}
            />
          </span>
        </header>
        <div className="px-5 pb-2">
          <p className="inline-flex items-center gap-2 rounded-full bg-bone px-3 py-1 text-xs text-ink">
            <span
              className={`size-1.5 rounded-full ${mode === "marcha" ? "bg-copper" : "bg-muted"}`}
            />
            {modeLabel}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted" aria-live="polite">
            {notice}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {open ? (
            <OpenApp
              app={open}
              onBack={() => setOpenId(null)}
              onRemove={() => remove(open.id)}
              onChange={patch}
            />
          ) : ideasOpen ? (
            <Ideas ideas={ideas} busy={busy} onPut={put} onClose={() => setIdeasOpen(false)} />
          ) : (
            <Home apps={apps} arrived={arrived} onOpen={setOpenId} />
          )}
        </div>

        <div className="dock border-t border-line bg-paper px-3 pt-3">
          <div className="flex gap-2">
            <DockButton
              label="Iniciar"
              icon={Play}
              pressed={mode === "marcha" || (busy && !ideasOpen)}
              emphasize={apps.length === 0 && mode !== "marcha" && !ideasOpen}
              disabled={busy}
              onClick={onIniciar}
            />
            <DockButton label="Parar" icon={Square} pressed={mode === "parado"} onClick={onParar} />
            <DockButton
              label="Esperar"
              icon={Hourglass}
              pressed={mode === "espera" && !busy && !ideasOpen}
              onClick={onEsperar}
            />
            <DockButton
              label="Ideas"
              icon={Feather}
              pressed={ideasOpen}
              disabled={busy}
              onClick={() => void ask("ideas")}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function DockButton({
  label,
  icon: Icon,
  pressed,
  emphasize,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof Play;
  pressed?: boolean;
  emphasize?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const face = pressed ? "bg-ink text-paper" : "bg-bone text-ink";
  const ring = emphasize && !pressed ? "ring-2 ring-copper" : "";
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium disabled:opacity-50 ${face} ${ring}`}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  );
}

function Home({
  apps,
  arrived,
  onOpen,
}: {
  apps: MiniApp[];
  arrived: string | null;
  onOpen: (id: string) => void;
}) {
  if (apps.length === 0) {
    return (
      <div className="px-6 pt-8">
        <h1 className="font-display text-4xl leading-tight">Nada todavía.</h1>
        <p className="mt-4 max-w-xs text-base leading-relaxed">
          Este teléfono se inventa sus propias apps. Iniciar lo pone en marcha. Esperar lo deja
          quieto. Ideas propone, sin instalar nada.
        </p>
        <p className="mt-6 max-w-xs text-sm leading-relaxed text-muted">
          Solo cambia lo que hay dentro de esta pantalla. El resto de tu teléfono sigue igual.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-x-2 gap-y-6 px-4 py-6">
      {apps.map((app) => {
        const Icon = ICONS[app.kind];
        return (
          <li key={app.id} className={app.id === arrived ? "rise" : undefined}>
            <button
              type="button"
              onClick={() => onOpen(app.id)}
              className="flex w-full flex-col items-center gap-2"
            >
              <span
                className={`grid size-16 place-items-center rounded-2xl text-paper ${PIGMENT_CLASS[app.pigment]}`}
              >
                <Icon className="size-7" aria-hidden />
              </span>
              <span className="line-clamp-2 w-full text-center text-xs leading-tight">
                {app.name}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Ideas({
  ideas,
  busy,
  onPut,
  onClose,
}: {
  ideas: MiniApp[];
  busy: boolean;
  onPut: (app: MiniApp) => void;
  onClose: () => void;
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Ideas</h1>
        <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm text-ink">
          Volver
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Nada de esto entra solo. Si quieres una, la pones tú.
      </p>
      {busy && ideas.length === 0 ? (
        <p className="mt-8 font-display text-2xl leading-snug">
          Está pensando, sin tocar el teléfono.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3 pb-4">
          {ideas.map((idea) => (
            <li key={idea.id} className="rounded-2xl border border-line bg-bone p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl leading-none">{idea.name}</h2>
                <span className="text-xs text-muted">{KIND_LABEL[idea.kind]}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{idea.line || "Sin nota."}</p>
              <button
                type="button"
                onClick={() => onPut(idea)}
                className="mt-3 min-h-11 rounded-xl bg-ink px-4 text-sm text-paper"
              >
                Poner en el teléfono
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OpenApp({
  app,
  onBack,
  onRemove,
  onChange,
}: {
  app: MiniApp;
  onBack: () => void;
  onRemove: () => void;
  onChange: (next: MiniApp) => void;
}) {
  return (
    <div>
      <div className={`h-1 ${PIGMENT_CLASS[app.pigment]}`} />
      <div className="flex items-center justify-between px-3 py-2">
        <button type="button" onClick={onBack} className="min-h-11 px-2 text-sm">
          Volver
        </button>
        <button type="button" onClick={onRemove} className="min-h-11 px-2 text-sm">
          Quitar
        </button>
      </div>
      <div className="px-6 pb-8">
        <p className="text-xs text-muted">{KIND_LABEL[app.kind]}</p>
        <h1 className="mt-1 font-display text-4xl leading-tight">{app.name}</h1>
        {app.line ? <p className="mt-2 text-sm leading-relaxed text-muted">{app.line}</p> : null}
        <div className="mt-8">
          <Widget app={app} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}

function Widget({ app, onChange }: { app: MiniApp; onChange: (next: MiniApp) => void }) {
  if (app.kind === "frase") return <Cycler lines={app.lines} action="Otra frase" />;
  if (app.kind === "oraculo") return <Cycler lines={app.lines} action="Otro veredicto" />;
  if (app.kind === "dado") return <Die faces={app.faces} />;
  if (app.kind === "cuenta") return <Counter app={app} onChange={onChange} />;
  if (app.kind === "lista") return <Checklist app={app} onChange={onChange} />;
  if (app.kind === "pregunta") return <Question app={app} />;
  return <CityClock city={app.city} offset={app.offset} />;
}

function Cycler({ lines, action }: { lines: string[]; action: string }) {
  const [index, setIndex] = useState(0);
  const line = lines[index % lines.length] ?? "";
  return (
    <div className="flex flex-col gap-8">
      <p className="font-display text-3xl leading-snug">{line}</p>
      <button
        type="button"
        onClick={() => setIndex((current) => (current + 1) % lines.length)}
        className="min-h-12 rounded-2xl bg-ink px-4 text-sm text-paper"
      >
        {action}
      </button>
    </div>
  );
}

function Die({ faces }: { faces: string[] }) {
  const [face, setFace] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-8">
      <p className="min-h-16 text-center font-display text-5xl leading-tight break-words">
        {face ?? "—"}
      </p>
      <button
        type="button"
        onClick={() => {
          const pool = faces.filter((item) => item !== face);
          const next = (pool.length > 0 ? pool : faces)[
            Math.floor(Math.random() * (pool.length || faces.length))
          ];
          setFace(next ?? null);
        }}
        className="min-h-12 w-full rounded-2xl bg-ink px-4 text-sm text-paper"
      >
        Tirar
      </button>
    </div>
  );
}

function Counter({ app, onChange }: { app: MiniApp; onChange: (next: MiniApp) => void }) {
  function setCount(count: number) {
    onChange({ ...app, count: Math.max(0, Math.min(999, count)) });
  }
  return (
    <div className="flex flex-col items-center gap-8">
      <p className="font-display text-7xl tabular-nums">{app.count}</p>
      <div className="flex w-full gap-3">
        <button
          type="button"
          onClick={() => setCount(app.count - 1)}
          className="min-h-14 flex-1 rounded-2xl border border-line text-2xl"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setCount(app.count + 1)}
          className="min-h-14 flex-1 rounded-2xl bg-ink text-2xl text-paper"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Checklist({ app, onChange }: { app: MiniApp; onChange: (next: MiniApp) => void }) {
  return (
    <ul className="flex flex-col gap-2">
      {app.items.map((item, index) => {
        const checked = Boolean(app.checks[index]);
        return (
          <li key={`${item}-${index}`}>
            <button
              type="button"
              aria-pressed={checked}
              onClick={() => {
                const checks = app.items.map((_, itemIndex) => Boolean(app.checks[itemIndex]));
                checks[index] = !checks[index];
                onChange({ ...app, checks });
              }}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-line px-3 text-left"
            >
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-md ${checked ? "bg-ink text-paper" : "border border-muted"}`}
              >
                {checked ? <Check className="size-3" aria-hidden /> : null}
              </span>
              <span className={checked ? "text-muted line-through" : undefined}>{item}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Question({ app }: { app: MiniApp }) {
  const [pick, setPick] = useState<null | "yes" | "no">(null);
  return (
    <div className="flex flex-col gap-6">
      <p className="font-display text-3xl leading-snug">{app.prompt}</p>
      {pick ? (
        <p className="text-base leading-relaxed">{pick === "yes" ? app.yes : app.no}</p>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPick("yes")}
            className="min-h-12 flex-1 rounded-2xl bg-ink text-sm text-paper"
          >
            Sí
          </button>
          <button
            type="button"
            onClick={() => setPick("no")}
            className="min-h-12 flex-1 rounded-2xl border border-line text-sm"
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}

function CityClock({ city, offset }: { city: string; offset: number }) {
  const [label, setLabel] = useState("––:––");
  useEffect(() => {
    const tick = () => {
      const base = new Date();
      const utc = base.getTime() + base.getTimezoneOffset() * 60_000;
      const there = new Date(utc + offset * 3_600_000);
      setLabel(there.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }));
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [offset]);
  const sign = offset > 0 ? "+" : "";
  return (
    <div>
      <p className="text-sm text-muted">{city}</p>
      <p className="mt-2 font-display text-6xl tabular-nums">{label}</p>
      <p className="mt-3 text-sm text-muted">
        Desfase {sign}
        {offset} h
      </p>
    </div>
  );
}
