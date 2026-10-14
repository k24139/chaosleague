# Current build audit

## Authoritative source

Started from the existing Site, version 2, source commit `e33e4a76e53107a1bad8d87c429f2fae7abaa4b1`. The checkout was clean. The original ZIP was not used. The completed dark identity, shared logical stage, bus-based audio, focused characters and Knockout void were preserved.

## Baseline browser observations

The browser reached the private Site after secure ChatGPT sign-in. Quick Match, Two Player and the opening Chaos Cup flow were opened. Basketball, Soccer and Knockout reached active gameplay with keyboard actions. Volleyball's intro and net were inspected. Observed modifier sets included Super Bounce + Strong Wind, Giant Players, Low Gravity + Tiny Ball, Double Ball + High Gravity, Super Bounce + Moving Goals, Speed Boost and Strong Wind.

Native key actions exercised A/D/A taps, repeated W, mixed WASD/arrows, D + Left, W + Up, A + Right and W+D+Left+Up. Both local characters jumped in the observed sample. Baseline interactions were limited samples, not a claim that every control sequence or complete match passed. A temporary browser transport disconnection interrupted the audit. The same signed-in tab recovered afterward.

### Issues confirmed by observation or source inspection

- The intro displayed sport, modifier and FIGHT, with no 3-2-1 countdown.
- Soccer goals and hoops were flat rear graphics. Gameplay objects always rendered over their whole graphic.
- Long modifier names wrapped into the objective line in the HUD.
- The menu modes had no coherent sport icon set. Several utility controls used unrelated Unicode shapes.
- Physical keydown was discarded outside live gameplay. Phase-gate changes erased raw held state. This is a verified state-loss path across countdown/score/pause boundaries.
- A complete key tap between physics samples had no retained press, so it was lost before consumption.
- Basketball scored at the rim center line, without accounting for ball radius or requiring passage through a lower plane.
- Soccer tested the ball center against the vertical opening, allowing partial-ball crossbar overlaps to count.
- Score presentation stopped the ball at the score plane, preventing its descent through the net from being shown.
- Sport shuffling used a random sort comparator, which biases the opening sport distribution.
- Fullscreen was rejected by this browser. That error is now announced to assistive technology. Actual browser fullscreen remains platform-dependent.

## Input diagnosis

Physical state now remains independent from the gameplay gate. Keydown and keyup run throughout match phases. Keyup always removes only its physical key. Solo derives one player's controls from the union of both schemes. Local mode reads each scheme independently. Short presses are delivered once if they occur between simulation steps. Blur, hidden-page transitions, full exit and destruction clear state and listeners.

The prior code already had separate Set entries. No shared-direction overwrite was found or observed in the limited two-player sample. The exact trigger of the user's reported post-tap freeze was not isolated in the baseline browser. The phase-loss path and missed taps are repaired and covered by explicit regressions. Final browser samples and their limits are recorded below.

## Timing and score presentation

Sport 500ms, chaos 900ms, 3/2/1 at 550ms each, FIGHT 400ms. Physics cannot consume input until 3450ms. Presentation time is separate from the bounded fixed-step simulation budget. Presentation uses a monotonic wall clock. A long render gap advances to only the next cue boundary, so no countdown numeral gets skipped. Each short key tap waits for its next physics sample instead of expiring against the render clock. Pause suspends the phase timer.

Ordinary scores run 1300ms and match wins 1650ms. Basketball uses SCORE. Solo player and rival lines rotate without consecutive repeats. Local labels name the correct player. Existing effects remain, and scored-ball settling resumes after 95ms hit-stop. Collision callbacks cannot trigger further gameplay effects once the round has a winner.

## Goal architecture

Rear and foreground Graphics objects bracket the entity layer. Geometry constants link visible rims, board dimensions and opening heights to colliders. Front net strands partially cover a ball inside the structure. Basketball tracks above-entry and downward passage with radius clearance, excludes underhand returns and scores each ball once. Soccer opening checks account for the entire radius. Moving structures update collision and rendering together.

## Automated checks

`npm test` covers core scoring, every compatible modifier and arena, 200 paired-modifier simulations, twenty best-of-five simulated matches, input schemes, release independence, phase gates, short taps, blur/visibility, touch cancellation, audio buses, saved state, all countdown cues, score copy, icon consistency, depth ordering and stage fitting.

Exact stage-fit calculations cover 1920×1080, 1440×900, 1280×800, 1024×768, 844×390, 667×375 and 375×667, with and without the touch rail. These are geometry tests, not rendered browser certification.

`npm run build` runs TypeScript and the Vite production bundle. `git diff --check` checks patch whitespace. Production dependencies are unchanged from the prior passing audit.

## Final browser verification

Pending the newly published source. Remaining checks include full match and Cup playthroughs, final tap/release samples, scoring-layer observation, audible balance, touch hardware and exact viewport screenshots. No result is claimed until observed.
