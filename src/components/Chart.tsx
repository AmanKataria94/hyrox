import type { Snapshot } from '../model';
import { fmt } from '../time';

/** Predicted finish time over time. Lower is better. */
export function PredictionChart({ timeline }: { timeline: Snapshot[] }) {
  if (timeline.length < 2) return null;
  const W = 340, H = 140, P = { l: 44, r: 10, t: 12, b: 22 };
  const ts = timeline.map((s) => new Date(s.date).getTime());
  const vs = timeline.map((s) => s.total);
  const t0 = Math.min(...ts), t1 = Math.max(...ts) || t0 + 1;
  let v0 = Math.min(...vs), v1 = Math.max(...vs);
  const pad = Math.max(30, (v1 - v0) * 0.15);
  v0 -= pad; v1 += pad;
  const x = (t: number) => P.l + ((t - t0) / (t1 - t0 || 1)) * (W - P.l - P.r);
  // slower = lower on the chart, so improvement trends upward
  const y = (v: number) => P.t + ((v - v0) / (v1 - v0)) * (H - P.t - P.b);
  const pts = timeline.map((s, i) => [x(ts[i]), y(s.total)] as const);
  const ticks = [v0 + pad, (v0 + v1) / 2, v1 - pad];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Predicted finish time trend">
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="grid" />
          <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="axis">{fmt(v)}</text>
        </g>
      ))}
      <polyline points={pts.map((p) => p.join(',')).join(' ')} className="line" />
      {pts.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={i === pts.length - 1 ? 4 : 2.5} className={i === pts.length - 1 ? 'dot last' : 'dot'} />
      ))}
      <text x={P.l} y={H - 6} className="axis">start</text>
      <text x={W - P.r} y={H - 6} textAnchor="end" className="axis">latest</text>
    </svg>
  );
}
