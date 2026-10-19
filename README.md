# Chaos League

Four physics sports, twelve Chaos Modifiers and six equal-stat teams. Quick Match faces a CPU, Two Player shares one keyboard or touchscreen, and Chaos Cup is an eight-player knockout bracket. First to three points wins each sport round; first to three sport rounds wins the match.

## Run and build

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Node 20.19+ or 22.12+. The static production output is `dist/`. Serve through HTTP. Assets are local SVGs or procedural graphics. No accounts, backend, external asset CDN or images are required.

## Controls

Solo accepts WASD and arrows together. Local P1 moves with A/D, jumps with W, and uses Action with S. Local P2 moves with Left/Right, jumps with Up, and uses Action with Down. Solo Down is an alternative Action input. Touch provides separate Left, Right, Jump, and Action controls with simultaneous pointers. Escape pauses outside browser fullscreen.

Basketball automatically collects a loose ball on actual player contact, without a key press. Ordinary player collisions preserve possession. Press and hold Action while carrying to charge, then release to shoot toward the current opponent basket. Full charge takes 1,050 ms and never fires automatically. A fresh press is required after collecting while already holding Action. The shooter has a 250 ms recatch cooldown. Double Ball has independent ownership with at most one ball per player.

Without a basketball, Action starts a directional slap: 80 ms startup, 250 ms active, 250 ms recovery. Contact with an opponent's held ball releases it with an impulse and makes the holder dizzy for exactly 1,000 ms of game time. Loose-ball blocks deflect without stunning players. A 150 ms pickup grace prevents instant reattachment. Dizzy players retain gravity and collision physics but cannot move intentionally, jump, shoot, or block. Pause suspends the timer.

Soccer Action slides in the input/facing direction for 240 ms with an 850 ms cooldown; actual ball contact receives a stronger directional kick. Volleyball Action grants one extra jump after a normal jump, restored on landing. Knockout Action dashes in the input/facing direction for 240 ms with an 850 ms cooldown, increases physical tackle impact, and allows at most one dash per airtime. CPU uses the same rules.

Physical keyboard state survives phase gates so releases are always consumed. Jump and Action held across a phase gate require release and a fresh press. Movement can remain held. Brief keyboard and touch taps survive until the next physics sample; blur, visibility loss, full exit, and teardown clear state.

## Round and score flow

Sport and map reveal together for 950 ms, then all modifiers for 700 ms. Countdown: 3, 2, 1 for one second each. Fight: 300 ms. Total: 4.95 seconds, down from 9.45 seconds. Presentation uses real time, independent of simulation.

Each sport round starts at 0–0 and ends at three points. A normal point resets players, balls, goal state and the play timer while retaining the same sport, theme and modifiers. Three sport round wins ends the match. The fixed-width top-center scoreboard shows current points with POINTS · FIRST TO 3. Symmetric team corners show total round wins and ticks; a supporting center line summarizes round progress. 2–2 displays ROUND POINT. Draws award nothing and replay the same configuration.

The old slowed fixed-step accumulator sampled body movement at approximately 3–19 Hz. Scored physics now integrates a bounded scaled delta on every render frame, easing from 1.0 to 0.2 over 160 ms. UI animations remain at real-time speed. Score text enters at 100 ms, slams and briefly shakes for 240 ms, holds steady, then exits from 2.4 to 2.7 seconds. A 500 ms diagonal shutter covers the arena swap before the next intro. Reduced motion uses a brief stationary shutter.

Basketball uses SCORE, Soccer GOAL, Volleyball POINT and Knockout KNOCKOUT. Player and CPU copy have separate rotating pools; Two Player names the player. The score accent always follows the scoring team. Results use the arena, outcome typography, a labeled round score, and normal sized Rematch/Main Menu buttons. Keyboard focus uses a two-pixel cyan outline only with `:focus-visible`.

Audio routing is Music/SFX buses → master gain → dynamics compressor → bounded soft peak stage → mute gate → output. Master gain is six times the old level; individual music and SFX sliders and toggles persist independently. Scoring ducks music for its sting. Collisions vary with impact strength. A warmed-up browser offline render measured a 5.94× RMS increase for the same jump cue, with zero output when muted. This is an electrical output measurement, not a claim about perceived loudness on every speaker.

## Environments

All five original environments remain: Underground, Meadow, Mars, Neon City and Reactor, with their original sport-specific map names. Seventeen additions bring the total to 22 themes / 88 sport-theme configurations:

| Theme | Map |
| --- | --- |
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

Theme descriptors provide background/layer colors, ground material, lighting and ambient particle type. Static procedural scene geometry is assembled once per arena, with a small ambient pass. Themes share sport geometry and never add physical effects: Moon has neutral gravity unless a modifier changes it. Recent history excludes the last four themes across sports. Knockout preserves the complete environment above the platform; its chasm begins below the floor, with depth falloff, haze, downward motes and gradual character fading.

## Viewport and equipment

The game uses the entire viewport with no outer website header, stats strip, footer or canvas border. Phaser resizes the canvas to the viewport. A camera fit preserves physics geometry and character proportions. Background and floor overscan fill extra space at other aspect ratios. DOM menus, HUD, bracket and score overlays use device sizes. Touch controls reserve a 70 px rail. Shared primary, secondary, tertiary and icon buttons use 48 px desktop / 44 px compact targets. Pause, settings and help share the same neutral surface, border, radius, type and spacing tokens. The Cup Start/Continue action is centered, with a real secondary Main Menu button. Coarse portrait devices request landscape for gameplay. The bracket and title screen remain usable in portrait.

Rear equipment renders at depth 1, players and balls at 3, foreground equipment at 4, and effects at 10. Hoops use a rear rim/net, board thickness, steel support and a foreground rim/net. Goals use receding rear frames, mesh, near frames and posts. Volleyball splits its net and front tape/post. Theme materials vary with the map.

Basket scoring requires entry from above, radius clearance at the interpolated downward rim crossing, then a lower-plane crossing. Held balls and upward entries cannot score. Each ball owns passage state. Soccer requires the full ball inside the visible goal height. Crossbars and moving openings share dimensions with the art. Player edge stops do not block soccer balls. Front side-view posts are an art layer rather than a solid wall across the goal mouth.

## Chaos Cup

Seven distinct CPU names are drawn from a curated pool around You. The bracket shows four quarterfinals, two semifinals and one final. Each player match is first to three sport rounds; each sport round is first to three points. CPU-vs-CPU matches resolve between rounds. The player path is highlighted, winners animate on advance, and the next matchup gets a 1.2-second entrance before its round reveal. Difficulty rises for later matches. Losing completes the remaining CPU bracket and shows elimination and its champion. Winning three matches triggers the Cup celebration and champion bracket. New Cup creates a new draw.

## Architecture

`PhysicsWorld.ts` owns fixed-step sport simulation, possession, contacts and recovery. `BasketballPossession.ts` defines the discriminated possession states, charge window, cooldown and bounded arcade shot arc. `CupTournament.ts` owns entrant and bracket state. `MatchManager.ts` owns sport bags, point scores and round wins. `PresentationTimeline.ts` owns reveal timing and score time scales. `themes.ts`, `ThemeRenderer.ts`, `ArenaRenderer.ts` and `GoalRenderer.ts` own shared environments and layered equipment. `EntityRenderer.ts` draws original characters, ball skins and possession feedback. `FullscreenControl.ts` owns browser fullscreen state. `HUD.ts` draws device-sized DOM UI. `MatchScene.ts` orchestrates phases. No new runtime dependencies were added.

## Verification and limits

`npm test`: 160 passing tests after the Action overhaul (137-test baseline). The suite covers the separate point/round model, HUD output, modal actions, input, possession/charge/release, opponent basket targeting, cooldowns, contact, Double Ball, CPU behavior, modifiers, presentation timing and audio settings. The simulation sweep includes 1,034 sport/theme/modifier configurations, 200 compatible pairs and twenty complete matches with every point simulated.

The current browser audit uses isolated Playwright Chrome because the MCP browser profile was occupied. Quick Match, Two Player, Cup, Pause and Results were captured and visually reviewed at 1920×1080, 1440×900, 1024×768, 844×390 and 667×375. Real keyboard events exercised short/medium/full basketball shots for both sides and all twelve modifiers. Additional checks cover simultaneous touch controls, pause/resume/restart, Rematch, keyboard focus, fullscreen and the production build. Full normal-clock Quick Match and Two Player journeys use AI-assisted keyboard decisions and real score detectors. Cup entry and controlled bracket advancement are checked separately. `tests/ui-browser-audit.mjs` and `tests/browser-audit.mjs` export the Playwright helpers; they are separate from the Node test count. Detailed evidence, screenshot paths and limits are in `AUDIT.md` and `audit/ui-overhaul/`.

No claim of physical Chromebook performance, native mobile certification, or an audible listening test at normal system volume is made. The source has no added runtime dependencies or raster background downloads.

Current possession/Action behavior, browser checks, complete-match evidence, and reproduction instructions are in [audit/ACTION-SYSTEM.md](audit/ACTION-SYSTEM.md).
