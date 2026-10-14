# Chaos League

Four physics sports, twelve Chaos Modifiers and six equal-stat teams. Quick Match faces a CPU, Two Player shares one keyboard or touchscreen, and Chaos Cup is an eight-player knockout bracket. First to three points wins each match.

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

Solo accepts WASD and arrows at the same time. Local P1 uses A/D/W, and local P2 uses Left/Right/Up. Opposing horizontal directions resolve as neutral. Action jumps and interacts with a nearby ball. Release between new actions. Escape pauses outside browser fullscreen. Browser Escape exits fullscreen. The fullscreen button updates its glyph, title, accessible label and pressed state on every fullscreenchange event.

Basketball: hold action near a loose ball to catch. The ball follows the hands as the player moves and jumps. Release action to shoot toward the facing basket. Momentum influences the shot. Body collisions and opponent action can dislodge it. A 450 ms grab cooldown prevents instant recapture. Each player carries one ball, including Double Ball rounds. A possession ring shows the three-second limit, then the ball releases. Soccer retains foot/body control. Volleyball cannot hold balls.

Physical keyboard state is tracked across countdowns, scores and pauses. These phases only gate logical consumption. Keyup always removes its own key. Short keyboard and touch taps remain buffered until the next physics sample. Blur, visibility loss, full exit and teardown clear state. The source defects found in earlier versions were gated keydowns, phase resets and taps expiring before a physics sample. The precise reported tap failure and Two Player freeze were not reproduced in normal-speed manual play.

## Round and score flow

Sport reveal: 2 seconds. Map reveal: 2 seconds. Modifier reveal: 2 seconds. Countdown: 3, 2, 1 for one second each. Fight: 450 ms. Total: 9.45 seconds. Each cue has its own animation and audio. Large frame gaps never skip a cue. Physics and player motion remain stopped until Fight ends.

After scoring, controlled fixed-step physics runs at 18% speed for 220 ms. The text slam, short shake, team-color highlight, sting, camera response and particles start together. Physics runs at 32% through 1.25 seconds, then 4.5% for the rest of the event. Scoring stays locked. The score copy remains visible for three seconds after its impact, for a 3.22-second event. The ball continues through the hoop or goal. Draws award no point and restart with a new sport.

Sport terms are Score, Goal, Point and Knockout. Player and CPU lines use separate rotating pools with no consecutive repeats. Local multiplayer uses Player 1 and Player 2 text. Master mute silences Music and SFX and preserves their individual settings. Original 140 BPM percussion and minor-key bass remain. Settings persist on the device.

## Maps

| Sport | Underground | Meadow | Mars | Neon City | Reactor |
| --- | --- | --- | --- | --- | --- |
| Basketball | Underground Court | Meadow Arena | Mars Dome | Neon Rooftop | Reactor Gym |
| Soccer | Underground Pitch | Meadow Field | Mars Pitch | Neon Stadium | Reactor Yard |
| Volleyball | Underground Court | Meadow Court | Mars Court | Neon Roof Court | Reactor Court |
| Knockout | Underground Shaft | Meadow Ruins | Mars Chasm | Neon Skybridge | Reactor Core |

Five playable themes per sport, twenty sport/map variants. Themes share a reusable universe but have different structures, materials, lighting, props, floor treatment and ambient motion. Underground has tunnels, pipes and vents. Meadow has hills, trees and turf. Mars has ridges, habitats and station windows. Neon City has towers, signage, roof surfaces and rain. Reactor has turbines, feed pipes, warning marks and pulse strips. Knockout keeps the endless drop in every theme. Backgrounds are built once per round, with a limited ambient pass. Map rotation avoids immediate repeats for each sport. Base gravity and friction stay neutral. Chaos Modifiers own physical rule changes.

## Viewport and equipment

The game uses the entire viewport with no outer website header, stats strip, footer or canvas border. Phaser resizes the canvas to the viewport. A camera fit preserves physics geometry and character proportions. Background and floor overscan fill extra space at other aspect ratios. DOM menus, HUD, bracket and score overlays use device sizes. Touch controls reserve a 70 px rail. Buttons use clamp sizing and at least 44 px touch targets. Coarse portrait devices request landscape for gameplay. The bracket and title screen remain usable in portrait.

Rear equipment renders at depth 1, players and balls at 3, foreground equipment at 4, and effects at 10. Hoops use a rear rim/net, board thickness, steel support and a foreground rim/net. Goals use receding rear frames, mesh, near frames and posts. Volleyball splits its net and front tape/post. Theme materials vary with the map.

Basket scoring requires entry from above, radius clearance at the interpolated downward rim crossing, then a lower-plane crossing. Held balls and upward entries cannot score. Each ball owns passage state. Soccer requires the full ball inside the visible goal height. Crossbars and moving openings share dimensions with the art. Player edge stops do not block soccer balls. Front side-view posts are an art layer rather than a solid wall across the goal mouth.

## Chaos Cup

Seven distinct CPU names are drawn from a curated pool around You. The bracket shows four quarterfinals, two semifinals and one final. Each player match is first to three points. CPU-vs-CPU matches resolve between rounds. The player path is highlighted, winners animate on advance, and the next matchup gets a 1.2-second entrance before its round reveal. Difficulty rises for later matches. Losing completes the remaining CPU bracket and shows elimination and its champion. Winning three matches triggers the Cup celebration and champion bracket. New Cup creates a new draw.

## Architecture

`PhysicsWorld.ts` owns fixed-step sport simulation, possession, contacts and recovery. `CupTournament.ts` owns entrant and bracket state. `MatchManager.ts` owns sport bags and match scores. `PresentationTimeline.ts` owns reveal timing and score time scales. `ArenaRenderer.ts` and `GoalRenderer.ts` draw environments and layered equipment. `EntityRenderer.ts` draws original characters, ball skins and possession feedback. `FullscreenControl.ts` owns browser fullscreen state. `HUD.ts` draws device-sized DOM UI. `MatchScene.ts` orchestrates phases. No new runtime dependencies were added.

## Verification and limits

Automated checks cover all sport scoring, tap/hold/phase transitions, local simultaneous inputs, touch cancellation, possession across ball/player sizes, contested balls, Cup win/loss paths, every map, every compatible modifier pair, reveal intervals, slowdown factors, fullscreen state, SVG consistency, mute and settings. The seeded sweep covers 235 arena/modifier rounds, 200 modifier pairs and twenty complete matches. Viewport geometry checks cover 1920×1080, 1440×900, 1280×800, 1024×768, 844×390, 667×375 and portrait 375×667. Geometry checks do not replace rendered layout inspection.

Manual browser results and hardware limits are reported with delivery. No claim of measured 60 FPS on a Chromebook, native mobile touch certification, Lighthouse success or audible sound balance is made without those checks.
