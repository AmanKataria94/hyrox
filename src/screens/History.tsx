import { COMPONENTS, componentName } from '../hyrox';
import { impactOf } from '../model';
import { useStore } from '../store';
import { exportFile } from '../storage';
import { fmt, fmtDate, fmtDelta } from '../time';
import type { Workout } from '../types';
import { WorkoutLogger } from './Log';

export function Done({ id, go }: { id: string; go: (to: string) => void }) {
  const { data, update } = useStore();
  const w = data.workouts.find((x) => x.id === id);
  const imp = impactOf(data, id);
  return (
    <div className="screen">
      <div className="hero">
        <div className="eyebrow">Workout saved · {w?.name}</div>
        {imp ? (
          <>
            <div className="muted">Predicted finish</div>
            <div className="big">{fmt(imp.after.total, true)}</div>
            <div className={`delta ${imp.after.total <= imp.before.total ? 'good' : 'bad'}`}>
              {fmtDelta(imp.after.total - imp.before.total)} (was {fmt(imp.before.total, true)})
            </div>
          </>
        ) : (
          <p className="muted">Nothing in this workout maps to race components, so the prediction is unchanged.</p>
        )}
      </div>
      {imp && (
        <div className="card">
          <h3>What changed</h3>
          <table className="breakdown">
            <tbody>
              {COMPONENTS.filter((c) => Math.abs(imp.after.estimates[c].value - imp.before.estimates[c].value) >= 0.5).map((c) => {
                const a = imp.after.estimates[c].value, b = imp.before.estimates[c].value;
                return (
                  <tr key={c}>
                    <td>{componentName(c)}</td>
                    <td className="dim">{fmt(b)} → {fmt(a)}</td>
                    <td className={`r ${a < b ? 'good' : 'bad'}`}>{fmtDelta(a - b)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <button
        className="btn block"
        onClick={() => {
          exportFile(data);
          update((d) => ({ ...d, lastExport: new Date().toISOString() }));
        }}
      >
        Export backup now
      </button>
      <button className="btn primary block" onClick={() => go('/')}>Home</button>
    </div>
  );
}

export function History({ go }: { go: (to: string) => void }) {
  const { data, model } = useStore();
  const byId = new Map(model.timeline.filter((s) => s.workoutId).map((s) => [s.workoutId!, s.total]));
  const list = [...data.workouts].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="screen">
      <h2>History</h2>
      {!list.length && <p className="muted">No workouts yet.</p>}
      {list.map((w) => (
        <div key={w.id} className="card option" onClick={() => go(`/workout/${w.id}`)}>
          <div className="row between">
            <div>
              <div className="small muted">{fmtDate(w.date)}</div>
              <strong>{w.name}</strong>
              {w.activity && <span className="muted"> · {w.activity.minutes} min</span>}
              {w.rpe && <span className="muted"> · RPE {w.rpe}</span>}
            </div>
            {byId.has(w.id) && <span className="tag">{fmt(byId.get(w.id)!, true)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkoutDetail({ id, go }: { id: string; go: (to: string) => void }) {
  const { data, update } = useStore();
  const w = data.workouts.find((x) => x.id === id);
  if (!w) return <div className="screen"><p>Workout not found.</p></div>;
  const set = (fn: (w: Workout) => void) =>
    update((d) => {
      fn(d.workouts.find((x) => x.id === id)!);
      return d;
    });
  return (
    <div className="screen">
      <div className="small muted">{fmtDate(w.date)}</div>
      <h2>{w.name}</h2>
      <label className="inline small">
        Date{' '}
        <input
          type="date"
          value={w.date.slice(0, 10)}
          onChange={(e) => e.target.value && set((x) => (x.date = new Date(e.target.value + 'T12:00:00').toISOString()))}
        />
      </label>
      {w.activity ? (
        <p>{w.activity.type} · {w.activity.minutes} min</p>
      ) : (
        <>
          <p className="small muted">Edits recompute the prediction automatically.</p>
          <WorkoutLogger w={w} set={set} />
        </>
      )}
      <button
        className="btn ghost block danger"
        onClick={() => {
          if (!confirm('Delete this workout?')) return;
          update((d) => ({ ...d, workouts: d.workouts.filter((x) => x.id !== id) }));
          go('/history');
        }}
      >
        Delete workout
      </button>
    </div>
  );
}
