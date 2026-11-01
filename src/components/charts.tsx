/** Lightweight SVG chart primitives — no external chart dependency. */

export function BarChart({
  data,
  height = 200,
  color = "#1e40af",
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = 100 / (data.length * 1.5);
  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 100 ${height / 2}`} preserveAspectRatio="none" className="w-full h-full">
        {data.map((d, i) => {
          const h = (d.value / max) * (height / 2 - 8);
          const x = i * (100 / data.length) + (100 / data.length - barW) / 2;
          return (
            <g key={i}>
              <rect
                x={x}
                y={height / 2 - h - 4}
                width={barW}
                height={h}
                fill={color}
                rx={0.5}
                opacity={0.85}
              />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <div
            key={i}
            className="text-[10px] text-slate-500 text-center flex-1 truncate px-0.5"
            title={d.label}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  data,
  height = 200,
  color = "#1e40af",
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  if (data.length === 0)
    return (
      <div style={{ height }} className="flex items-center justify-center text-slate-400 text-sm">
        Sin datos
      </div>
    );
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * 100;
    const y = height / 2 - ((d.value - min) / range) * (height / 2 - 12) - 6;
    return `${x},${y}`;
  });
  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox={`0 0 100 ${height / 2}`} preserveAspectRatio="none" className="w-full h-full">
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={0.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p, i) => {
          const [x, y] = p.split(",").map(Number);
          return <circle key={i} cx={x} cy={y} r={0.8} fill={color} />;
        })}
      </svg>
      <div className="flex justify-between mt-1">
        {data.map((d, i) => (
          <div key={i} className="text-[10px] text-slate-500 text-center flex-1 truncate px-0.5">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({
  segments,
  size = 140,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth={12} />
        {segments.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={12}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="font-semibold text-slate-800">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
