import { type CSSProperties, type ReactNode } from "react";

export type LoaderVariant =
  | "spinner"
  | "dots"
  | "bars"
  | "dot-matrix"
  | "dither"
  | "morph"
  | "comet"
  | "metaballs"
  | "newton"
  | "helix"
  | "scramble"
  | "percent"
  | "ascii"
  | "ascii-braille";

const variantClass: Record<LoaderVariant, string> = {
  spinner: "animate-spin rounded-full border-2 border-slate-200 border-t-blue-600",
  dots: "loader-dots",
  bars: "loader-bars",
  "dot-matrix": "loader-matrix",
  dither: "loader-dither",
  morph: "loader-morph",
  comet: "loader-comet",
  metaballs: "loader-metaballs",
  newton: "loader-newton",
  helix: "loader-helix",
  scramble: "loader-scramble",
  percent: "loader-percent",
  ascii: "loader-ascii",
  "ascii-braille": "loader-braille",
};

function TextLoader({ variant }: { variant: LoaderVariant }) {
  const text: Record<string, string> = {
    scramble: "SYNC",
    ascii: "[···]",
    "ascii-braille": "⠿⠿⠿",
    percent: "···%",
  };
  return (
    <span className="font-mono text-[10px] font-bold tracking-widest text-blue-600">
      {text[variant] ?? "···"}
    </span>
  );
}

export function Loader({
  variant = "spinner",
  size = 24,
  className = "",
}: {
  variant?: LoaderVariant;
  size?: number;
  className?: string;
}) {
  const style = {
    width: size,
    height: size,
    "--loader-size": `${size}px`,
  } as CSSProperties;
  if (["scramble", "percent", "ascii", "ascii-braille"].includes(variant))
    return (
      <span className={`inline-flex items-center justify-center ${className}`} style={style}>
        <TextLoader variant={variant} />
      </span>
    );
  return (
    <span
      aria-hidden="true"
      className={`loader-visual ${variantClass[variant]} ${className}`}
      style={style}
    >
      <i />
      <i />
      <i />
    </span>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- mixed component and stable API export is intentional here
export const LOADER_VARIANTS: { variant: LoaderVariant; label: string }[] = [
  { variant: "spinner", label: "Spinner" },
  { variant: "dots", label: "Dots" },
  { variant: "bars", label: "Bars" },
  { variant: "dot-matrix", label: "Dot Matrix" },
  { variant: "dither", label: "Dither" },
  { variant: "morph", label: "Morph" },
  { variant: "comet", label: "Comet" },
  { variant: "metaballs", label: "Metaballs" },
  { variant: "newton", label: "Newton" },
  { variant: "helix", label: "Helix" },
  { variant: "scramble", label: "Scramble" },
  { variant: "percent", label: "Percent" },
  { variant: "ascii", label: "ASCII" },
  { variant: "ascii-braille", label: "ASCII Braille" },
];

export function LoaderDemo() {
  return (
    <div className="grid grid-cols-3 gap-x-8 gap-y-6 p-6 sm:grid-cols-4 md:grid-cols-5">
      {LOADER_VARIANTS.map(({ variant, label }) => (
        <div key={variant} className="flex flex-col items-center gap-3">
          <div className="flex h-14 items-center justify-center">
            <Loader variant={variant} size={40} />
          </div>
          <span className="text-xs text-slate-500">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function LoaderStyles() {
  return (
    <style>{`.loader-visual{position:relative;display:inline-flex;align-items:center;justify-content:center;color:#2563eb}.loader-visual i{display:block;background:currentColor}.loader-dots{display:flex;gap:calc(var(--loader-size)/10);align-items:center;justify-content:center}.loader-dots i{width:calc(var(--loader-size)/5);height:calc(var(--loader-size)/5);border-radius:999px;animation:loader-bounce 900ms infinite ease-in-out}.loader-dots i:nth-child(2){animation-delay:150ms}.loader-dots i:nth-child(3){animation-delay:300ms}.loader-bars{display:flex;gap:calc(var(--loader-size)/12);align-items:center;justify-content:center}.loader-bars i{width:calc(var(--loader-size)/8);height:55%;border-radius:4px;animation:loader-bars 800ms infinite ease-in-out}.loader-bars i:nth-child(2){animation-delay:120ms}.loader-bars i:nth-child(3){animation-delay:240ms}.loader-matrix{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;padding:4px}.loader-matrix i{width:calc(var(--loader-size)/7);height:calc(var(--loader-size)/7);border-radius:2px;animation:loader-fade 1s infinite}.loader-matrix i:nth-child(2){animation-delay:120ms}.loader-matrix i:nth-child(3){animation-delay:240ms}.loader-dither{border-radius:50%;background:radial-gradient(circle,#2563eb 25%,transparent 27%) 0 0/8px 8px;animation:loader-spin 1s linear infinite}.loader-morph{border-radius:40% 60% 55% 45%;background:#2563eb;animation:loader-morph 1.2s infinite ease-in-out}.loader-comet{border:3px solid transparent;border-top-color:#2563eb;border-right-color:#60a5fa;border-radius:50%;animation:loader-spin .8s linear infinite}.loader-metaballs{filter:blur(2px);border-radius:50%;background:#2563eb;box-shadow:calc(var(--loader-size)/3) 0 0 -3px #60a5fa;animation:loader-pulse 1s infinite alternate}.loader-newton i{position:absolute;width:20%;height:20%;border-radius:50%;transform-origin:calc(var(--loader-size)/2) calc(var(--loader-size)/2);animation:loader-orbit 1s infinite ease-in-out}.loader-newton i:nth-child(2){animation-delay:-.33s}.loader-newton i:nth-child(3){animation-delay:-.66s}.loader-helix i{position:absolute;width:18%;height:18%;border-radius:50%;animation:loader-helix 1s infinite ease-in-out}.loader-helix i:nth-child(2){animation-delay:-.33s}.loader-helix i:nth-child(3){animation-delay:-.66s}.loader-ascii,.loader-braille{min-width:42px}@keyframes loader-spin{to{transform:rotate(360deg)}}@keyframes loader-bounce{0%,80%,100%{transform:scale(.55);opacity:.4}40%{transform:scale(1);opacity:1}}@keyframes loader-bars{0%,100%{transform:scaleY(.45);opacity:.5}50%{transform:scaleY(1);opacity:1}}@keyframes loader-fade{0%,100%{opacity:.25}50%{opacity:1}}@keyframes loader-morph{50%{border-radius:60% 40% 35% 65%;transform:rotate(180deg)}}@keyframes loader-pulse{to{transform:scale(1.12);opacity:.65}}@keyframes loader-orbit{0%,100%{transform:rotate(0deg) translateX(calc(var(--loader-size)/3))}50%{transform:rotate(180deg) translateX(calc(var(--loader-size)/3))}}@keyframes loader-helix{0%,100%{transform:translateX(calc(var(--loader-size)/4)) scale(.6)}50%{transform:translateX(calc(var(--loader-size)/-4)) scale(1)}}`}</style>
  );
}
