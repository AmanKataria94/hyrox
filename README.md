# Hyrox Pro Doubles Trainer

Single-user web app for Men's Pro Doubles prep (race: 13 Mar 2027). Static site — no server, no cost.

- **Prediction** — finish time = 8 × mean race 1 km + each station's *team* time + roxzone. Calibrated on 92k real HYROX results (see `analysis/`), tracked per station with a Kalman filter (level + trend, source-specific noise), with an 80 % range and a race-day projection. Recomputed from your full log after every workout.
- **Workout** — phase-based options (Base/VO2 → Build → Race → Taper), each fully editable (stations, distances, weights, rounds, intervals). Save your own templates.
- **Logging** — stopwatch with ⏱ split-fill, 4×4 interval timer with beeps, RPE/notes. Past workouts are editable.
- **Data** — stored in the browser (localStorage). Export/import JSON in Settings. Export after sessions: iPhone Safari can clear site data after long inactivity.

## Develop
```
npm install
npm run dev      # also reachable from your phone on the same Wi-Fi via the printed Network URL
npm test
npm run build    # outputs dist/
```

## Deploy (free)
`dist/` is plain static files with relative paths + hash routing, so any static host works at any URL.

- **Netlify Drop** (no account setup beyond sign-in): `npm run build`, then drag the `dist` folder onto https://app.netlify.com/drop.
- **Cloudflare Pages**: `npx wrangler pages deploy dist --project-name hyrox-trainer`
- **GitHub Pages**: push to a repo, publish `dist/` (e.g. via `gh-pages` branch).

Bookmark the URL in Safari (optionally Share → Add to Home Screen).

## Prediction model

`src/calib.ts` holds constants fitted from 92k HYROX results with full splits (seasons 4–6, from
[winupwhatsup/project_hyrox](https://github.com/winupwhatsup/project_hyrox)); `analysis/fit_priors.py` reproduces
them from that CSV (`python3 fit_priors.py hyrox_results.csv`). What the data gave us:

| Finding | Value used |
|---|---|
| Pro Men station time vs mean run pace | linear fit per station + residual sd (prior for untested stations) |
| Men's doubles ÷ singles station time at equal pace | ski 0.89, push 0.57, pull 0.62, BBJ 0.56, row 0.92, farmers 0.79, lunges 0.66, wall balls 0.67 |
| Men's doubles roxzone | −301 + 0.150 × finish time (≈3:50 at 59 min) |
| Doubles run profile (run i ÷ mean) | 0.85, 0.94, 1.01, 1.02, 1.04, 1.02, 1.01, 1.10 |

`src/model.ts`: each component is a Kalman filter in log space with state [level, trend/day]. Observation noise by
source: benchmark 4 %, race sim 5 %, compromised set 7 %, fresh station 9 %, intervals 10 %, bike 15 %. Innovations
beyond 3σ are Huber-inflated; >5σ and >50 % are rejected as typos. Race-day projection extrapolates the trend with
0.98/day dampening (≈50-day horizon). The 80 % range is ±1.28σ from the summed component variances.

Still assumptions (not fitted): fresh 1 km TT → race pace 1.15, 4-min interval pace → race pace 1.07, weight-scaling
exponents, bike→run coupling, Skillmill factor 1.0. The doubles ratios come from mostly Open-weight teams.
