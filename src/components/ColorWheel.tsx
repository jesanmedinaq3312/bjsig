import { useRef, useCallback, useEffect, useState } from "react";

interface HSL {
  h: number;
  s: number;
  l: number;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): HSL {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? "#1e293b" : "#ffffff";
}

interface ColorWheelProps {
  color: string;
  onChange: (hex: string) => void;
  size?: number;
}

export function ColorWheel({ color, onChange, size = 200 }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hsl, setHsl] = useState<HSL>(() => hexToHsl(color));
  const dragging = useRef(false);

  useEffect(() => {
    setHsl(hexToHsl(color));
  }, [color]);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 4;
    const innerR = size / 2 - 28;

    ctx.clearRect(0, 0, size, size);

    for (let angle = 0; angle < 360; angle += 1) {
      const rad = (angle * Math.PI) / 180;
      const startAngle = rad - 0.009;
      const endAngle = rad + 0.009;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }

    const innerGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
    innerGradient.addColorStop(0, "#ffffff");
    innerGradient.addColorStop(1, `hsl(${hsl.h}, 100%, 50%)`);
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = innerGradient;
    ctx.fill();

    const hueRad = (hsl.h * Math.PI) / 180;
    const markerR = (outerR + innerR) / 2;
    const markerX = cx + Math.cos(hueRad) * markerR;
    const markerY = cy + Math.sin(hueRad) * markerR;
    ctx.beginPath();
    ctx.arc(markerX, markerY, 7, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.stroke();

    const slR = innerR * 0.85;
    const slX = cx + (hsl.s / 100) * slR * Math.cos((hsl.h * Math.PI) / 180);
    const slY = cy + (hsl.s / 100) * slR * Math.sin((hsl.h * Math.PI) / 180);
    ctx.beginPath();
    ctx.arc(slX, slY, 6, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    ctx.fill();
    ctx.strokeStyle = getContrastColor(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [hsl, size]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  function updateFromCanvas(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;
    const dist = Math.sqrt(x * x + y * y);
    const outerR = size / 2 - 4;
    const innerR = size / 2 - 28;
    const slR = innerR * 0.85;

    if (dist >= innerR && dist <= outerR) {
      const angle = Math.atan2(y, x) * (180 / Math.PI);
      const h = (angle + 360) % 360;
      const newHsl = { ...hsl, h: Math.round(h) };
      setHsl(newHsl);
      onChange(hslToHex(newHsl.h, newHsl.s, newHsl.l));
    } else if (dist < innerR) {
      const sat = Math.min(100, (dist / slR) * 100);
      const angle = Math.atan2(y, x) * (180 / Math.PI);
      const h = (angle + 360) % 360;
      const newHsl = { h: Math.round(h), s: Math.round(sat), l: hsl.l };
      setHsl(newHsl);
      onChange(hslToHex(newHsl.h, newHsl.s, newHsl.l));
    }
  }

  function handleDown(e: React.MouseEvent) {
    dragging.current = true;
    updateFromCanvas(e);
  }

  function handleMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    updateFromCanvas(e);
  }

  function handleUp() {
    dragging.current = false;
  }

  function handleLightness(l: number) {
    const newHsl = { ...hsl, l };
    setHsl(newHsl);
    onChange(hslToHex(newHsl.h, newHsl.s, newHsl.l));
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded-full cursor-crosshair touch-none select-none"
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
        />
      </div>
      <div className="w-full space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 w-16">Brillo</span>
          <input
            type="range"
            min={0}
            max={100}
            value={hsl.l}
            onChange={(e) => handleLightness(parseInt(e.target.value, 10))}
            className="flex-1 accent-blue-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg border border-slate-200"
            style={{ backgroundColor: color }}
          />
          <input
            type="text"
            value={color.toUpperCase()}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                setHsl(hexToHsl(v));
                onChange(v);
              }
            }}
            className="w-28 px-2 py-1.5 text-sm border border-slate-300 rounded-lg font-mono"
          />
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- mixed component and stable API export is intentional here
export { hslToHex, hexToHsl, getContrastColor };
