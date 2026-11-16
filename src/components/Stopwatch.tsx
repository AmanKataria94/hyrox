import { useEffect, useState } from 'react';
import { fmt } from '../time';

/** Wall-clock based so it survives screen lock / reloads. */
interface SW {
  running: boolean;
  startedAt: number; // ms epoch when last started
  acc: number; // ms accumulated before startedAt
  lap: number; // elapsed ms at last split
}
const KEY = 'hyrox-stopwatch';
const read = (): SW => {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return JSON.parse(s);
  } catch {
    /* ignore */
  }
  return { running: false, startedAt: 0, acc: 0, lap: 0 };
};

export function useStopwatch() {
  const [sw, setSw] = useState<SW>(read);
  const [, tick] = useState(0);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(sw));
    } catch {
      /* ignore */
    }
  }, [sw]);
  useEffect(() => {
    if (!sw.running) return;
    const t = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [sw.running]);

  const elapsed = () => sw.acc + (sw.running ? Date.now() - sw.startedAt : 0);
  return {
    running: sw.running,
    elapsed: elapsed(),
    sinceLap: elapsed() - sw.lap,
    start: () => setSw((s) => (s.running ? s : { ...s, running: true, startedAt: Date.now() })),
    pause: () => setSw((s) => (s.running ? { ...s, running: false, acc: s.acc + Date.now() - s.startedAt } : s)),
    reset: () => setSw({ running: false, startedAt: 0, acc: 0, lap: 0 }),
    /** Returns seconds since last split and starts a new split. Auto-starts the watch. */
    split: (): number => {
      const e = elapsed();
      const sec = Math.round((e - sw.lap) / 1000);
      setSw((s) => ({ ...s, lap: e, ...(s.running ? {} : { running: true, startedAt: Date.now(), acc: e }) }));
      return sec;
    },
  };
}

export type Stopwatch = ReturnType<typeof useStopwatch>;

export function StopwatchBar({ sw }: { sw: Stopwatch }) {
  return (
    <div className="stopwatch">
      <div>
        <div className="sw-main">{fmt(sw.elapsed / 1000)}</div>
        <div className="sw-sub">split {fmt(sw.sinceLap / 1000)}</div>
      </div>
      <div className="row">
        {sw.running ? (
          <button className="btn" onClick={sw.pause}>Pause</button>
        ) : (
          <button className="btn primary" onClick={sw.start}>{sw.elapsed ? 'Resume' : 'Start'}</button>
        )}
        <button
          className="btn ghost"
          onClick={() => confirm('Reset stopwatch?') && sw.reset()}
          disabled={!sw.elapsed}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
