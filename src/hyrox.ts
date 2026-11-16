import type { Component, StationKey } from './types';

export interface StationSpec {
  key: StationKey;
  name: string;
  short: string;
  unit: 'm' | 'reps';
  /** full race amount (solo) */
  full: number;
  /** Men's Pro weight in kg (sled totals include sled; farmers per hand) */
  proWeight?: number;
  /** time ∝ (proWeight / usedWeight) ^ exp */
  weightExp: number;
  weightNote?: string;
}

/** Race order. Men's Pro Doubles weights. */
export const STATIONS: StationSpec[] = [
  { key: 'ski', name: 'SkiErg', short: 'Ski', unit: 'm', full: 1000, weightExp: 0 },
  { key: 'push', name: 'Sled Push', short: 'Push', unit: 'm', full: 50, proWeight: 202, weightExp: 1.2, weightNote: 'incl. sled' },
  { key: 'pull', name: 'Sled Pull', short: 'Pull', unit: 'm', full: 50, proWeight: 153, weightExp: 1.2, weightNote: 'incl. sled' },
  { key: 'bbj', name: 'Burpee Broad Jumps', short: 'BBJ', unit: 'm', full: 80, weightExp: 0 },
  { key: 'row', name: 'Row', short: 'Row', unit: 'm', full: 1000, weightExp: 0 },
  { key: 'farmers', name: 'Farmers Carry', short: 'Farmers', unit: 'm', full: 200, proWeight: 32, weightExp: 0.6, weightNote: 'per hand' },
  { key: 'lunges', name: 'Sandbag Lunges', short: 'Lunges', unit: 'm', full: 100, proWeight: 30, weightExp: 0.4 },
  { key: 'wallballs', name: 'Wall Balls', short: 'WB', unit: 'reps', full: 100, proWeight: 9, weightExp: 0.5, weightNote: '3m target' },
];

export const STATION: Record<StationKey, StationSpec> = Object.fromEntries(
  STATIONS.map((s) => [s.key, s]),
) as Record<StationKey, StationSpec>;

/** Training share: half the race amount (what the benchmark asks you to do continuously). */
export const shareAmount = (k: StationKey) => STATION[k].full / 2;

export const COMPONENTS: Component[] = ['run', ...STATIONS.map((s) => s.key)];

export const componentName = (c: Component) => (c === 'run' ? '1 km run (race pace)' : STATION[c].name);

export const RACE_RUNS = 8;
