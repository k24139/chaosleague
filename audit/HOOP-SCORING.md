# Basketball hoop scoring verification — October 18, 2026

## Reproduction and exact causes

Baseline: 160 tests and the production build passed. The old scoring tests mostly assigned positions around the rim rather than shooting through the actual colliders.

The hoops use mirrored rim/backboard geometry, identical ball clearance, and the same scoring code. No right-only collider or rendering mismatch was found. The defects affect both hoops:

1. **Launch trajectory:** The old solver chose flight time from horizontal distance, without requiring a descending arrival or front-rim clearance. At midcourt, a preferred-charge stationary shot peaked at approximately y=311; a normal ball needs its center above y=295 to clear the y=315 rim. Close shots could cross upward through the mouth, strike the rim/backboard, and then fall downward while marked as an underhand entry. The browser reproduced a right-hoop shot staying at 0–0 with this blocked passage state; see [hoop-before.json](hoop-before.json).
2. **False underhand rejection:** The detector used the entire near-rim radius when classifying upward entries. That could mark an ascent beside the opening as an underhand entry and invalidate a later legitimate descending entry.
3. **Frame endpoint rejection:** The detector checked the ball's final horizontal position when it had passed the lower scoring plane. A fast ball could legally cross that plane inside the mouth, then finish the same physics step outside it and lose the point.

## Changes

- `src/systems/BasketballPossession.ts`: choose an above-rim apex, derive an ascending-plus-descending flight duration, and solve initial velocity using Matter's per-step gravity and air drag. Ball radius determines clearance. Charge still changes shot power, with no homing, automatic scoring, or changes to press/hold/release semantics.
- `src/entities/Ball.ts`: share the existing air-friction constant with the launch solver; actual ball friction is unchanged.
- `src/systems/PhysicsWorld.ts`: supply the real ball radius to the launch solver.
- `src/sports/Basketball.ts`: interpolate both rim and lower-plane crossings against the moving rim plane; classify underhand entry using the actual opening; clear old passage state when possession is acquired. Left hoop awards P2, right hoop awards P1. The ball must approach from above, descend through the opening, and reach the lower plane. One-score-per-ball tracking remains.
- `tests/hoop-physics.test.ts`: 46 new tests.
- `tests/hoop-browser-audit.mjs`: repeatable real-input scoring audit.
- `tests/run-action-browser-audit.mjs`: add the `--hoops` audit option.
- Audit evidence and README/AUDIT links updated.

The rim dimensions, backboards, scoring opening, ball sizes, net rendering, possession protections, block/dizzy mechanics, and other sports are retained.

## Automated checks

- `npm test`: **206 passed, 0 failed**.
- `npm run build`: passed (TypeScript and Vite).
- `git diff --check`: passed.

New tests run actual Matter simulation with real rim/backboard bodies. Coverage includes valid drops through both hoops; underside, outside, and rim-contact misses; duplicate suppression and continued net travel; Giant Ball, Tiny Ball, Moving Goals, and Double Ball; preferred-charge shots from midcourt and close range under normal/low/high gravity; mirrored low/medium/maximum-charge trajectories; fast scoring-plane crossings; upward crossings beside the mouth; and both CPU sides collecting, charging, and scoring.

Low or excessive charge can still miss. The corrected arc makes properly charged shots physically achievable instead of guaranteeing a basket for every charge.

## Actual browser evidence

Isolated Playwright Chrome used real keyboard movement, automatic pickup, and S/Down hold/release. The initial sport, positions, and fresh round state were controlled. No possession, scoring events, or calls to the scoring function were injected.

| Shooter | Range | Actual Action hold | Result after reset |
| --- | --- | --- | --- |
| P1 → right hoop | Midcourt | 599 ms | P1 leads 1–0 |
| P1 → right hoop | Close | 404 ms | P1 leads 1–0 |
| P2 → left hoop | Midcourt | 597 ms | P2 leads 0–1 |
| P2 → left hoop | Close | 404 ms | P2 leads 0–1 |
| Built-in CPU → left hoop | Close | AI controlled | CPU scored |

All four human scenarios verified the score animation, a new loose ball and player reset, retained point totals, and resumed live gameplay. CPU collection/charging came from the built-in side-1 AI with no keyboard assistance. The product assigns CPU to side 1; side-0 CPU scoring is additionally covered by the physics tests.

Recorded trajectories and score/reset snapshots: [hoop-browser-results.json](hoop-browser-results.json). Screenshots were saved and inspected at `audit/hoop-p1-midcourt.png`, `hoop-p1-close.png`, `hoop-p2-midcourt.png`, `hoop-p2-close.png`, and `hoop-cpu.png` (Git-ignored image artifacts).

To reproduce, run Vite on port 5174 and, with Playwright available:

```sh
node tests/run-action-browser-audit.mjs --hoops
```

Set `PLAYWRIGHT_MODULE` and `CHROME_PATH` if the installed package/browser are outside normal resolution. Browser modifier combinations are not exhaustive; the automated physics suite covers the specified sizes/modifiers and the existing arena/modifier regression sweeps remain green.
