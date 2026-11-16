export type StationKey = 'ski' | 'push' | 'pull' | 'bbj' | 'row' | 'farmers' | 'lunges' | 'wallballs';
export type Component = 'run' | StationKey;

export type ItemKind = 'run' | 'bike' | 'station' | 'other';

export interface Item {
  id: string;
  kind: ItemKind;
  station?: StationKey;
  /** metres (run, distance stations) */
  distance?: number;
  /** reps (wall balls, or 'other') */
  reps?: number;
  /** kg — sled total incl. sled, farmers per hand */
  weight?: number;
  label?: string;
}

export type BlockMode = 'rounds' | 'intervals';

export interface Block {
  id: string;
  title: string;
  /** rounds: log time per item per round. intervals: fixed work time, log distance/calories. */
  mode: BlockMode;
  rounds: number;
  workSec?: number;
  restSec?: number;
  items: Item[];
  notes?: string;
  /** Benchmark-test block: gets extra weight in the prediction model. */
  isTest?: boolean;
}

export interface ItemResult {
  time?: number; // seconds
  distance?: number; // metres (interval mode run)
  cals?: number; // interval mode bike
  weight?: number; // override of planned weight
  reps?: number;
}

/** results[blockId][roundIndex][itemId] */
export type Results = Record<string, Record<number, Record<string, ItemResult>>>;

export interface Workout {
  id: string;
  date: string; // ISO date-time
  name: string;
  templateId?: string;
  blocks: Block[];
  results: Results;
  rpe?: number;
  notes?: string;
  /** Simple non-modelled activity, e.g. boxing / calisthenics */
  activity?: { type: string; minutes: number };
  completed: boolean;
}

export interface Template {
  id: string;
  name: string;
  summary: string;
  phases: Phase[];
  blocks: Block[];
  custom?: boolean;
}

export type Phase = 'test' | 'base' | 'build' | 'race' | 'taper';

export interface Settings {
  eventDate: string; // YYYY-MM-DD
  planStart: string; // YYYY-MM-DD
  sessionsPerWeek: number;
  /** derive roxzone from finish time using race data */
  roxzoneAuto: boolean;
  /** manual roxzone total (used when roxzoneAuto is false) */
  roxzoneSec: number;
  /** fresh 1km pace -> compromised race pace */
  freshToRaceFactor: number;
  /** 4-min interval pace -> compromised race pace */
  intervalToRaceFactor: number;
  /** multiply Skillmill run times by this to get floor-run equivalent */
  skillmillFactor: number;
}

export interface AppData {
  version: 1;
  settings: Settings;
  workouts: Workout[];
  customTemplates: Template[];
  draft?: Workout;
  lastExport?: string;
}

export interface Estimate {
  /** seconds (run: mean race 1 km; station: team time for the full station) */
  value: number;
  sd: number;
  /** log-trend per day (negative = improving) */
  trend: number;
  /** observations so far */
  n: number;
}
export type Estimates = Record<Component, Estimate>;
