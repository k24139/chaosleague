# Basketball possession and sport Actions — October 18, 2026

## Root cause and baseline

Before changes, `npm test` passed 137 tests and `npm run build` passed. Those tests encoded the broken behavior: InputManager mapped W/Up to a shared Action, Player.move used Action to jump, and PhysicsWorld only attempted basketball collection while Action was held. Ordinary ball collisions instead called strike(), pushing the ball away. Pickup measured distance from the player's center using a circular approximation despite the tall, chamfered rectangle body. Fast player-to-player collisions forcibly released held basketballs.

## Final behavior

- **Pickup:** Matter collisionStart and collisionActive contacts collect eligible loose basketballs automatically. There is no input gate or velocity threshold. Persistent contacts are reconsidered after cooldowns. Ball order and player side order resolve simultaneous contacts deterministically. Direct possession helpers measure the actual player polygon with a 3 px tolerance. There is no magnetic collection radius.
- **Possession:** The existing BasketballPossession discriminated state remains authoritative for each Ball. Held balls disable collisions and follow their holder's stable attacking-side hand after physics. Body collisions never release or transfer ownership. Double Ball remains independent; each player holds at most one ball.
- **Shooting:** A fresh Action press while holding starts charging. Full charge is 1,050 ms; only release shoots, once, toward the opponent's current hoop. Moving Goals use current rim geometry. The shooter cannot recatch for 250 ms. Collecting while Action is already held requires release and another press.
- **Block:** Action without possession starts an 80 ms startup, 250 ms active window, and 250 ms recovery. The directional hand region can slap an opponent's held ball or deflect a free ball. Each activation hits each ball at most once. A slap clears ownership/charge, restores ball collisions, applies a visible impulse, and prevents all pickups for 150 ms.
- **Dizzy:** A blocked holder loses intentional movement, jumping, shooting, and blocking for exactly 1,000 ms of simulation time. Gravity and collisions continue. CPU is subject to the same gate. Pause preserves the timer; reset/disposal clear it. Local stars, wobble, impact feedback, and distinct block/stun sounds communicate the state. Free-ball deflection never stuns a nearby player.
- **Soccer:** Action slides horizontally in input/facing direction for 240 ms; real ball contact gets a stronger directional kick once per slide. Cooldown is 850 ms. The stance visibly lowers; no possession is introduced.
- **Volleyball:** After a normal jump, a fresh airborne Action gives one additional jump. Landing restores availability; holding Action cannot repeat it. Horizontal control remains available, with an air-burst cue and sound.
- **Knockout:** Action dashes horizontally in input/facing direction for 240 ms with an 850 ms cooldown. Actual opponent collision gets increased tackle momentum. At most one air dash is permitted per airtime. Platform/fall scoring is unchanged.
- **CPU:** Collects through contact, pursues loose balls, charges/releases opponent-targeted shots, and approaches holders to attempt timed blocks. It uses the same sport Actions, cooldowns, stun gates, and physics.
- **Controls:** P1 A/D movement, W jump, S Action; P2 Left/Right movement, Up jump, Down Action. Solo accepts both schemes. Touch has separate Left/Right/Jump/Action controls and independent pointers. Jump/Action held across a phase gate require physical release and a fresh press. Movement may remain held.

## Files changed

Gameplay: `src/config/game.ts`, `src/entities/Player.ts`, `src/systems/InputManager.ts`, `BasketballPossession.ts`, `PhysicsWorld.ts`, and `AIController.ts`.

Feedback/help: `src/scenes/MatchScene.ts`, `src/systems/AudioManager.ts`, `src/ui/EntityRenderer.ts`, `index.html`, and `README.md`. Existing palette, fonts, arena geometry, scoring detectors, modifiers, and layouts are retained.

Tests: `tests/actions.test.ts`, updated `input.test.ts`, `possession.test.ts`, `core.test.ts`, and the keyboard driver in `browser-audit.mjs`. New browser audits are `action-browser-audit.mjs`, `match-action-browser-audit.mjs`, and `run-action-browser-audit.mjs`.

## Automated verification

- `npm test`: **160 passed, 0 failed** (137 baseline).
- `npm run build`: passed, including TypeScript checks.
- `git diff --check`: passed.
- Existing sport/theme/modifier sweeps, compatible-pair sweeps, scoring tests, and twenty simulated complete matches remain green.
- New tests exercise automatic running/jumping/falling/fast contact pickup for both sides, protected possession, fresh input edges, block startup/cooldown/single-hit behavior, impulse, exact dizzy duration, CPU stun, slide contact, double jump, dash tackle, and airtime limits.

## Actual browser verification

Playwright used real keyboard events and Chrome DevTools native multi-touch events. Controlled scenarios repositioned bodies to set up contacts; they did not assign ownership or scores. Tests then used the running scene's input, Matter physics, and possession/scoring paths.

Passed checks include P1 pickup using only D, P2 pickup using only Left, CPU pickup, ordinary collisions against human and CPU holders, both sides' charge/release direction, W/Up jumping without charging, maximum charge without autofire, Moving Goals with Double Ball, human and CPU blocks, in-flight deflection without stun, pause-preserved dizzy duration and recovery, all three other sport Actions, Cup entry/live Action, all four Actions in a Cup context, and native touch movement plus Action/hold/release shooting.

Responsive checks passed at **1920×1080, 1440×900, 1024×768, 844×390, and 667×375**, including a touch-enabled browser. The mobile screenshot was inspected.

Complete matches used AI-assisted Playwright keyboard decisions and the real scoring system, with no injected scores or points. Browser time was advanced through rendered frames to shorten waits; physics, inputs, score presentations, resets, sport transitions, and results still ran normally.

| Mode | Final round wins | Real scored points | Sports exercised |
| --- | --- | --- | --- |
| Quick Match | 2–3 | 19 | Soccer, Basketball, Knockout, Volleyball |
| Two Player | 1–3 | 18 | Volleyball, Basketball, Soccer, Knockout |

Rematch returned to the new match intro. Evidence is saved in [action-browser-results.json](action-browser-results.json) and [action-match-results.json](action-match-results.json). Generated screenshots are `audit/actions-mobile.png` and `audit/action-match-results.png` (ignored by Git).

The MCP browser completed the initial focused checks. Its clock control later stalled during full-match acceleration, so complete matches and final focused verification used an isolated Chrome profile.

To reproduce, start Vite on port 5174. With Playwright available:
```sh
node tests/run-action-browser-audit.mjs
# Run only the controlled gameplay/touch/responsive checks:
node tests/run-action-browser-audit.mjs --focused
```
If Playwright or Chrome is outside normal resolution, set `PLAYWRIGHT_MODULE` to its installed module and `CHROME_PATH` to the browser executable.

## Limits

No known failing acceptance behavior remains in these checks. A complete three-stage Cup tournament was not played end to end in this pass; Cup entry and every sport Action were checked in a live Cup context, with existing bracket unit coverage retained. Physical mobile hardware was not used. Every compatible modifier was covered by automated physics sweeps; browser play did not exhaustively repeat every Action under every modifier combination.
