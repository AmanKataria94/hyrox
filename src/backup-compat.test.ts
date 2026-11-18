import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { runModel } from './model';
import { normalise } from './storage';

/** Shape of an export from the first release (before calibration: no roxzoneAuto, no easy/paceFactor). */
const legacy = {
  version: 1,
  settings: {
    eventDate: '2027-03-13', planStart: '2026-11-16', sessionsPerWeek: 3, roxzoneSec: 360,
    freshToRaceFactor: 1.12, intervalToRaceFactor: 1.07, skillmillFactor: 1,
  },
  workouts: [
    {
      id: 'w1', date: '2026-11-17T08:00:00.000Z', name: 'Benchmark Test', templateId: 'benchmark', completed: true,
      blocks: [
        { id: 'b1', title: '1 km Time Trial', mode: 'rounds', rounds: 1, isTest: true, items: [{ id: 'r1', kind: 'run', distance: 1000 }] },
        {
          id: 'b2', title: 'Circuit', mode: 'rounds', rounds: 1, isTest: true,
          items: [
            { id: 's1', kind: 'station', station: 'ski', distance: 500 },
            { id: 'r2', kind: 'run', distance: 500 },
            { id: 's2', kind: 'station', station: 'push', distance: 25, weight: 202 },
          ],
        },
      ],
      results: { b1: { 0: { r1: { time: 349 } } }, b2: { 0: { s1: { time: 125 }, r2: { time: 178 }, s2: { time: 60 } } } },
    },
    { id: 'a1', date: '2026-11-18T18:00:00.000Z', name: 'Boxing', blocks: [], results: {}, completed: true, activity: { type: 'Boxing', minutes: 60 } },
  ],
  customTemplates: [],
  lastExport: '2026-11-18T19:00:00.000Z',
};

describe('backup compatibility', () => {
  it('imports a first-release export and fills new settings with defaults', () => {
    const d = normalise(JSON.parse(JSON.stringify(legacy)));
    expect(d.workouts).toHaveLength(2);
    expect(d.settings.roxzoneAuto).toBe(true);
    expect(d.settings.roxzoneSec).toBe(360); // user's own value kept
    expect(d.settings.planStart).toBe('2026-11-16');
    const m = runModel(d, new Date('2026-11-19T12:00:00Z').getTime());
    expect(m.benchmarked).toBe(true);
    expect(isFinite(m.total) && m.total > 3000 && m.total < 7200).toBe(true);
  });

  it('rejects files that are not backups', () => {
    expect(() => normalise({ hello: 1 })).toThrow();
  });

  // Real exports in the project folder (git-ignored, so this only runs on the dev machine).
  const real = '/Users/work/Code/Hyrox/hyrox-backup-2026-11-18.json';
  it.runIf(existsSync(real))('imports the real 18 Nov backup unchanged', () => {
    const raw = JSON.parse(readFileSync(real, 'utf8'));
    const d = normalise(raw);
    expect(d.workouts.length).toBe(raw.workouts.length);
    expect(d.settings).toMatchObject(raw.settings);
    const m = runModel(d, new Date('2026-11-18T12:00:00Z').getTime());
    expect(m.benchmarked).toBe(true);
    expect(Math.round(m.total)).toBe(4992); // same 1:23:12 as before these changes
  });
});
