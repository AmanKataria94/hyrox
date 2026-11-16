/**
 * Data-derived calibration constants.
 *
 * Source: 92k HYROX results with per-run / per-station / per-roxzone splits, seasons 4–6
 * (2021–23), compiled in github.com/winupwhatsup/project_hyrox from results.hyrox.com.
 * Fitted by analysis/fit_priors.py (output in analysis/fit.json). Rows filtered to
 * 40–120 min totals with plausible splits. Men only.
 *
 * Caveat: the "doubles" division in that data mixes Open and Pro weights (Pro Doubles was
 * rare then), so DOUBLES_RATIO comes from Open-weight teams. Station-vs-pace comes from
 * Pro Men singles (n = 7,880), which IS at Pro weights.
 */
import type { StationKey } from './types';

/** Pro Men singles: station seconds = a + b × mean race run pace (s/km). sd = residual sd. */
export const PRO_STATION_VS_PACE: Record<StationKey, { a: number; b: number; sd: number }> = {
  ski: { a: 190.9, b: 0.196, sd: 14.0 },
  push: { a: 35.5, b: 0.705, sd: 78.6 },
  pull: { a: -19.0, b: 1.358, sd: 119.7 },
  bbj: { a: -80.2, b: 1.121, sd: 58.7 },
  row: { a: 183.3, b: 0.294, sd: 17.3 },
  farmers: { a: 7.2, b: 0.438, sd: 31.6 },
  lunges: { a: -21.8, b: 1.096, sd: 65.5 },
  wallballs: { a: 42.6, b: 1.217, sd: 106.2 },
};

/**
 * Men's doubles team station time ÷ men's singles station time, at equal run pace
 * (median over 10 s/km pace bins, 230–360 s/km). Ergs barely speed up when shared;
 * strength stations roughly halve.
 */
export const DOUBLES_RATIO: Record<StationKey, number> = {
  ski: 0.889,
  push: 0.571,
  pull: 0.618,
  bbj: 0.556,
  row: 0.919,
  farmers: 0.787,
  lunges: 0.663,
  wallballs: 0.674,
};

/** Men's doubles total roxzone (s) = a + b × finish time (s). sd = residual sd. */
export const ROXZONE_DOUBLES = { a: -301.4, b: 0.1502, sd: 89.5 };

/** Men's doubles: run_i ÷ mean run, i = 1..8. Run 1 is fast, run 8 slow. */
export const RUN_PROFILE_DOUBLES = [0.851, 0.939, 1.014, 1.021, 1.041, 1.021, 1.014, 1.098];

/**
 * Exponent for scaling a partial station to the full solo distance:
 * solo_full = t × (full / amount)^DIST_EXP. Slightly super-linear for fatigue.
 */
export const DIST_EXP = 1.03;

/** Expected team station time at a given mean race run pace (s/km). */
export function stationPrior(k: StationKey, pace: number) {
  const { a, b, sd } = PRO_STATION_VS_PACE[k];
  const solo = Math.max(30, a + b * pace);
  return { mean: solo * DOUBLES_RATIO[k], sd: sd * DOUBLES_RATIO[k] };
}

/** Solve total = runs + stations + roxzone(total). */
export function totalWithRoxzone(runsPlusStations: number) {
  return (runsPlusStations + ROXZONE_DOUBLES.a) / (1 - ROXZONE_DOUBLES.b);
}
