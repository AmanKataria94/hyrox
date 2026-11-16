import { useEffect, useRef, useState } from 'react';

/** Predicted finish → fitness factor. 1 = full Hyrox pro (≤52 min), 0 = full desk geek (≥100 min). */
export function fitnessFromTime(totalSec: number) {
  const pro = 52 * 60, geek = 100 * 60;
  return Math.max(0, Math.min(1, (geek - totalSec) / (geek - pro)));
}

export function fitnessLabel(t: number) {
  if (t >= 0.85) return 'HYROX PRO';
  if (t >= 0.6) return 'HYBRID ATHLETE';
  if (t >= 0.35) return 'GYM REGULAR';
  if (t >= 0.15) return 'WEEKEND WARRIOR';
  return 'DESK ATHLETE';
}

/** Smoothly animate a number towards target. */
function useTween(target: number, ms = 900) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      const cur = a + (target - a) * e;
      setV(cur);
      from.current = cur;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * One character, morphed by t∈[0,1]: skinny glasses-wearing coder with a laptop (0)
 * → broad, headbanded athlete doing a farmers carry with kettlebells beside a wall ball (1).
 */
export function Athlete({ t: target, size = 220 }: { t: number; size?: number }) {
  const t = useTween(clamp01(target));
  const L = (a: number, b: number) => a + (b - a) * t;
  const cx = 100;

  const sw = L(21, 42); // shoulder half-width
  const ww = L(25, 23); // waist half-width
  const aw = L(6, 15); // arm thickness
  const lw = L(7, 15); // leg thickness
  const neck = L(5, 10);
  const headR = L(17, 18);
  // hands: geek holds laptop in front; pro holds kettlebells at sides
  const hx = L(15, sw + 10), hy = L(108, 132);
  const ex = L(sw + 9, sw + 11), ey = L(98, 104); // elbows
  const fx = L(11, 20); // feet spread
  const geek = clamp01(1 - t * 1.8); // accessories fade out by t≈0.55
  const pro = clamp01((t - 0.45) * 1.8); // accessories fade in from t≈0.45
  const skin = '#e8b48c';
  const shirt = `rgb(${Math.round(L(60, 20))},${Math.round(L(90, 20))},${Math.round(L(170, 22))})`;

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className="athlete" aria-label="Your athlete">
      {/* floor + arena stripes */}
      <g opacity={pro}>
        <rect x="0" y="176" width="200" height="24" fill="#ffe600" />
        <path d="M0 200 L24 176 H44 L20 200Z M60 200 L84 176 H104 L80 200Z M120 200 L144 176 H164 L140 200Z" fill="#111" />
      </g>
      <line x1="0" y1="176" x2="200" y2="176" stroke="#333" strokeWidth="2" opacity={geek} />

      {/* desk + monitor (geek) */}
      <g opacity={geek}>
        <rect x="128" y="120" width="64" height="6" fill="#444" />
        <rect x="150" y="126" width="6" height="50" fill="#333" />
        <rect x="140" y="86" width="44" height="30" rx="3" fill="#1b1f2a" stroke="#555" />
        <text x="162" y="106" textAnchor="middle" fontSize="11" fill="#3fd17f" fontFamily="monospace">{'>_'}</text>
        <rect x="128" y="108" width="12" height="12" rx="2" fill="#8d6e63" />
      </g>

      {/* wall ball (pro) */}
      <g opacity={pro}>
        <circle cx="170" cy="160" r="16" fill="#222" stroke="#ffe600" strokeWidth="3" />
        <text x="170" y="164" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffe600">9</text>
      </g>

      {/* legs */}
      <line x1={cx - 11} y1="118" x2={cx - fx} y2="172" stroke="#1e1e1e" strokeWidth={lw} strokeLinecap="round" />
      <line x1={cx + 11} y1="118" x2={cx + fx} y2="172" stroke="#1e1e1e" strokeWidth={lw} strokeLinecap="round" />
      {/* shoes */}
      <ellipse cx={cx - fx - 2} cy="175" rx={L(7, 10)} ry="4" fill={t > 0.5 ? '#ffe600' : '#777'} />
      <ellipse cx={cx + fx + 2} cy="175" rx={L(7, 10)} ry="4" fill={t > 0.5 ? '#ffe600' : '#777'} />

      {/* torso */}
      <polygon points={`${cx - sw},74 ${cx + sw},74 ${cx + ww},122 ${cx - ww},122`} fill={shirt} />
      {/* traps */}
      <polygon points={`${cx - neck},66 ${cx + neck},66 ${cx + sw - 4},76 ${cx - sw + 4},76`} fill={shirt} opacity={t} />
      {/* bib */}
      <g opacity={pro}>
        <rect x={cx - 13} y="86" width="26" height="16" rx="2" fill="#fff" />
        <text x={cx} y="98" textAnchor="middle" fontSize="10" fontWeight="800" fill="#111">PRO</text>
      </g>
      {/* neck */}
      <rect x={cx - neck} y="60" width={neck * 2} height="12" fill={skin} />

      {/* arms */}
      <polyline
        points={`${cx - sw + 4},78 ${cx - ex},${ey} ${cx - hx},${hy}`}
        fill="none" stroke={skin} strokeWidth={aw} strokeLinecap="round" strokeLinejoin="round"
      />
      <polyline
        points={`${cx + sw - 4},78 ${cx + ex},${ey} ${cx + hx},${hy}`}
        fill="none" stroke={skin} strokeWidth={aw} strokeLinecap="round" strokeLinejoin="round"
      />

      {/* laptop (geek) */}
      <g opacity={geek}>
        <rect x={cx - 20} y="100" width="40" height="4" rx="1" fill="#999" />
        <rect x={cx - 18} y="78" width="36" height="22" rx="2" fill="#2a2f3a" stroke="#999" />
        <circle cx={cx} cy="89" r="2.5" fill="#ccc" />
      </g>
      {/* kettlebells (pro) */}
      <g opacity={pro}>
        {[-1, 1].map((s) => (
          <g key={s}>
            <path d={`M${cx + s * hx - 7},${hy + 2} a7,7 0 0 1 14,0`} fill="none" stroke="#111" strokeWidth="3" />
            <circle cx={cx + s * hx} cy={hy + 12} r="10" fill="#111" stroke="#ffe600" strokeWidth="2" />
          </g>
        ))}
      </g>

      {/* head */}
      <circle cx={cx} cy="48" r={headR} fill={skin} />
      {/* hair */}
      <path d={`M${cx - headR},46 a${headR},${headR} 0 0 1 ${headR * 2},0 v-4 a${headR},${headR} 0 0 0 ${-headR * 2},0z`} fill="#2b1d12" />
      <path d={`M${cx - 12},36 q6,-12 20,-5 q-8,2 -10,8z`} fill="#2b1d12" opacity={geek} />
      {/* headband (pro) */}
      <rect x={cx - headR - 1} y="36" width={headR * 2 + 2} height="6" rx="2" fill="#ffe600" opacity={pro} />
      {/* glasses (geek) */}
      <g opacity={geek} stroke="#111" strokeWidth="2" fill="none">
        <circle cx={cx - 7} cy="48" r="5.5" />
        <circle cx={cx + 7} cy="48" r="5.5" />
        <line x1={cx - 1.5} y1="48" x2={cx + 1.5} y2="48" />
      </g>
      {/* eyes */}
      <circle cx={cx - 7} cy="48" r="1.8" fill="#111" />
      <circle cx={cx + 7} cy="48" r="1.8" fill="#111" />
      {/* mouth: flat → grit */}
      <path d={`M${cx - 6},${L(58, 57)} q6,${L(-1, 5)} 12,0`} fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" />
      {/* sweat (pro) */}
      <path d={`M${cx + headR + 3},40 q3,4 0,7 q-3,-3 0,-7z`} fill="#6cc3ff" opacity={pro} />
    </svg>
  );
}
