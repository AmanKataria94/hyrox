import { describe, expect, it } from 'vitest';
import { runModel } from './model';
import { TEMPLATES, workoutFromTemplate } from './plan';
import { defaultData } from './storage';
import { parseTime } from './time';
import type { AppData, Workout } from './types';

const DAY = 86400000;
const bench = (runSplit: number, stationScale = 1, daysAgo = 0): Workout => {
  const w = workoutFromTemplate(TEMPLATES.find((t) => t.id === 'benchmark')!);
  const [tt, circuit] = w.blocks;
  w.results[tt.id] = { 0: { [tt.items[0].id]: { time: 230 } } }; // 3:50 fresh 1k
  // continuous half-station times (s) for a ~4:30/km athlete
  const half: Record<string, number> = { ski: 110, push: 50, pull: 65, bbj: 110, row: 115, farmers: 45, lunges: 100, wallballs: 150 };
  w.results[circuit.id] = { 0: {} };
  for (const it of circuit.items)
    w.results[circuit.id][0][it.id] = { time: it.kind === 'run' ? runSplit : half[it.station!] * stationScale };
  w.completed = true;
  w.date = new Date(Date.now() - daysAgo * DAY).toISOString();
  return w;
};
const data = (...ws: Workout[]): AppData => {
  const d = defaultData();
  d.settings.planStart = new Date(Date.now() - 60 * DAY).toISOString().slice(0, 10);
  return { ...d, workouts: ws };
};

describe('model', () => {
  it('prior alone gives a plausible pro doubles time with a wide range', () => {
    const m = runModel(data());
    expect(m.total / 60).toBeGreaterThan(55);
    expect(m.total / 60).toBeLessThan(75);
    expect(m.totalSd).toBeGreaterThan(120);
  });

  it('benchmark gives a sensible prediction and tightens the range', () => {
    const m0 = runModel(data());
    const m = runModel(data(bench(130)));
    expect(m.benchmarked).toBe(true);
    expect(m.estimates.run.value).toBeGreaterThan(255);
    expect(m.estimates.run.value).toBeLessThan(285);
    expect(m.total / 60).toBeGreaterThan(50);
    expect(m.total / 60).toBeLessThan(65);
    expect(m.totalSd).toBeLessThan(m0.totalSd);
    // ergs barely speed up when shared: team ski ≈ 1.8× your half, sled push ≈ 1.15×
    expect(m.estimates.ski.value / 110).toBeGreaterThan(1.6);
    expect(m.estimates.push.value / 50).toBeLessThan(1.4);
  });

  it('improvement over time lowers today AND projects further for race day', () => {
    const m = runModel(data(bench(140, 1.1, 40), bench(135, 1.05, 20), bench(128, 1.0, 0)));
    const single = runModel(data(bench(128, 1.0, 0)));
    expect(m.timeline).toHaveLength(4);
    expect(m.estimates.run.trend).toBeLessThan(0);
    expect(m.raceDay).toBeLessThan(m.total);
    expect(Math.abs(m.total - single.total)).toBeLessThan(120);
  });

  it('typos are gated', () => {
    const m = runModel(data(bench(130, 1, 10), bench(13, 1, 0)));
    expect(m.estimates.run.value).toBeGreaterThan(220);
  });

  it('roxzone is derived from finish time', () => {
    const m = runModel(data(bench(130)));
    expect(m.roxzone).toBeGreaterThan(150);
    expect(m.roxzone).toBeLessThan(330);
  });

  it('easy runs are logged but do not move the prediction', () => {
    const base = runModel(data(bench(130, 1, 5)));
    const easy = workoutFromTemplate(TEMPLATES.find((t) => t.id === 'easy-run')!);
    const blk = easy.blocks[0];
    easy.results[blk.id] = { 0: { [blk.items[0].id]: { time: 7000 * 0.42 } } }; // 7 min/km
    easy.completed = true;
    const m = runModel(data(bench(130, 1, 5), easy));
    expect(m.estimates.run.value).toBeCloseTo(base.estimates.run.value, 0);
  });

  it('parses phone-friendly times', () => {
    expect(parseTime('145')).toBe(105);
    expect(parseTime('1.45')).toBe(105);
    expect(parseTime('1:02:05')).toBe(3725);
    expect(parseTime('45')).toBe(45);
    expect(parseTime('abc')).toBeUndefined();
  });
});
