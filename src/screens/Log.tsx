import { IntervalTimer } from '../components/IntervalTimer';
import { StopwatchBar, useStopwatch, type Stopwatch } from '../components/Stopwatch';
import { NumInput, TimeInput } from '../components/TimeInput';
import { STATION } from '../hyrox';
import { useStore } from '../store';
import type { Block, Item, ItemResult, Workout } from '../types';
import { fmt } from '../time';
import { describeBlock } from './Today';

function itemLabel(it: Item, b: Block) {
  if (it.kind === 'run') return b.mode === 'intervals' ? 'Run' : `Run ${it.distance}m`;
  if (it.kind === 'bike') return it.label || 'Bike';
  if (it.kind === 'station' && it.station) {
    const s = STATION[it.station];
    if (b.mode === 'intervals') return s.name;
    return `${s.name} ${s.unit === 'reps' ? `${it.reps} reps` : `${it.distance}m`}`;
  }
  return `${it.label || 'Exercise'}${it.reps ? ` ×${it.reps}` : ''}`;
}

function ResultFields({
  it, b, r, onChange, sw,
}: { it: Item; b: Block; r: ItemResult; onChange: (r: ItemResult) => void; sw?: Stopwatch }) {
  const spec = it.station ? STATION[it.station] : undefined;
  if (b.mode === 'intervals') {
    if (it.kind === 'bike')
      return (<label className="inline"><NumInput value={r.cals} onChange={(v) => onChange({ ...r, cals: v })} width={64} placeholder="cals" /> cal</label>);
    if (spec?.unit === 'reps')
      return (<label className="inline"><NumInput value={r.reps} onChange={(v) => onChange({ ...r, reps: v })} width={64} placeholder="reps" /> reps</label>);
    if (it.kind === 'run' || spec)
      return (<label className="inline"><NumInput value={r.distance} onChange={(v) => onChange({ ...r, distance: v })} width={64} placeholder="metres" /> m</label>);
    return null;
  }
  return (
    <>
      <TimeInput value={r.time} onChange={(v) => onChange({ ...r, time: v })} onSplit={sw?.split} />
      {spec?.proWeight && (
        <label className="inline">
          <NumInput value={r.weight ?? it.weight} onChange={(v) => onChange({ ...r, weight: v })} width={52} /> kg
        </label>
      )}
    </>
  );
}

/** Shared by in-progress logging and editing past workouts. */
export function WorkoutLogger({ w, set, sw }: { w: Workout; set: (fn: (w: Workout) => void) => void; sw?: Stopwatch }) {
  const setResult = (b: Block, round: number, it: Item, r: ItemResult) =>
    set((x) => {
      x.results[b.id] ??= {};
      x.results[b.id][round] ??= {};
      x.results[b.id][round][it.id] = r;
    });

  return (
    <>
      {w.blocks.map((b) => {
        const blockTotal = b.mode === 'rounds'
          ? Object.values(w.results[b.id] ?? {}).flatMap((rd) => Object.values(rd)).reduce((a, r) => a + (r.time ?? 0), 0)
          : 0;
        return (
          <div className="card" key={b.id}>
            <div className="row between">
              <h3>{b.title}</h3>
              {blockTotal > 0 && <span className="tag">{fmt(blockTotal)}</span>}
            </div>
            <p className="small muted">{describeBlock(b)}</p>
            {b.notes && <p className="small notes">{b.notes}</p>}
            {b.mode === 'intervals' && b.workSec && sw && (
              <IntervalTimer rounds={b.rounds} work={b.workSec} rest={b.restSec ?? 0} />
            )}
            {Array.from({ length: b.rounds }, (_, round) => (
              <div className="round" key={round}>
                {b.rounds > 1 && <div className="round-label">{b.mode === 'intervals' ? 'Rep' : 'Round'} {round + 1}</div>}
                {b.items.map((it) => (
                  <div className="log-row" key={it.id}>
                    <span className="log-label">{itemLabel(it, b)}</span>
                    <span className="log-fields">
                      <ResultFields it={it} b={b} r={w.results[b.id]?.[round]?.[it.id] ?? {}} sw={sw}
                        onChange={(r) => setResult(b, round, it, r)} />
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })}
      <div className="card">
        <h3>How did it feel?</h3>
        <div className="rpe">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`btn small ${w.rpe === n ? 'primary' : 'ghost'}`} onClick={() => set((x) => (x.rpe = n))}>
              {n}
            </button>
          ))}
        </div>
        <textarea placeholder="Notes" rows={2} value={w.notes ?? ''} onChange={(e) => set((x) => (x.notes = e.target.value))} />
      </div>
    </>
  );
}

export function Log({ go }: { go: (to: string) => void }) {
  const { data, update } = useStore();
  const sw = useStopwatch();
  const w = data.draft;
  if (!w) {
    return (
      <div className="screen">
        <p>No workout in progress.</p>
        <button className="btn primary" onClick={() => go('/today')}>Choose a workout</button>
      </div>
    );
  }
  const set = (fn: (w: Workout) => void) => update((d) => (fn(d.draft!), d));

  const finish = () => {
    const anything = Object.values(w.results).some((rd) => Object.values(rd).some((it) => Object.keys(it).length));
    if (!anything && !confirm('Nothing logged yet. Finish anyway?')) return;
    const id = w.id;
    update((d) => {
      d.workouts.push({ ...d.draft!, completed: true });
      d.draft = undefined;
      return d;
    });
    sw.reset();
    go(`/done/${id}`);
  };

  return (
    <div className="screen">
      <StopwatchBar sw={sw} />
      <div className="row between">
        <h2>{w.name}</h2>
        <button className="btn ghost small" onClick={() => go('/edit')}>Edit plan</button>
      </div>
      <p className="small muted">Type times as 145 or 1.45 for 1:45, or tap ⏱ to fill the time since your last split.</p>
      <WorkoutLogger w={w} set={set} sw={sw} />
      <div className="row sticky-actions">
        <button
          className="btn ghost"
          onClick={() => confirm('Discard this workout?') && (update((d) => ({ ...d, draft: undefined })), sw.reset(), go('/'))}
        >
          Discard
        </button>
        <button className="btn primary grow" onClick={finish}>Finish & update prediction</button>
      </div>
    </div>
  );
}
