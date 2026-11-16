import { NumInput, TimeInput } from '../components/TimeInput';
import { STATION, STATIONS, shareAmount } from '../hyrox';
import { newBlock, run, st, uid } from '../plan';
import { useStore } from '../store';
import type { Block, Item, ItemKind, StationKey, Workout } from '../types';

function move<T>(arr: T[], i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

function ItemEditor({ item, mode, onChange }: { item: Item; mode: Block['mode']; onChange: (i: Item) => void }) {
  const setKind = (kind: ItemKind) => {
    if (kind === 'station') onChange({ ...st('ski'), id: item.id });
    else if (kind === 'run') onChange({ ...run(500), id: item.id });
    else onChange({ id: item.id, kind, label: kind === 'bike' ? 'Assault Bike' : 'Exercise' });
  };
  const spec = item.station ? STATION[item.station] : undefined;
  return (
    <div className="item-edit">
      <select value={item.kind} onChange={(e) => setKind(e.target.value as ItemKind)}>
        <option value="run">Run</option>
        <option value="station">Station</option>
        <option value="bike">Assault Bike</option>
        <option value="other">Other</option>
      </select>
      {item.kind === 'station' && (
        <select
          value={item.station}
          onChange={(e) => onChange({ ...st(e.target.value as StationKey), id: item.id })}
        >
          {STATIONS.map((s) => (
            <option key={s.key} value={s.key}>{s.name}</option>
          ))}
        </select>
      )}
      {item.kind === 'other' && (
        <input value={item.label ?? ''} placeholder="Name" onChange={(e) => onChange({ ...item, label: e.target.value })} />
      )}
      {mode === 'rounds' && item.kind === 'run' && (
        <label className="inline">
          <NumInput value={item.distance} onChange={(v) => onChange({ ...item, distance: v })} width={64} /> m
        </label>
      )}
      {mode === 'rounds' && spec && (
        <label className="inline">
          <NumInput
            value={spec.unit === 'reps' ? item.reps : item.distance}
            onChange={(v) => onChange({ ...item, [spec.unit === 'reps' ? 'reps' : 'distance']: v })}
            width={56}
          />{' '}
          {spec.unit}
          <span className="dim small"> (half={shareAmount(spec.key)})</span>
        </label>
      )}
      {mode === 'rounds' && item.kind === 'other' && (
        <label className="inline">
          <NumInput value={item.reps} onChange={(v) => onChange({ ...item, reps: v })} width={56} /> reps
        </label>
      )}
      {spec?.proWeight && (
        <label className="inline">
          <NumInput value={item.weight} onChange={(v) => onChange({ ...item, weight: v })} width={56} /> kg
          <span className="dim small"> (Pro {spec.proWeight})</span>
        </label>
      )}
    </div>
  );
}

export function BlockEditor({ b, onChange, onRemove }: { b: Block; onChange: (b: Block) => void; onRemove: () => void }) {
  const setItems = (fn: (items: Item[]) => void) => {
    const items = [...b.items];
    fn(items);
    onChange({ ...b, items });
  };
  return (
    <div className="card">
      <div className="row">
        <input className="title-input" value={b.title} onChange={(e) => onChange({ ...b, title: e.target.value })} />
        <button className="btn ghost small" onClick={onRemove}>✕</button>
      </div>
      <div className="row wrap">
        <select
          value={b.mode}
          onChange={(e) =>
            onChange({
              ...b,
              mode: e.target.value as Block['mode'],
              ...(e.target.value === 'intervals' && !b.workSec ? { workSec: 240, restSec: 180 } : {}),
            })
          }
        >
          <option value="rounds">Rounds (log times)</option>
          <option value="intervals">Timed intervals (log distance/cals)</option>
        </select>
        <label className="inline">
          <NumInput value={b.rounds} onChange={(v) => onChange({ ...b, rounds: Math.max(1, Math.round(v ?? 1)) })} width={44} />
          {b.mode === 'intervals' ? 'reps' : 'rounds'}
        </label>
        {b.mode === 'intervals' && (
          <>
            <label className="inline">
              work <TimeInput value={b.workSec} onChange={(v) => onChange({ ...b, workSec: v })} />
            </label>
            <label className="inline">
              rest <TimeInput value={b.restSec} onChange={(v) => onChange({ ...b, restSec: v })} />
            </label>
          </>
        )}
      </div>
      {b.items.map((it, i) => (
        <div key={it.id} className="item-row">
          <ItemEditor item={it} mode={b.mode} onChange={(n) => setItems((a) => (a[i] = n))} />
          <div className="item-actions">
            <button className="btn ghost small" onClick={() => setItems((a) => move(a, i, -1))}>↑</button>
            <button className="btn ghost small" onClick={() => setItems((a) => move(a, i, 1))}>↓</button>
            <button className="btn ghost small" onClick={() => setItems((a) => a.splice(i, 1))}>✕</button>
          </div>
        </div>
      ))}
      <div className="row wrap">
        <button className="btn small" onClick={() => setItems((a) => a.push(run(b.mode === 'intervals' ? 0 : 1000)))}>+ Run</button>
        <button className="btn small" onClick={() => setItems((a) => a.push(st('wallballs')))}>+ Station</button>
        <button className="btn small" onClick={() => setItems((a) => a.push({ id: uid(), kind: 'bike', label: 'Assault Bike' }))}>+ Bike</button>
        <button className="btn small" onClick={() => setItems((a) => a.push({ id: uid(), kind: 'other', label: 'Exercise' }))}>+ Other</button>
      </div>
      <textarea
        placeholder="Notes / coaching cues"
        value={b.notes ?? ''}
        onChange={(e) => onChange({ ...b, notes: e.target.value })}
        rows={2}
      />
    </div>
  );
}

export function Editor({ go }: { go: (to: string) => void }) {
  const { data, update } = useStore();
  const w = data.draft;
  if (!w) {
    return (
      <div className="screen">
        <p>No workout selected.</p>
        <button className="btn primary" onClick={() => go('/today')}>Choose a workout</button>
      </div>
    );
  }
  const set = (fn: (w: Workout) => void) =>
    update((d) => {
      fn(d.draft!);
      return d;
    });

  const saveTemplate = () => {
    const name = prompt('Template name', w.name);
    if (!name) return;
    update((d) => {
      d.customTemplates.push({
        id: uid(), name, custom: true, phases: [], summary: 'Saved from a customised workout.',
        blocks: structuredClone(d.draft!.blocks),
      });
      return d;
    });
    alert('Saved — it will appear in your options every day.');
  };

  return (
    <div className="screen">
      <input className="title-input lg" value={w.name} onChange={(e) => set((x) => (x.name = e.target.value))} />
      <p className="muted small">
        Customise anything: stations, distances, weights, rounds, order. Lighter-than-Pro weights are scaled in the
        prediction.
      </p>
      {w.blocks.map((b, i) => (
        <BlockEditor
          key={b.id}
          b={b}
          onChange={(nb) => set((x) => (x.blocks[i] = nb))}
          onRemove={() => confirm(`Remove "${b.title}"?`) && set((x) => x.blocks.splice(i, 1))}
        />
      ))}
      <button className="btn block" onClick={() => set((x) => x.blocks.push(newBlock()))}>+ Add block</button>
      <div className="row sticky-actions">
        <button className="btn ghost" onClick={saveTemplate}>Save as template</button>
        <button className="btn primary grow" onClick={() => go('/log')} disabled={!w.blocks.length}>Start workout →</button>
      </div>
    </div>
  );
}
