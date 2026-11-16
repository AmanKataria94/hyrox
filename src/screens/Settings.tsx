import { useRef } from 'react';
import { NumInput, TimeInput } from '../components/TimeInput';
import { useStore } from '../store';
import { defaultData, exportFile, importFile } from '../storage';
import type { Settings as S } from '../types';
import { fmtDate } from '../time';

export function Settings() {
  const { data, update, replace, saveFailed } = useStore();
  const file = useRef<HTMLInputElement>(null);
  const s = data.settings;
  const set = <K extends keyof S>(k: K, v: S[K] | undefined) =>
    v !== undefined && update((d) => ((d.settings[k] = v), d));

  const doImport = async (f?: File) => {
    if (!f) return;
    try {
      const d = await importFile(f);
      if (!confirm(`Replace current data with backup (${d.workouts.length} workouts)?`)) return;
      replace(d);
      alert('Backup restored.');
    } catch (e) {
      alert(`Could not import: ${(e as Error).message}`);
    }
    if (file.current) file.current.value = '';
  };

  return (
    <div className="screen">
      <h2>Settings & data</h2>

      <div className="card">
        <h3>Backup</h3>
        {saveFailed && <p className="warn">⚠ This browser is blocking storage (private mode?). Export before closing.</p>}
        <p className="small muted">
          Data lives only in this browser. iPhone Safari may clear site data after a long spell without visits, so export
          after each session and keep the file in iCloud Drive / Files. To move devices, export here and import there.
          {data.lastExport && <> Last export: {fmtDate(data.lastExport)}.</>}
        </p>
        <div className="row wrap">
          <button
            className="btn primary"
            onClick={() => {
              exportFile(data);
              update((d) => ({ ...d, lastExport: new Date().toISOString() }));
            }}
          >
            Export JSON
          </button>
          <button className="btn" onClick={() => file.current?.click()}>Import JSON</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
        </div>
      </div>

      <div className="card">
        <h3>Plan</h3>
        <div className="form">
          <label>Race date<input type="date" value={s.eventDate} onChange={(e) => set('eventDate', e.target.value || undefined)} /></label>
          <label>Plan start<input type="date" value={s.planStart} onChange={(e) => set('planStart', e.target.value || undefined)} /></label>
          <label>Sessions / week<NumInput value={s.sessionsPerWeek} onChange={(v) => set('sessionsPerWeek', v)} width={60} /></label>
        </div>
      </div>

      <div className="card">
        <h3>Prediction model</h3>
        <div className="form">
          <label>
            Roxzone from race data
            <input type="checkbox" checked={s.roxzoneAuto} onChange={(e) => set('roxzoneAuto', e.target.checked)} />
          </label>
          {!s.roxzoneAuto && (
            <label>
              Roxzone total (all transitions)
              <TimeInput value={s.roxzoneSec} onChange={(v) => set('roxzoneSec', v)} />
            </label>
          )}
          <label>
            Fresh run → race pace factor
            <NumInput value={s.freshToRaceFactor} onChange={(v) => set('freshToRaceFactor', v)} width={60} />
          </label>
          <label>
            4-min interval pace → race pace factor
            <NumInput value={s.intervalToRaceFactor} onChange={(v) => set('intervalToRaceFactor', v)} width={60} />
          </label>
          <label>
            Skillmill → floor run factor
            <NumInput value={s.skillmillFactor} onChange={(v) => set('skillmillFactor', v)} width={60} />
          </label>
        </div>
        <details className="small muted">
          <summary>How the prediction works</summary>
          <p>
            Finish = 8 × mean race 1 km + each station's <em>team</em> time + roxzone. Your partner is assumed to match
            you.
          </p>
          <p>
            Calibrated on 92k HYROX results (seasons 4–6): station times at Pro weight vs run pace (7,880 Pro Men),
            doubles ÷ singles station ratios (ergs ≈ 0.9, sleds ≈ 0.57), and roxzone vs finish time. Your training splits
            are converted to race terms (scaled to full distance, Pro weight, and the doubles ratio) and fed to a
            per-station Kalman filter that tracks level and trend with source-specific noise (benchmark 4 %, sim 5 %,
            fresh station 9 %, bike 15 %). Wild outliers are down-weighted. The race-day projection extrapolates each
            trend with dampening (≈50-day horizon); the 80 % range comes from the filter's variance.
          </p>
          <p>
            Skillmill: if your Skillmill splits are slower than you'd run on a flat floor, set the factor below 1 (e.g.
            0.95). Compare one 1 km time on each to calibrate.
          </p>
        </details>
      </div>

      <div className="card">
        <button
          className="btn ghost block danger"
          onClick={() => confirm('Erase ALL data? Export a backup first!') && replace(defaultData())}
        >
          Reset everything
        </button>
      </div>
    </div>
  );
}
