import { useState } from 'react';
import { NumInput } from '../components/TimeInput';
import { STATION } from '../hyrox';
import { PHASE_LABEL, TEMPLATES, blankWorkout, optionsFor, planInfo, uid, workoutFromTemplate } from '../plan';
import { useStore } from '../store';
import type { Block, Phase, Template, Workout } from '../types';
import { fmt } from '../time';

export function describeBlock(b: Block): string {
  const items = b.items
    .map((i) => {
      if (i.kind === 'run') return b.mode === 'intervals' ? 'Run' : `Run ${i.distance}m`;
      if (i.kind === 'bike') return 'Bike';
      if (i.kind === 'station' && i.station) {
        const s = STATION[i.station];
        const amt = s.unit === 'reps' ? `${i.reps ?? ''}` : `${i.distance ?? ''}m`;
        return b.mode === 'intervals' ? s.short : `${s.short} ${amt}${i.weight ? ` @${i.weight}kg` : ''}`;
      }
      return i.label || 'Other';
    })
    .join(' → ');
  if (b.mode === 'intervals') return `${b.rounds} × ${fmt(b.workSec)} on / ${fmt(b.restSec)} off: ${items}`;
  return `${b.rounds > 1 ? `${b.rounds} rounds: ` : ''}${items}`;
}

const PHASE_CHIPS: { p: Phase; label: string }[] = [
  { p: 'base', label: 'Base' },
  { p: 'build', label: 'Build' },
  { p: 'race', label: 'Race' },
  { p: 'taper', label: 'Taper' },
];

function PhaseChips({ phases, current }: { phases: Phase[]; current: Phase }) {
  if (!phases.length || phases.includes('test')) return null;
  return (
    <div className="phase-chips" aria-label="Best for">
      <span className="small muted">Best for</span>
      {PHASE_CHIPS.filter((c) => phases.includes(c.p)).map((c) => (
        <span key={c.p} className={`phase-chip ${c.p}${c.p === current ? ' now' : ''}`}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

function OptionCard({ t, reason, current, onPick, onDelete }: {
  t: Template; reason?: string; current: Phase; onPick: () => void; onDelete?: () => void;
}) {
  return (
    <div className="card option" onClick={onPick}>
      <div className="row between">
        <h3>{t.name}</h3>
        {reason && <span className="tag">{reason}</span>}
      </div>
      <PhaseChips phases={t.phases} current={current} />
      <p className="muted small">{t.summary}</p>
      <ul className="blocks">
        {t.blocks.map((b) => (
          <li key={b.id}>
            <strong>{b.title}</strong> — {describeBlock(b)}
          </li>
        ))}
      </ul>
      {onDelete && (
        <button className="btn ghost small" onClick={(e) => (e.stopPropagation(), onDelete())}>
          Delete template
        </button>
      )}
    </div>
  );
}

export function Today({ go }: { go: (to: string) => void }) {
  const { data, update } = useStore();
  const info = planInfo(data);
  const opts = optionsFor(data);
  const shown = new Set(opts.map((o) => o.template.id));
  const others = TEMPLATES.filter((t) => !shown.has(t.id) && !t.phases.includes('test'));
  const [activity, setActivity] = useState({ type: 'Boxing', minutes: 60 as number | undefined });

  const begin = (w: Workout) => {
    if (data.draft && !confirm(`Discard the in-progress "${data.draft.name}"?`)) return;
    update((d) => ({ ...d, draft: w }));
    go('/edit');
  };

  const logActivity = () => {
    if (!activity.minutes) return;
    update((d) => {
      d.workouts.push({
        id: uid(), date: new Date().toISOString(), name: activity.type, blocks: [], results: {},
        activity: { type: activity.type, minutes: activity.minutes! }, completed: true,
      });
      return d;
    });
    go('/history');
  };

  const removeCustom = (t: Template) =>
    confirm(`Delete template "${t.name}"?`) &&
    update((d) => ({ ...d, customTemplates: d.customTemplates.filter((x) => x.id !== t.id) }));

  return (
    <div className="screen">
      <h2>Today's options</h2>
      <p className="muted">
        Week {info.week} · {PHASE_LABEL[info.phase]} · {info.doneThisWeek}/{data.settings.sessionsPerWeek} sessions this
        week. Pick one, then tweak anything before you start.
      </p>

      {data.draft && (
        <div className="card callout">
          In progress: <strong>{data.draft.name}</strong>
          <button className="btn primary block" onClick={() => go('/log')}>Continue</button>
        </div>
      )}

      {opts.map(({ template: t, reason }) => (
        <OptionCard key={t.id} t={t} reason={reason} current={info.phase} onPick={() => begin(workoutFromTemplate(t))}
          onDelete={t.custom ? () => removeCustom(t) : undefined} />
      ))}

      {others.length > 0 && (
        <details className="card expand">
          <summary>
            <span>Other phases</span>
            <span className="tag">{others.length}</span>
          </summary>
          <p className="muted small">Not scheduled for this week, but you can still pick any of them.</p>
          {others.map((t) => (
            <OptionCard key={t.id} t={t} current={info.phase} onPick={() => begin(workoutFromTemplate(t))} />
          ))}
        </details>
      )}

      <div className="card option" onClick={() => begin(blankWorkout())}>
        <h3>Build from scratch</h3>
        <p className="muted small">Start empty and add any runs, stations, bike or intervals.</p>
      </div>

      <div className="card">
        <h3>Log other training</h3>
        <p className="muted small">Boxing, calisthenics, etc. Kept in your history; does not change the prediction.</p>
        <div className="row wrap">
          <select value={activity.type} onChange={(e) => setActivity({ ...activity, type: e.target.value })}>
            <option>Boxing</option>
            <option>Calisthenics</option>
            <option>CrossFit</option>
            <option>Surfing</option>
            <option>Other</option>
          </select>
          <NumInput value={activity.minutes} onChange={(m) => setActivity({ ...activity, minutes: m })} width={70} />
          <span className="muted">min</span>
          <button className="btn" onClick={logActivity}>Log</button>
        </div>
      </div>
    </div>
  );
}
