# Hoop scoring verification — October 18, 2026

Current scoring fix and real-shot evidence: [Basketball hoop scoring](audit/HOOP-SCORING.md).

# Action system verification — October 18, 2026

Current results and evidence: [Basketball possession and sport Actions](audit/ACTION-SYSTEM.md). The earlier audits below are historical.

# UI and basketball overhaul — October 14, 2026

This pass builds on the existing uncommitted `gameplay-polish` checkout. The prior presentation audit below is retained as historical evidence. No runtime dependencies were added.

## Shared interface system

`src/style.css` now has explicit TOKENS, BASE, TYPOGRAPHY, BUTTONS, MENU, HUD, PRESENTATION, MODALS, CUP, RESULTS, TOUCH, MOTION and RESPONSIVE sections. Superseded HUD, button and modal rules were removed. Standalone SVGs and the favicon use resolved palette colors because external SVG images cannot inherit page custom properties. Interface raw color values occur only in the token declarations; procedural renderer colors remain contextual to the arena, team or ball skin. `src/config/theme.ts` mirrors the shared canvas palette. Its existing violet is retained for sport/environment art, outside the interface palette.

| Role | Token / value |
| --- | --- |
| Backgrounds | `--cl-void #050608`, `--cl-bg #080B10` |
| Surfaces | `--cl-surface-1 #0E131A`, `--cl-surface-2 #151B24`, `--cl-surface-3 #1D2531` |
| Borders | `--cl-border-subtle #222B36`, `--cl-border #303B49`, `--cl-border-strong #465466` |
| Text | `--cl-text #F5F7FA`, `--cl-text-muted #A0A9B6`, `--cl-text-dim #737D8B` |
| Primary | `--cl-acid #B9FF2D`, hover `#C8FF55`, active `#A4E927`, text `#080B10` |
| Focus / secondary selection | `--cl-cyan #29D9FF` |
| Status | danger `#FF405A`, warning `#FFC247`, success `#64E572` |

Typography roles: display XL (54–112 px), display L (34–64 px), score (36–58 px), heading (24–36 px), body (15–18 px), meta (12–15 px), micro (11 px). The existing Impact/Arial Narrow display stack remains. Spacing uses 4/8/12/16/24/32/48/64 px tokens. Radii use 4/8/12 px. Buttons share geometry and default/hover/active/focus-visible/disabled states across primary, secondary, tertiary and icon roles: 48 px desktop and 44 px compact/touch minimums. Motion uses 160/220/400 ms roles; the established score/intro/wipe timelines remain.

Quick Match and Two Player use one symmetric HUD architecture: fixed-width point numerals at the viewport center, an explicit POINTS · FIRST TO 3 label, and a supporting round summary. Each corner contains a player identity, team name, round-win numeral and three progress marks. Team names truncate locally without moving the score. Sport, map and compact modifiers form one edge stack. Audio/fullscreen/pause use matching SVG controls. The main page owns 100dvw/100dvh with safe-area offsets.

Cup Start/Continue sits on the viewport centerline, with a real secondary Main Menu button and opponent context. The bracket retains its player path. Landscape utility placement was corrected after screenshot review. Pause uses the same surface/border/radius/type system as native Help and Settings, a maximum 520 px width and compact landscape spacing. Results keeps the arena backdrop, bounded outcome typography, the final round score and shared Rematch/Main Menu controls.

Keyboard focus is a 2 px cyan outline through `:focus-visible`. Existing Tab/Shift+Tab modal flows remain. Pause/results make background HUD, touch and utility controls inert; results hides gameplay controls. Returning to the menu restores focus to Quick Match. Native Help/Settings keep Escape and backdrop dismissal. Reduced motion remains supported. Menus and overlays retain semantic buttons and icon labels.

[Watermelon button](https://ui.watermelon.sh/components/button) and [dialog](https://ui.watermelon.sh/components/dialog) reference pages were opened and captured in Chrome. Their compact control proportions, restrained separation, consistent spacing and clear action hierarchy informed the original game controls. No framework or branding was imported.

## Basketball behavior

`BasketballPossession.ts` defines the authoritative discriminated states: free, held, charging, released (with owner cooldown). `Ball.holder` is derived from this state, so ownership and charge cannot diverge through independent booleans. Press/hold near a loose ball catches and charges; release shoots. Charging saturates at 1,050 ms and does not auto-release. A team-colored arc around the held ball fills with charge.

The anchor follows the player's attacking hand and accounts for ball radius and player scale. Facing changes do not swap hands. Held balls are collision-filtered and synchronized after physics. The opponent basket's current geometry supplies shot direction; charge adjusts a bounded upward arcade arc, with small secondary momentum/jump influence. Longer shots need more charge. Release snapshots charge, clears ownership, restores collision filtering, positions the ball at the hand, launches it and applies a 250 ms cooldown to the releasing player. The opponent remains eligible to catch. Incidental body contact preserves possession; relative contact speed of at least 4.5 can dislodge it. A nearby opponent action can also contest the ball.

One ball per player is enforced. Double Ball has independent states. Ball/player recovery, scoring and world disposal clear ownership and charge. CPU prioritizes its own possession, then loose balls, then contests an opposing holder, moves into shooting range and uses the same charge/release mechanics. Basketball action no longer bypasses possession with the old automatic ballistic strike. Soccer, Volleyball and Knockout retain their existing action systems.

## Verification

- Baseline: **108/108 Node tests**, production build passed before edits.
- Current Node suite: **137/137**; new coverage includes live points vs round wins, action labels, modal gating, all twelve basketball modifiers, bounded charge, hold/release transitions, independent Double Ball, catch range/speed, both shooting directions, running home, Moving Goals, cooldown, strong/minor contact, CPU release and pursuit priorities, directly-under-hoop aim, jump/carry stability, and scoring/reset cleanup. The final sweep scored 974/1,034 sport/theme/modifier plays within 45 seconds and 188/200 compatible pairs; all twenty simulated complete matches passed. The old three-second expiry expectation was replaced by a capped-charge/no-auto-release regression.
- Playwright MCP was attempted twice but its browser profile was occupied. All current browser QA used an isolated Playwright-controlled Chrome instance. Baseline Quick Match, Two Player, Cup, Pause, Results and mobile screens were captured before source edits.
- All five requested final screen types were captured at **1920×1080, 1440×900, 1024×768, 844×390 and 667×375**. Screens were visually reviewed in five contact sheets and selected full-size images. Browser assertions checked viewport centering, symmetric corner heights, long names, scores 0–3, bounds, minimum control heights, Cup action centering, bracket/footer separation, pause freeze, Resume/Restart/Main Menu, keyboard navigation, Rematch, and Cup Enter/Space activation.
- Twenty controlled basketball keyboard cases exercised P1/P2 short (~50 ms), medium (~500 ms), full (~1,250 ms) charge; both players running toward home; and every modifier. All controlled releases pointed horizontally toward the opponent basket. Extra cases exercised scoring while a second ball was held, cleanup on the next play, CPU pursuit of a human holder, a jumping charge, immediate recatch rejection, pause while charging/release during pause/resume, strong contact, eight rapid cycles and independent Double Ball local input. These use controlled ball placement followed by real keyboard events, not spontaneous catches during a complete unassisted match.
- A 667×375 touch-enabled browser used simultaneous DevTools touch points: both players caught and charged separate balls, releasing P1 retained P2 possession, and both shots went toward the opponent. Simultaneous movement changed P1 x=308→403 and P2 x=812→717. Touch pause/resume and Cup Main Menu passed. An initial audit failure came from sending a touchEnd event with remaining points; the protocol-correct touchMove sequence passed without a game-code change.
- Default, hover, pressed, focus-visible and disabled button states passed browser checks. Real fullscreen enter and exit passed. Help and Settings were checked at a 720×450 CSS viewport under reduced motion, corresponding to the available layout space of a 1440×900 display at 200% zoom; actual browser chrome zoom was not changed.
- Final normal-clock journeys completed with real keyboard events and AI-assisted decisions: Quick Match 1–3 in 201.9 seconds; Two Player 3–2 in 257.2 seconds. Both exercised all four sports, point resets, round transitions and results. No score or body positions were injected in these matches. Rematch, keyboard movement, pause/resume and Main Menu were exercised after each result. Cup entry used real controls; bracket continuation was then checked with a controlled tournament win. Logs: `played-quick.json`, `played-two.json`, `match_quick-errors.json`, `match_two-errors.json`; screenshots: `played-quick-results.png`, `played-two-results.png`, `cup-advanced.png`, all under `audit/ui-overhaul/`.
- Final `npm run build` passed TypeScript and Vite. `git diff --check` passed. The application chunk is 87.21 kB / 29.32 kB gzip; unchanged Phaser and Matter remain separate. The production preview passed keyboard gameplay, pause/resume and return to menu, with no development audit accessor.
- No uncaught exceptions, console errors or warning spam occurred in the controlled UI, basketball or touch audits. JSON evidence: `audit/ui-overhaul/browser-results.json` and `extra-results.json`.

## Screenshot paths

`audit/ui-overhaul/{quick,two,cup,pause,results}-{1920,1440,1024,844,667}.png` contains the 25 viewport captures. Review sheets are `review-{width}.png`. Additional images: `basketball-charge.png`, `touch-charge-667.png`, `touch-pause-667.png`, `touch-cup-667.png`, `how-dialog-720.png`, `settings-dialog-720.png`. Baseline and reference captures use `before-*.png` and `watermelon*.png`. Screenshots are local, ignored artifacts.

## Files changed in this pass

`.gitignore`, `index.html`, `README.md`, `AUDIT.md`; `src/config/game.ts`, `src/config/theme.ts`; `src/entities/Ball.ts`; `src/main.ts`, `src/scenes/MatchScene.ts`, `src/style.css`; `src/systems/AIController.ts`, `PhysicsWorld.ts`, new `BasketballPossession.ts`; `src/ui/EntityRenderer.ts`, `HUD.ts`; `tests/possession.test.ts`, the SVG palette expectation in `tests/presentation.test.ts`, new `hud.test.ts`, new `ui-browser-audit.mjs`, an optional URL/progress callback in `browser-audit.mjs`; and palette updates in `public/favicon.svg` and `public/icons/*.svg`. Existing changes outside this list were retained.

## Limits

No remaining UI alignment or interaction defect was observed in the exercised target viewports. Physical mobile hardware, native browser zoom at 200%, perceived audio balance and Chromebook performance remain unverified. Controlled modifier cases validate state, direction and input behavior, not guaranteed scoring at every charge/location. Full Cup completion is outside the manual run; entry and controlled bracket advancement are checked separately. Existing draw/timeout behavior remains when physics does not produce a score.

---

# Chaos League gameplay presentation audit — October 14, 2026

Implemented directly in the existing checkout. Phaser/Matter, sport detectors, character art, input handling, Cup bracket, equipment layering and all five original themes remain. No runtime dependencies were added.

## Changes and causes

The old score accumulator added `renderDelta * timeScale`, then waited for a complete 16.67 ms physics step. With scales of .18, .32 and .045, bodies visibly moved at roughly 11, 19 and 3 Hz. Rendering itself was not deliberately throttled; missing interpolation made the motion look like low FPS.

Scored Matter simulation now advances on every render using a scaled delta. A smoothstep ease changes 1.0 to .2 over 160 ms. Deltas are capped at 50 ms and split into steps no larger than 16.67 ms. DOM animation, Phaser effects and the presentation clock keep real time. Point resets create fresh play state and clear the accumulator, avoiding a restoration spike. Live gameplay retains its working fixed-step input/physics system.

The old pre-round sequence was 9.45 seconds. The new sequence is 4.95 seconds: combined sport/map 950 ms; all modifiers 700 ms; 3, 2 and 1 at 1,000 ms each; FIGHT 300 ms. The combined text reveals together without card shells. Browser measurements on the final flow gave countdown intervals of about 1,007, 992 and 1,000 ms. Visibility loss and explicit pause still suspend play.

Each point now lasts 2.7 seconds: smooth slowdown begins immediately; the sport word enters at 100 ms; a 240 ms slam/short shake settles into readable copy; exit runs from 2.4 to 2.7 seconds. Team color follows the scorer, including the CPU. Separate rotating player/CPU pools and explicit local-player copy remain. Basketball uses SCORE!, Soccer GOAL!, Volleyball POINT!, Knockout KNOCKOUT!.

A 500 ms diagonal shutter enters after a round-winning score. The next arena is built at its covered midpoint, then the shutter exits and the combined intro begins. A long frame gap cannot bypass the covered midpoint. Reduced motion uses a short stationary shutter.

`MatchManager` now owns separate point scores and round wins. Three points wins a sport round; three sport rounds wins a match. Normal points recreate players, balls, goal passage state and play timer in the same sport/theme/modifier configuration. Round wins alone select the next configuration. Duplicate scoring after a completed round is ignored. At 2–2, ROUND POINT appears near the scoreboard. Edge numerals show points; the smaller labeled Rounds line and short ticks show match progress.

Knockout's old opaque chasm began at y=320, above its y=530 platform. The chasm now starts beneath the floor. The full environment remains visible above the platform, including the sides. Near-black depth bands, themed haze, downward motes and faint distant light fill the space below. The existing gradual falling-character fade remains.

## Environments

Theme descriptors and `ThemeRenderer` separate environments from sport geometry. Static scene graphics are assembled once per arena, with limited ambient elements during play. Ground materials distinguish sand, snow, metal and stone. Environment choice does not change gravity or friction. The last four themes are excluded across sports, rather than just remembering the last map for each individual sport.

| Theme | New map / preserved variants |
| --- | --- |
| Underground | Underground Court / Pitch / Shaft |
| Meadow | Meadow Arena / Field / Court / Ruins |
| Mars | Mars Dome / Pitch / Court / Chasm |
| Neon City | Neon Rooftop / Stadium / Roof Court / Skybridge |
| Reactor | Reactor Gym / Yard / Court / Core |
| Desert | Dust Basin |
| Snow | Whiteout Court |
| Forest | Timberline |
| Mountain | Summit Arena |
| Beach | Breakwater |
| Neighborhood | Backyard League |
| Underwater | Abyss Dome |
| Atmosphere / Sky | Cloudline |
| Moon | Lunar Yard |
| Sun | Helios Array |
| Dystopia | Sector Zero |
| Storm | Storm Drain |
| Volcano | Cinder Ridge |
| Ancient Ruins | Old Quarry |
| Cyber City | Circuit District |
| Arctic Station | Polar Outpost |
| Orbital Station | Dock Nine |

The 22 themes produce 88 sport/theme configurations. Distinct landmarks include layered dunes and dry scrub, snowy pines, forest trunks and light shafts, cable-car mountains, beach water and palms, neighborhood houses/fences/lights, underwater glazing and moving marine silhouettes, floating structures, Earth over lunar habitats, solar shielding and flares, ruined towers and scanning searchlights, storm pylons, a lava ridge, stone columns, a city transit span, polar communications equipment and an orbital docking window.

## Audio and controls

Music and SFX have separate gain buses, toggles and persisted volume sliders. They feed sixfold master gain, a dynamics compressor (−10 dB threshold, 12:1 ratio, 3 ms attack), a bounded tanh peak safety stage with 4× oversampling, and a final mute gate. Source oscillator amplitudes were not all multiplied by six. Scoring briefly ducks the music, and collision pitch/level varies with impact strength.

A warmed-up browser `OfflineAudioContext` render of the same jump cue measured RMS .002990 at baseline gain versus .017766 at raised gain: 5.94×. The raised peak was .2763, below digital full scale. A separate goal render peaked at .3909. Master mute measured RMS 0 and peak 0. These are output-signal measurements, not a physical speaker loudness or listening certification.

Results use the arena with a dark overlay, a dominant outcome, labeled round score, team outcome and normal sized Rematch/Main Menu buttons. The live HUD is hidden during results. The giant arrow and stretched green CTA are gone. Primary, secondary and compact icon controls share hover, active, focus-visible and disabled states. Keyboard focus is a two-pixel white outline. Unnecessary menu stars, arena sales copy and the center arena banner/card were removed.

## Validation performed

- Initial production build and 102-test baseline passed before source edits. Playwright MCP opened Quick Match, Two Player and Cup; keyboard movement, simultaneous local movement, Cup entry and a CPU score were observed before implementation.
- Two complete normal-clock browser matches used actual keyboard events and real sport scoring detectors. Keyboard decisions were AI-assisted. Quick Match ended 1–3 in rounds, after Basketball, Soccer, Knockout and Volleyball. Two Player also ended 1–3 after all four sports. These were not score-injected matches. Event logs are `audit/quick-match.json` and `audit/two-player-match.json`; the logs omit some points scored between audit segments.
- Controlled browser regressions separately positioned Knockout bodies beyond the fall boundary, exercising real point detection at 1–0, 1–1, 2–1, 2–2 and 3–2. Normal points preserved sport/map, scoring exited, the next-point cue appeared, the wipe activated/exited and the next arena reset to 0–0 with one round win.
- Cup entry and keyboard play were inspected. Controlled scoring exercised advancement to the semifinal with reset match scores, and elimination produced a CPU champion and New Cup action. A diagnostic loop timed out because the bracket had already advanced before its next live-state wait; the resulting stage/reset state was inspected. A full three-match Cup was not played manually.
- All 22 themes were rendered, moved through briefly, captured and visually inspected at 1920×1080, 1440×900, 1280×800, 1024×768, 844×390 and 667×375. Contact sheets are `audit/themes-{width}.png`. These are short controlled play samples, not 132 complete rounds.
- Browser bounds checks cover the combined intro, modifiers, all countdown numerals, FIGHT, scoring title, results and both results controls at all six sizes. Results screenshots are `audit/results-{width}.png`. Rematch and Main Menu were clicked, and Tab moved keyboard focus between results actions.
- A touch-enabled 667×375 browser context sent simultaneous touch points through the real controls. P1 moved from x=310 to 533; P2 moved from x=810 to 587. Pause/resume also passed. Screenshots are `audit/touch-667.png` and `audit/pause-667.png`. This is browser touch emulation, not physical mobile hardware.
- A score sample recorded 217 browser animation frames over 1.8 seconds, with 8.3 ms median and 9.8 ms 95th-percentile interval. This is evidence from this machine's approximately 120 Hz browser, not a Chromebook benchmark.
- Audio signal tests, settings persistence, channel/master gating and cue signatures passed. The production settings UI also persisted Master .4 / Music .3 / SFX .8 and master mute across reload; the original device preferences were restored afterward. No audible listening test at normal physical system volume was possible through the browser tools.
- The production preview was opened through Playwright, including combined intro, live controls and pause/resume. The dev-only audit accessor was absent. Console checks returned zero errors.
- Final `npm test`: 108 passed. The sweep scored 1,007/1,034 theme/modifier plays within 45 seconds, plus 196/200 compatible modifier pairs. Twenty complete simulated matches now simulate every individual point, requiring at least nine scored plays per match.
- Final `npm run build`: TypeScript and Vite production build passed. `git diff --check` passed. The game application chunk is 85.10 kB / 28.67 kB gzip; Phaser and Matter chunks remain unchanged. No large raster environments were introduced.

## Files changed

- `.gitignore`, `index.html`, `README.md`, `AUDIT.md`.
- `src/config/game.ts`, `src/config/maps.ts`, new `src/config/themes.ts`.
- `src/main.ts`, `src/scenes/MatchScene.ts`, `src/style.css`.
- `src/systems/AudioManager.ts`, `MatchManager.ts`, `PhysicsWorld.ts`, `PresentationTimeline.ts`.
- `src/ui/ArenaRenderer.ts`, `GoalRenderer.ts`, `HUD.ts`, new `ThemeRenderer.ts`.
- `tests/core.test.ts`, `flow.test.ts`, `maps.test.ts`, `presentation.test.ts`, `settings.test.ts`; new `rounds.test.ts` and `browser-audit.mjs`.
- `audit/quick-match.json` and `audit/two-player-match.json`. Local audit screenshots are ignored by Git.

The new regressions cover first-to-three scoring, 2–2, point/round reset boundaries, continuous scored movement, intro ordering and countdown duration, scoring entry/exit, wipe entry/exit, theme history, neutral theme physics, channel/master mute and persisted settings. `browser-audit.mjs` contains separately executed Playwright helpers; it is not part of the Node test count.

## Remaining limits

No known new gameplay-blocking defect remained in the exercised scenarios. Some existing AI/modifier combinations still reach the 45-second draw path; the new flow retains points and replays that sport configuration. Physical Chromebook performance, native-device touch behavior, a full manual Cup and perceived audio balance at normal speaker volume remain unverified. Rare frame stalls can stretch a score or wipe slightly to ensure its state receives a rendered frame.
