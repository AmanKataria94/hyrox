import { DIST_EXP, DOUBLES_RATIO, ROXZONE_DOUBLES, stationPrior, totalWithRoxzone } from './calib';
import { COMPONENTS, RACE_RUNS, STATION, STATIONS } from './hyrox';
import type { AppData, Block, Component, Estimates, Settings, StationKey, Workout } from './types';

/**
 * Prediction model
 * ----------------
 * finish = 8 × (mean race 1 km) + Σ team station time + roxzone(finish)
 *
 * Partner is assumed identical. Team station times come from the doubles/singles ratios
 * in calib.ts, so a station you do continuously for half the distance in training is
 * converted to the time a team would post in the race (ergs ≈ 1.8× your half, sleds ≈ 1.15×).
 *
 * Each component is tracked by a Kalman filter in log space with state [level, trend/day].
 * Observations carry source-specific noise; large innovations are down-weighted (outlier
 * gate). Stations with no data use a pace-conditional prior from 7,880 Pro Men results.
 * The race-day projection extrapolates the trend with exponential dampening.
 */

export interface Observation {
  /** race-equivalent seconds (run: s/km; station: team time) */
  value: number;
  /** coefficient of variation of measurement noise */
  cv: number;
  source: string;
}

export interface Snapshot {
  workoutId?: string;
  date: string;
  total: number;
  estimates: Estimates;
}

export interface ModelResult {
  estimates: Estimates;
  /** if you raced today */
  total: number;
  totalSd: number;
  /** projected for race day (trend extrapolated, dampened) */
  raceDay: number;
  raceDaySd: number;
  roxzone: number;
  timeline: Snapshot[];
  benchmarked: boolean;
  /** per-component observation counts */
  nObs: Record<Component, number>;
}

// ---------- noise / dynamics constants ----------
/** measurement cv by observation type */
export const CV = { test: 0.04, sim: 0.05, compromised: 0.07, freshStation: 0.09, freshRun: 0.08, interval: 0.1, bike: 0.15 };
const Q_LEVEL = 0.004; // sd/day of unexplained level drift (log)
const Q_TREND = 0.0003; // sd/day of trend change
const P0_TREND = 0.002; // prior sd of trend (log/day) ≈ 6 %/month
const DAMP = 0.98; // trend dampening per day when projecting
const GATE = 3; // innovations beyond GATE σ get R × 10

const DAY = 86400000;
const PRIOR_PACE = 285;
const PRIOR_PACE_SD = 0.12; // log sd ≈ 12 %

interface KF {
  l: number; // log level
  t: number; // trend (log/day)
  pll: number;
  plt: number;
  ptt: number;
  at: number; // ms epoch of last update
  n: number;
}

function kfInit(l: number, sdLog: number, at: number): KF {
  return { l, t: 0, pll: sdLog * sdLog, plt: 0, ptt: P0_TREND * P0_TREND, at, n: 0 };
}
function kfPredict(k: KF, to: number) {
  const dt = Math.max(0, (to - k.at) / DAY);
  if (dt === 0) return;
  const l = k.l + k.t * dt;
  const pll = k.pll + 2 * dt * k.plt + dt * dt * k.ptt + Q_LEVEL * Q_LEVEL * dt;
  const plt = k.plt + dt * k.ptt;
  const ptt = k.ptt + Q_TREND * Q_TREND * dt;
  Object.assign(k, { l, pll, plt, ptt, at: to });
}
function kfUpdate(k: KF, z: number, cv: number) {
  let r = cv * cv;
  const y = z - k.l;
  let s = k.pll + r;
  // hard reject: >5σ AND >±50 % in log — a typo, not a training effect
  if (Math.abs(y) > 0.5 && y * y > 25 * s) return;
  // Huber-style: inflate R so the standardised innovation is capped at GATE σ
  if (y * y > GATE * GATE * s) {
    r = (y * y) / (GATE * GATE) - k.pll;
    s = k.pll + r;
  }
  const gl = k.pll / s, gt = k.plt / s;
  k.l += gl * y;
  k.t += gt * y;
  const pll = (1 - gl) * k.pll, plt = (1 - gl) * k.plt, ptt = k.ptt - gt * k.plt;
  Object.assign(k, { pll, plt, ptt });
  k.n++;
}
/** mean & sd (linear seconds) at `days` ahead with dampened trend */
function kfProject(k: KF, days: number) {
  const n = Math.max(0, days);
  const eff = n > 0 ? (DAMP * (1 - Math.pow(DAMP, n))) / (1 - DAMP) : 0; // Σ DAMP^i
  const l = k.l + k.t * eff;
  const v = k.pll + 2 * eff * k.plt + eff * eff * k.ptt + Q_LEVEL * Q_LEVEL * n;
  const mean = Math.exp(l);
  return { mean, sd: mean * Math.sqrt(v) };
}

// ---------- observations ----------
const toKm = (t: number, d: number) => t * Math.pow(1000 / d, 1.06);

function blockFlags(b: Block) {
  const stations = new Set(b.items.filter((i) => i.kind === 'station').map((i) => i.station));
  return { hasStation: stations.size > 0, hasRun: b.items.some((i) => i.kind === 'run'), isSim: stations.size >= 4 };
}

interface Ctx {
  settings: Settings;
  bikeRef?: { cpm: number; run: number };
  runEstimate: number;
}

export function extractObservations(w: Workout, ctx: Ctx): Partial<Record<Component, Observation[]>> {
  const out: Partial<Record<Component, Observation[]>> = {};
  const push = (c: Component, o: Observation) => {
    if (!isFinite(o.value) || o.value <= 0) return;
    (out[c] ??= []).push(o);
  };
  const s = ctx.settings;

  for (const b of w.blocks) {
    const { hasStation, hasRun, isSim } = blockFlags(b);
    const res = w.results[b.id] ?? {};
    const bikeCpm: number[] = [];

    for (let r = 0; r < b.rounds; r++) {
      for (const it of b.items) {
        const x = res[r]?.[it.id];
        if (!x) continue;

        if (it.kind === 'run') {
          if (b.mode === 'rounds') {
            const d = x.distance ?? it.distance;
            if (!x.time || !d || d < 200) continue;
            const km = toKm(x.time, d) * s.skillmillFactor;
            if (hasStation) push('run', { value: km, cv: b.isTest ? CV.test : isSim ? CV.sim : CV.compromised, source: `${b.title}: compromised run` });
            else push('run', { value: km * s.freshToRaceFactor, cv: CV.freshRun, source: `${b.title}: fresh run` });
          } else if (b.workSec && x.distance) {
            const pace = (b.workSec / x.distance) * 1000 * s.skillmillFactor;
            push('run', { value: pace * s.intervalToRaceFactor, cv: CV.interval, source: `${b.title}: run intervals` });
          }
        } else if (it.kind === 'bike') {
          if (b.mode === 'intervals' && b.workSec && x.cals) bikeCpm.push(x.cals / (b.workSec / 60));
        } else if (it.kind === 'station' && it.station) {
          const spec = STATION[it.station];
          let time: number | undefined, amount: number | undefined;
          if (b.mode === 'rounds') {
            time = x.time;
            amount = spec.unit === 'reps' ? x.reps ?? it.reps : x.distance ?? it.distance;
          } else if (b.workSec) {
            time = b.workSec;
            amount = spec.unit === 'reps' ? x.reps : x.distance;
          }
          if (!time || !amount) continue;
          // solo full-distance equivalent → team race time
          let solo = time * Math.pow(spec.full / amount, DIST_EXP);
          let cv = b.isTest ? CV.test : isSim ? CV.sim : hasRun ? CV.compromised : CV.freshStation;
          const used = x.weight ?? it.weight ?? spec.proWeight;
          if (spec.proWeight && used) {
            const ratio = spec.proWeight / used;
            solo *= Math.pow(ratio, spec.weightExp);
            if (ratio > 1.4) cv *= 1.5;
          }
          if (!hasRun) solo *= 1.05; // fresh → compromised
          cv *= Math.max(1, Math.sqrt((spec.full / 2) / amount)); // short sets are noisier
          push(it.station, { value: solo * DOUBLES_RATIO[it.station], cv, source: `${b.title}: ${spec.name}` });
        }
      }
    }

    if (bikeCpm.length) {
      const cpm = bikeCpm.reduce((a, v) => a + v, 0) / bikeCpm.length;
      if (!ctx.bikeRef) ctx.bikeRef = { cpm, run: ctx.runEstimate };
      else push('run', { value: ctx.bikeRef.run * Math.pow(ctx.bikeRef.cpm / cpm, 0.35), cv: CV.bike, source: `${b.title}: bike engine` });
    }
  }
  return out;
}

// ---------- assembling the race ----------
function assemble(filters: Record<Component, KF>, days: number, settings: Settings): { est: Estimates; total: number; sd: number; roxzone: number } {
  const run = kfProject(filters.run, days);
  const est = { run: { value: run.mean, sd: run.sd, trend: filters.run.t, n: filters.run.n } } as Estimates;
  let sum = RACE_RUNS * run.mean;
  let v = Math.pow(RACE_RUNS * run.sd, 2);
  for (const s of STATIONS) {
    const k = filters[s.key];
    let p: { mean: number; sd: number };
    if (k.n === 0) {
      // no data: pace-conditional prior (uses projected run pace)
      p = stationPrior(s.key, run.mean);
    } else p = kfProject(k, days);
    est[s.key] = { value: p.mean, sd: p.sd, trend: k.t, n: k.n };
    sum += p.mean;
    v += p.sd * p.sd;
  }
  const total = settings.roxzoneAuto ? totalWithRoxzone(sum) : sum + settings.roxzoneSec;
  const roxzone = total - sum;
  if (settings.roxzoneAuto) v = v / Math.pow(1 - ROXZONE_DOUBLES.b, 2) + ROXZONE_DOUBLES.sd * ROXZONE_DOUBLES.sd * 0.25;
  return { est, total, sd: Math.sqrt(v), roxzone };
}

export function runModel(data: AppData, now = Date.now()): ModelResult {
  const settings = data.settings;
  const start = new Date(settings.planStart + 'T00:00:00').getTime();
  const race = new Date(settings.eventDate + 'T08:00:00').getTime();
  const filters = {} as Record<Component, KF>;
  filters.run = kfInit(Math.log(PRIOR_PACE), PRIOR_PACE_SD, start);
  for (const s of STATIONS) {
    const p = stationPrior(s.key, PRIOR_PACE);
    filters[s.key] = kfInit(Math.log(p.mean), Math.min(0.5, p.sd / p.mean), start);
  }
  const ctx: Ctx = { settings, runEstimate: PRIOR_PACE };
  const timeline: Snapshot[] = [];
  const snap = (date: string, at: number, workoutId?: string) => {
    for (const c of COMPONENTS) kfPredict(filters[c], at);
    const a = assemble(filters, 0, settings);
    timeline.push({ workoutId, date, total: a.total, estimates: a.est });
  };
  snap(settings.planStart, start);

  let benchmarked = false;
  const sorted = [...data.workouts].filter((w) => w.completed).sort((a, b) => a.date.localeCompare(b.date));
  for (const w of sorted) {
    const at = new Date(w.date).getTime();
    ctx.runEstimate = Math.exp(filters.run.l + filters.run.t * Math.max(0, (at - filters.run.at) / DAY));
    const obs = extractObservations(w, ctx);
    const comps = Object.keys(obs) as Component[];
    if (!comps.length) continue;
    if (w.blocks.some((b) => b.isTest)) benchmarked = true;
    for (const c of comps) {
      const k = filters[c];
      kfPredict(k, at);
      // station with no data yet: re-centre its prior on the current run estimate before first update
      if (c !== 'run' && k.n === 0) {
        const p = stationPrior(c as StationKey, Math.exp(filters.run.l));
        k.l = Math.log(p.mean);
      }
      for (const o of obs[c]!) kfUpdate(k, Math.log(o.value), o.cv);
    }
    snap(w.date, at, w.id);
  }

  for (const c of COMPONENTS) kfPredict(filters[c], Math.max(now, filters[c].at));
  const today = assemble(filters, 0, settings);
  const daysToRace = Math.max(0, (race - now) / DAY);
  const rd = assemble(filters, daysToRace, settings);
  const nObs = Object.fromEntries(COMPONENTS.map((c) => [c, filters[c].n])) as Record<Component, number>;
  return {
    estimates: today.est,
    total: today.total,
    totalSd: today.sd,
    raceDay: rd.total,
    raceDaySd: rd.sd,
    roxzone: today.roxzone,
    timeline,
    benchmarked,
    nObs,
  };
}

/** Prediction immediately before and after a given workout (for the finish screen). */
export function impactOf(data: AppData, workoutId: string) {
  const { timeline } = runModel(data);
  const i = timeline.findIndex((s) => s.workoutId === workoutId);
  if (i <= 0) return undefined;
  return { before: timeline[i - 1], after: timeline[i] };
}
