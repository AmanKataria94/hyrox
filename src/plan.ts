import { STATION, STATIONS, shareAmount } from './hyrox';
import type { AppData, Block, Item, Phase, StationKey, Template, Workout } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- item / block builders ----------
export const run = (distance: number): Item => ({ id: uid(), kind: 'run', distance });
export const bike = (): Item => ({ id: uid(), kind: 'bike', label: 'Assault Bike' });
export const st = (k: StationKey, amount?: number, weight?: number): Item => {
  const spec = STATION[k];
  const a = amount ?? shareAmount(k);
  return {
    id: uid(),
    kind: 'station',
    station: k,
    ...(spec.unit === 'reps' ? { reps: a } : { distance: a }),
    weight: weight ?? spec.proWeight,
  };
};
const rounds = (title: string, n: number, items: Item[], notes?: string, extra: Partial<Block> = {}): Block => ({
  id: uid(), title, mode: 'rounds', rounds: n, items, notes, ...extra,
});
const fourByFour = (title: string, item: Item, notes: string): Block => ({
  id: uid(), title, mode: 'intervals', rounds: 4, workSec: 240, restSec: 180, items: [item], notes,
});

const WARMUP = 'Warm-up 8–10 min: easy Skillmill jog, dynamic mobility, 2–3 strides.';
const FOURx4_RUN = '4 min hard at ~90–95% HRmax (breathing hard, can say 2–3 words), 3 min easy walk/jog. Log metres covered per rep.';
const FOURx4_BIKE = '4 min hard at ~90–95% HRmax, 3 min easy spin. Log calories per rep.';

// ---------- templates ----------
const T = (id: string, name: string, summary: string, phases: Phase[], blocks: () => Block[]) => ({
  id, name, summary, phases, get blocks() { return blocks(); },
});

const sim = (keys: StationKey[], runDist = 1000) => keys.flatMap((k) => [run(runDist), st(k)]);

export const TEMPLATES: Template[] = [
  T('benchmark', 'Benchmark Test', '1 km time trial + full doubles-share circuit. Sets your predicted finish time.', ['test'], () => [
    rounds('1 km Time Trial', 1, [run(1000)], `${WARMUP} Then run 1 km all-out on the Skillmill. Rest 5 min after.`, { isTest: true }),
    rounds(
      'Doubles-Share Circuit',
      1,
      STATIONS.flatMap((s) => [st(s.key), run(500)]),
      'Your half of every station at Pro weight, in race order, each followed by a 500 m run. Race effort — steady, not sprinting. Use the stopwatch: tap ⏱ after each segment.',
      { isTest: true },
    ),
  ]),

  // ---- base / VO2 ----
  T('cc-4x4-run', 'Compromised + 4×4 Run', '20 min SkiErg/run compromised cardio, then 4×4 Skillmill intervals.', ['base', 'build'], () => [
    rounds('Compromised Cardio', 4, [st('ski', 400), run(600)], `${WARMUP} ~20 min. Go straight from station to run — that transition is the point.`),
    fourByFour('4×4 Run', run(0), FOURx4_RUN),
  ]),
  T('cc-4x4-bike', 'Compromised + 4×4 Bike', 'Wall balls/run compromised cardio, then 4×4 Assault Bike (legs-friendly VO2).', ['base', 'build'], () => [
    rounds('Compromised Cardio', 4, [st('wallballs', 25), run(600)], `${WARMUP} ~20 min.`),
    fourByFour('4×4 Assault Bike', bike(), FOURx4_BIKE),
  ]),
  T('sleds-strength', 'Sleds & Strength Endurance', 'Pro-weight sleds with runs, then carries and lunges.', ['base', 'build'], () => [
    rounds('Sled Intervals', 4, [st('push', 25), st('pull', 25), run(400)], `${WARMUP} Rest 60–90 s between rounds if form breaks down.`),
    rounds('Carry & Lunge', 3, [st('farmers', 100), st('lunges', 50)], 'Steady, no rest between items, 90 s between rounds.'),
  ]),
  T('row-bbj-4x4', 'Row/BBJ + 4×4 Run', 'Row and burpee broad jumps compromised work, then 4×4 run.', ['base'], () => [
    rounds('Compromised Cardio', 3, [st('row', 500), st('bbj', 20), run(500)], `${WARMUP} ~20 min.`),
    fourByFour('4×4 Run', run(0), FOURx4_RUN),
  ]),

  // ---- running focus (all phases) ----
  T('easy-run', 'Easy Aerobic Run', 'Zone 2: 40–50 min conversational pace. Builds the aerobic base. Logged, not used for the prediction.', ['base', 'build', 'race'], () => [
    rounds('Easy Run', 1, [run(7000)], 'Nose-breathing / full-sentence pace (~60–70% HRmax). Slower than you think. Change the distance to whatever you covered.', { easy: true }),
    rounds('Strides', 4, [run(100)], '4 × 20 s relaxed fast strides, walk back. Good form, not a sprint.', { easy: true }),
  ]),
  T('threshold-run', 'Threshold Run', '3 × 8 min at comfortably-hard pace. Raises the pace you can hold for a whole race.', ['base', 'build'], () => [
    {
      id: uid(), title: 'Threshold Intervals', mode: 'intervals', rounds: 3, workSec: 480, restSec: 120, items: [run(0)],
      notes: `${WARMUP} ~85–90% HRmax, could say short sentences. Even pace across all 3. Log metres per rep.`,
      paceFactor: 1.02,
    },
    rounds('Cool-down', 1, [run(1000)], 'Easy jog.', { easy: true }),
  ]),
  T('km-repeats', '1 km Repeats', '5 × 1 km at goal race pace, 90 s rest. Teaches race pace.', ['base', 'build', 'race'], () => [
    rounds('1 km Repeats', 5, [run(1000)], `${WARMUP} Target your predicted race pace or a touch quicker. 90 s standing rest between reps.`, { paceFactor: 1.06 }),
    rounds('Station Finisher', 2, [st('wallballs', 25), st('bbj', 20)], 'Short maintenance for stations.'),
  ]),
  T('run-heavy-compromised', 'Run-Heavy Compromised', '6 × (800 m run + short station). Running is the work; stations just pre-fatigue.', ['base', 'build', 'race'], () => [
    rounds('Compromised Runs', 6, [run(800), st('farmers', 50)], `${WARMUP} Run hard-steady, station quick. Swap the station each week (ski 250 m, WB 15, sled push 12.5 m).`),
  ]),
  T('run-heavy-sled', 'Run-Heavy Compromised (Sled)', '6 × 800 m runs, alternating a short Pro sled push and a farmers carry. Practises running on sled-heavy legs.', ['build', 'race'], () => [
    rounds('Sled Round', 3, [run(800), st('push', 12.5), run(800), st('farmers', 50)], `${WARMUP} Get from the sled to the Skillmill fast — the first 200 m after the push is the point. Hold your run pace, don't sprint the sled.`),
  ]),
  T('vo2-shorts', '30/30 Run Intervals', '2 × 8 × 30 s fast / 30 s easy on the Skillmill. Sharp VO2 work without long suffering.', ['base', 'build'], () => [
    { id: uid(), title: '30/30 Set 1', mode: 'intervals', rounds: 8, workSec: 30, restSec: 30, items: [run(0)], notes: `${WARMUP} Fast but repeatable — the last rep as fast as the first. 3 min easy before set 2.`, easy: true },
    { id: uid(), title: '30/30 Set 2', mode: 'intervals', rounds: 8, workSec: 30, restSec: 30, items: [run(0)], notes: 'Same pace as set 1.', easy: true },
  ]),

  // ---- build ----
  T('half-sim-a', 'Half-Sim A (Stations 1–4)', 'Race-format runs + your share of Ski, Push, Pull, BBJ, then 4×4 bike.', ['build', 'race'], () => [
    rounds('Half Sim A', 1, sim(['ski', 'push', 'pull', 'bbj']), `${WARMUP} Race pace. Tap ⏱ after each segment.`),
    { ...fourByFour('4×4 Assault Bike', bike(), FOURx4_BIKE), rounds: 3 },
  ]),
  T('half-sim-b', 'Half-Sim B (Stations 5–8)', 'Race-format runs + your share of Row, Farmers, Lunges, Wall Balls, then 4×4 run.', ['build', 'race'], () => [
    rounds('Half Sim B', 1, sim(['row', 'farmers', 'lunges', 'wallballs']), `${WARMUP} Race pace. Tap ⏱ after each segment.`),
    { ...fourByFour('4×4 Run', run(0), FOURx4_RUN), rounds: 3 },
  ]),
  T('threshold-stations', 'Threshold Runs + Stations', '5 × 1 km at goal race pace with a station between each.', ['build'], () => [
    rounds('Threshold Rounds', 5, [run(1000), st('wallballs', 25)], `${WARMUP} Run at predicted race pace. Swap the station each week if you like.`),
    rounds('Finisher', 2, [st('lunges', 50), st('farmers', 100)], 'Pro weight, steady.'),
  ]),

  // ---- race specific ----
  T('full-sim', 'Full Doubles Simulation', 'All 8 runs + your share of all 8 stations at race pace. The real thing.', ['race'], () => [
    rounds('Doubles Race Sim', 1, sim(STATIONS.map((s) => s.key)), `${WARMUP} Race-day pacing and nutrition. Tap ⏱ after each segment.`),
  ]),
  T('race-pace-repeats', 'Race-Pace Repeats', 'Runs at race pace off the hardest stations (sleds + wall balls).', ['race'], () => [
    rounds('Race-Pace Rounds', 3, [st('push'), run(1000), st('wallballs'), run(1000)], `${WARMUP} ~40 min. Hold race pace on every run.`),
  ]),

  // ---- taper ----
  T('taper', 'Taper Sharpener', 'Short and sharp: keep the engine primed, stay fresh.', ['taper'], () => [
    rounds('Openers', 4, [run(500), st('ski', 250)], `${WARMUP} Race pace, full recovery (2 min) between rounds.`),
    rounds('Station Touch', 1, [st('push', 12.5), st('pull', 12.5), st('wallballs', 20)], 'Light touch at Pro weight — technique only.'),
  ]),
];

// ---------- calendar ----------
const DAY = 86400000;
const parse = (d: string) => new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
export const todayISO = () => new Date().toISOString().slice(0, 10);

export function planInfo(data: AppData, now = new Date()) {
  const start = parse(data.settings.planStart);
  const event = parse(data.settings.eventDate);
  const totalWeeks = Math.max(1, Math.ceil((event.getTime() - start.getTime()) / (7 * DAY)));
  const week = Math.min(totalWeeks, Math.max(1, Math.floor((now.getTime() - start.getTime()) / (7 * DAY)) + 1));
  const daysToRace = Math.ceil((event.getTime() - now.getTime()) / DAY);
  const weeksToRace = daysToRace / 7;
  const phase: Phase = weeksToRace <= 1.5 ? 'taper' : weeksToRace <= 4.5 ? 'race' : weeksToRace <= 10.5 ? 'build' : 'base';
  const weekStart = new Date(start.getTime() + (week - 1) * 7 * DAY);
  const doneThisWeek = data.workouts.filter(
    (w) => w.completed && !w.activity && parse(w.date) >= weekStart,
  ).length;
  const hasTest = data.workouts.some((w) => w.completed && w.blocks.some((b) => b.isTest));
  const lastTest = data.workouts
    .filter((w) => w.completed && w.blocks.some((b) => b.isTest))
    .map((w) => parse(w.date).getTime())
    .sort()
    .pop();
  const retestDue = hasTest && lastTest !== undefined && now.getTime() - lastTest > 6 * 7 * DAY && phase !== 'taper';
  return { totalWeeks, week, daysToRace, phase, doneThisWeek, hasTest, retestDue };
}

export const PHASE_LABEL: Record<Phase, string> = {
  test: 'Benchmark',
  base: 'Base · VO2 max',
  build: 'Build · Compromised strength',
  race: 'Race specific',
  taper: 'Taper',
};

export function optionsFor(data: AppData, now = new Date()): { template: Template; reason?: string }[] {
  const info = planInfo(data, now);
  const out: { template: Template; reason?: string }[] = [];
  const bench = TEMPLATES[0];
  if (!info.hasTest) out.push({ template: bench, reason: 'Start here — sets your prediction' });
  else if (info.retestDue) out.push({ template: bench, reason: 'Retest due (6+ weeks since last)' });
  for (const t of TEMPLATES) if (t.phases.includes(info.phase)) out.push({ template: t });
  for (const t of data.customTemplates) out.push({ template: t, reason: 'Your template' });
  return out;
}

/** Deep-copy a template's blocks into a fresh workout with new ids. */
export function workoutFromTemplate(t: Template): Workout {
  const blocks = t.blocks.map((b) => ({ ...b, id: uid(), items: b.items.map((i) => ({ ...i, id: uid() })) }));
  return { id: uid(), date: new Date().toISOString(), name: t.name, templateId: t.id, blocks, results: {}, completed: false };
}

export function blankWorkout(): Workout {
  return {
    id: uid(), date: new Date().toISOString(), name: 'Custom Workout', completed: false, results: {},
    blocks: [rounds('Block 1', 3, [run(1000)])],
  };
}

export const newBlock = (): Block => rounds('New Block', 3, [run(500)]);
