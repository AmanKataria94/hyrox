import { Athlete, fitnessFromTime, fitnessLabel } from '../components/Athlete';
import { PredictionChart } from '../components/Chart';
import { RACE_RUNS, STATIONS } from '../hyrox';
import { PHASE_LABEL, planInfo } from '../plan';
import { useStore } from '../store';
import { fmt, fmtDelta } from '../time';

export function Home({ go }: { go: (to: string) => void }) {
  const { data, model } = useStore();
  const info = planInfo(data);
  const tl = model.timeline;
  const prev = tl.length > 1 ? tl[tl.length - 2].total : undefined;
  const delta = prev !== undefined ? model.total - prev : undefined;
  const est = model.estimates;
  // ?fit=0.2 in the URL previews the character at any level
  const fitOverride = parseFloat(new URLSearchParams(window.location.search).get('fit') ?? '');
  const fit = isFinite(fitOverride) ? fitOverride : fitnessFromTime(model.total);
  const daysSinceExport = data.lastExport
    ? Math.floor((Date.now() - new Date(data.lastExport).getTime()) / 86400000)
    : undefined;
  const needsBackup = data.workouts.length > 0 && (daysSinceExport === undefined || daysSinceExport >= 5);

  const z80 = 1.28;
  const range = (v: number, sd: number) => `${fmt(v - z80 * sd, true)} – ${fmt(v + z80 * sd, true)}`;
  const Conf = ({ n }: { n: number }) => (
    <span className="conf" title={`${n} observations`}>
      {[1, 3, 6].map((k) => (
        <i key={k} className={n >= k ? 'on' : ''} />
      ))}
    </span>
  );
  const Trend = ({ t, n }: { t: number; n: number }) => {
    if (n < 2) return null;
    const pm = t * 30 * 100; // % per month
    if (Math.abs(pm) < 0.5) return <span className="dim small">→</span>;
    return <span className={`small ${pm < 0 ? 'good' : 'bad'}`}>{pm < 0 ? '▼' : '▲'}{Math.abs(pm).toFixed(1)}%/mo</span>;
  };

  return (
    <div className="screen">
      <div className="hero stripes">
        <div className="eyebrow">Predicted finish · Men's Pro Doubles</div>
        <div className="big">{fmt(model.total, true)}</div>
        <div className="small muted">80% range {range(model.total, model.totalSd)}</div>
        {delta !== undefined && Math.abs(delta) >= 1 && (
          <div className={`delta ${delta < 0 ? 'good' : 'bad'}`}>{fmtDelta(delta)} since last workout</div>
        )}
        {info.daysToRace > 0 && Math.abs(model.raceDay - model.total) >= 5 && (
          <div className="raceday">
            <span className="eyebrow">Race-day projection</span> <strong>{fmt(model.raceDay, true)}</strong>
            <span className="small muted"> ({range(model.raceDay, model.raceDaySd)})</span>
          </div>
        )}
        <div className="muted">
          {info.daysToRace > 0 ? `${info.daysToRace} days to race · ` : ''}
          Week {info.week} of {info.totalWeeks} · {PHASE_LABEL[info.phase]}
        </div>
      </div>

      <div className="athlete-card">
        <Athlete t={fit} />
        <div className="athlete-meta">
          <div className="athlete-label">{fitnessLabel(fit)}</div>
          <div className="meter"><i style={{ width: `${Math.round(fit * 100)}%` }} /></div>
          <div className="small muted">
            {fit >= 0.85
              ? 'Sub-55 territory. Keep it sharp.'
              : fit >= 0.6
                ? 'Getting there — every sub-hour minute buffs him up.'
                : fit >= 0.35
                  ? 'Trade the laptop for the sled. Log the work.'
                  : 'Still more keyboard than kettlebell.'}
          </div>
        </div>
      </div>

      {!model.benchmarked && (
        <div className="card callout">
          <strong>This is a placeholder estimate.</strong> Do the Benchmark Test to get a real prediction.
          <button className="btn primary block" onClick={() => go('/today')}>Go to workouts</button>
        </div>
      )}

      {data.draft && (
        <div className="card callout">
          Workout in progress: <strong>{data.draft.name}</strong>
          <button className="btn primary block" onClick={() => go('/log')}>Continue logging</button>
        </div>
      )}

      {needsBackup && (
        <div className="card warn">
          {daysSinceExport === undefined ? 'No backup yet.' : `Last backup ${daysSinceExport} days ago.`} Your history only
          lives in this browser. Export a backup in <a href="#/settings">Settings</a>.
        </div>
      )}

      {!data.draft && model.benchmarked && (
        <button className="btn primary block lg" onClick={() => go('/today')}>
          Today's workout ({info.doneThisWeek}/{data.settings.sessionsPerWeek} this week)
        </button>
      )}

      {tl.length > 1 && (
        <div className="card">
          <h3>Trend</h3>
          <PredictionChart timeline={tl} />
        </div>
      )}

      <details className="card expand">
        <summary>
          <span>Breakdown</span>
          <span className="tag">{fmt(model.total, true)}</span>
        </summary>
        <table className="breakdown">
          <tbody>
            <tr>
              <td>Runs ({RACE_RUNS} × 1 km)</td>
              <td className="dim">{fmt(est.run.value)}/km <Trend t={est.run.trend} n={est.run.n} /></td>
              <td><Conf n={est.run.n} /></td>
              <td className="r">{fmt(RACE_RUNS * est.run.value)}</td>
            </tr>
            {STATIONS.map((s) => (
              <tr key={s.key}>
                <td>{s.name}</td>
                <td className="dim">{est[s.key].n ? <>±{fmt(est[s.key].sd)} <Trend t={est[s.key].trend} n={est[s.key].n} /></> : 'from run pace'}</td>
                <td><Conf n={est[s.key].n} /></td>
                <td className="r">{fmt(est[s.key].value)}</td>
              </tr>
            ))}
            <tr>
              <td>Roxzone</td>
              <td className="dim">{data.settings.roxzoneAuto ? 'from race data' : 'setting'}</td>
              <td />
              <td className="r">{fmt(model.roxzone)}</td>
            </tr>
            <tr className="total">
              <td colSpan={3}>Total</td>
              <td className="r">{fmt(model.total, true)}</td>
            </tr>
          </tbody>
        </table>
        <p className="small muted">
          Station rows are <em>team</em> times for the full station, converted from your training splits using
          doubles/singles ratios from real race data (ergs barely speed up when shared; sleds roughly halve). Untested
          stations are predicted from your run pace. Dots = observations (1 / 3 / 6+).
        </p>
      </details>
    </div>
  );
}
