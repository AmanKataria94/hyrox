import { useEffect, useRef, useState } from 'react';
import { fmt } from '../time';

let ctx: AudioContext | undefined;
function beep(freq = 880, ms = 180) {
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.value = 0.25;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
  } catch {
    /* no audio */
  }
  navigator.vibrate?.(200);
}

/** Work/rest countdown for interval blocks (e.g. 4×4). Wall-clock based. */
export function IntervalTimer({ rounds, work, rest }: { rounds: number; work: number; rest: number }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const lastPhase = useRef('');
  useEffect(() => {
    if (startedAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [startedAt]);

  const total = rounds * work + (rounds - 1) * rest;
  let label = 'Ready';
  let remaining = work;
  let round = 1;
  if (startedAt !== null) {
    const e = (now - startedAt) / 1000;
    if (e >= total) {
      label = 'Done';
      remaining = 0;
      round = rounds;
    } else {
      const cycle = work + rest;
      round = Math.floor(e / cycle) + 1;
      const inCycle = e % cycle;
      if (inCycle < work) {
        label = 'WORK';
        remaining = work - inCycle;
      } else {
        label = 'Rest';
        remaining = cycle - inCycle;
      }
    }
  }
  const phaseKey = `${label}-${round}`;
  useEffect(() => {
    if (startedAt === null || phaseKey === lastPhase.current) return;
    if (lastPhase.current) beep(label === 'WORK' ? 990 : label === 'Done' ? 660 : 550, label === 'Done' ? 600 : 250);
    lastPhase.current = phaseKey;
  }, [phaseKey, startedAt, label]);

  return (
    <div className={`itimer ${label === 'WORK' ? 'work' : label === 'Rest' ? 'rest' : ''}`}>
      <div>
        <div className="it-label">
          {label} {startedAt !== null && label !== 'Done' && `· ${round}/${rounds}`}
        </div>
        <div className="it-time">{fmt(Math.ceil(remaining))}</div>
      </div>
      {startedAt === null ? (
        <button
          className="btn primary"
          onClick={() => {
            beep(990);
            lastPhase.current = '';
            setStartedAt(Date.now());
          }}
        >
          Start {rounds}×{fmt(work)}
        </button>
      ) : (
        <button className="btn ghost" onClick={() => setStartedAt(null)}>Stop</button>
      )}
    </div>
  );
}
