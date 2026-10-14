import test from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { PhysicsWorld } from '../src/systems/PhysicsWorld';
import { AIController } from '../src/systems/AIController';
import { MatchManager } from '../src/systems/MatchManager';
import { MODIFIERS, compatible, selectModifiers, makeRules } from '../src/systems/ModifierManager';
import { SPORTS, EMPTY_INPUT, FLOOR, ARENAS, type SportId } from '../src/config/game';
function seeded(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function simulate(sport: SportId, mods: string[], arena = 0, seed = 42) { const random = seeded(seed), w = new PhysicsWorld(sport, mods, arena), a = new AIController(2, 0, random), b = new AIController(1, 1, random); let winner = null; for (let frame = 0; frame < 2700; frame++) {
    winner = w.step([a.update(w), b.update(w)]);
    if (frame % 120 === 0)
        for (const body of [...w.players.map(p => p.body), ...w.balls.map(b => b.body)])
            assert.ok(Number.isFinite(body.position.x) && Number.isFinite(body.position.y) && Math.abs(body.velocity.x) < 50, 'Physics stays finite and bounded');
    w.events = [];
    if (winner !== null)
        break;
} const result = { winner, elapsed: w.elapsed, recoveries: w.recoveryCount }; w.destroy(); return result; }
test('basketball requires a full downward passage and rejects upward or outside shots', () => {
    const w = new PhysicsWorld('basketball', []), b = w.balls[0];
    const sample = (x: number, y: number, px: number, py: number, vy = 2) => {
        Matter.Body.setPosition(b.body, { x, y }); b.previous = { x: px, y: py };
        Matter.Body.setVelocity(b.body, { x: 0, y: vy }); return w.sport.check(w);
    };
    assert.equal(sample(1026, 300, 1026, 320, -2), null);
    assert.equal(sample(1026, 330, 1026, 300), null, 'underhand entry remains blocked');
    assert.equal(sample(800, 260, 800, 270), null, 'leaving clears the passage');
    assert.equal(sample(1026, 285, 1026, 275), null);
    assert.equal(sample(1026, 316, 1026, 285), null, 'rim crossing alone does not score');
    assert.equal(sample(1026, 330, 1026, 316), 0);
    assert.equal(sample(1026, 340, 1026, 330), null, 'the same ball scores once'); w.destroy();
    const outside = new PhysicsWorld('basketball', []), ball = outside.balls[0];
    Matter.Body.setPosition(ball.body, { x: 1068, y: 330 }); ball.previous = { x: 1068, y: 275 };
    Matter.Body.setVelocity(ball.body, { x: 0, y: 2 }); assert.equal(outside.sport.check(outside), null); outside.destroy();
});
test('soccer goal windows reject shots above the crossbar', () => { const w = new PhysicsWorld('soccer', []), b = w.balls[0]; Matter.Body.setPosition(b.body, { x: 1100, y: 350 }); assert.equal(w.sport.check(w), null); Matter.Body.setPosition(b.body, { x: 1100, y: 490 }); assert.equal(w.sport.check(w), 0); Matter.Body.setPosition(b.body, { x: 20, y: 490 }); assert.equal(w.sport.check(w), 1); w.destroy(); });
test('moving goals move the actual wall opening with the visible net', () => { const w = new PhysicsWorld('soccer', ['moving-goals']); for (let i = 0; i < 180; i++)
    w.step([EMPTY_INPUT, EMPTY_INPUT]); assert.ok(Math.abs(w.hoops[0].bounds.max.y - (w.goalY - 58)) < .1); assert.ok(Math.abs(w.hoops[1].bounds.min.y - (w.goalY + 58)) < .1); w.destroy(); });
test('volleyball awards the point opposite the floor contact', () => { const w = new PhysicsWorld('volleyball', []), b = w.balls[0]; Matter.Body.setPosition(b.body, { x: 400, y: FLOOR - b.radius }); assert.equal(w.sport.check(w), 1); Matter.Body.setPosition(b.body, { x: 750, y: FLOOR - b.radius }); assert.equal(w.sport.check(w), 0); w.destroy(); });
test('knockout falls score once and simultaneous falls reset without a random winner', () => { const w = new PhysicsWorld('knockout', []); w.players.forEach(p => Matter.Body.setPosition(p.body, { x: 560, y: 710 })); assert.equal(w.sport.check(w), null); assert.equal(w.recoveryCount, 1); Matter.Body.setPosition(w.players[0].body, { x: 560, y: 710 }); assert.equal(w.step([EMPTY_INPUT, EMPTY_INPUT]), 1); assert.equal(w.step([EMPTY_INPUT, EMPTY_INPUT]), 1); w.destroy(); });
test('keyboard-shaped input moves, jumps, and needs release for another jump', () => { const w = new PhysicsWorld('soccer', []); for (let f = 0; f < 20; f++)
    w.step([EMPTY_INPUT, EMPTY_INPUT]); const start = w.players[0].body.position.x; for (let f = 0; f < 15; f++)
    w.step([{ left: false, right: true, action: false }, EMPTY_INPUT]); assert.ok(w.players[0].body.position.x > start + 25); w.step([{ left: false, right: false, action: true }, EMPTY_INPUT]); assert.ok(w.players[0].body.velocity.y < -8); assert.ok(w.events.some(e => e.type === 'jump')); const jumps = w.events.filter(e => e.type === 'jump').length; for (let f = 0; f < 10; f++)
    w.step([{ left: false, right: false, action: true }, EMPTY_INPUT]); assert.equal(w.events.filter(e => e.type === 'jump').length, jumps); w.destroy(); });
test('stray balls reset and airborne player recovery does not stall play', () => { const w = new PhysicsWorld('soccer', []); Matter.Body.setPosition(w.balls[0].body, { x: 560, y: -180 }); w.step([EMPTY_INPUT, EMPTY_INPUT]); assert.equal(w.recoveryCount, 1); Matter.Body.setPosition(w.players[0].body, { x: 560, y: -220 }); w.step([EMPTY_INPUT, EMPTY_INPUT]); assert.equal(w.recoveryCount, 2); assert.ok(w.players[0].body.position.y > 300); w.destroy(); });
test('modifier selection blocks incompatible pairs for every sport', () => { assert.equal(compatible(['low-gravity', 'high-gravity'], 'soccer'), false); assert.equal(compatible(['giant-ball', 'tiny-ball'], 'basketball'), false); assert.equal(compatible(['double-ball'], 'knockout'), false); assert.equal(compatible(['high-gravity', 'tiny-players'], 'volleyball'), false); assert.equal(compatible(['ice-floor', 'giant-ball'], 'soccer'), true); const random = seeded(888); for (const sport of SPORTS)
    for (let i = 0; i < 500; i++)
        assert.ok(compatible(selectModifiers(sport, random), sport)); });
test('all twelve modifiers make a measurable rule change', () => { assert.equal(MODIFIERS.length, 12); for (const m of MODIFIERS) {
    assert.notDeepEqual(makeRules([m.id]), makeRules([]));
} });
test('every sport and compatible modifier works in all 22 themes', () => { let runs = 0, scored = 0; for (const [ai] of ARENAS.entries())
    for (const sport of SPORTS) {
        const sets = [[], ...MODIFIERS.filter(m => m.sports.includes(sport)).map(m => [m.id])];
        for (const mods of sets) {
            const r = simulate(sport, mods, ai, 71 + runs);
            runs++;
            if (r.winner !== null)
                scored++;
        }
    } assert.ok(scored / runs > .8, `At least 80% of theme/modifier plays score before the timeout: ${scored}/${runs}`); console.log(`Arena and modifier sweep: ${scored}/${runs} scored within 45 seconds.`); });
test('every compatible pair survives a full physics round', () => { let runs = 0, scored = 0; for (const sport of SPORTS)
    for (let i = 0; i < MODIFIERS.length; i++)
        for (let j = i + 1; j < MODIFIERS.length; j++) {
            const mods = [MODIFIERS[i].id, MODIFIERS[j].id];
            if (!compatible(mods, sport))
                continue;
            const r = simulate(sport, mods, runs % 5, 1200 + runs);
            runs++;
            if (r.winner !== null)
                scored++;
        } console.log(`Pair sweep: ${scored}/${runs} scored within 45 seconds.`); assert.ok(scored / runs > .75); });
test('twenty complete matches simulate each point and keep sport configuration until a round is won', () => {
    const random = seeded(140);
    for (let n = 0; n < 20; n++) {
        const match = new MatchManager(n % 2 ? 'quick' : 'two', 1, random);
        let sport: SportId = 'soccer', mods: string[] = [], arena = 0, scored = 0;
        for (let attempt = 0; attempt < 100 && !match.matchComplete; attempt++) {
            if (!match.round || match.roundComplete) {
                sport = match.nextSport(); mods = selectModifiers(sport, random); arena = attempt % ARENAS.length;
            }
            const result = simulate(sport, mods, arena, n * 193 + attempt);
            if (result.winner !== null) { match.score(result.winner); scored++; }
            assert.ok(match.points.every(v => v <= 3));
        }
        assert.equal(Math.max(...match.wins), 3);
        assert.ok(scored >= 9, 'each match requires at least nine distinct scored plays');
        assert.ok(match.wins.every(v => v <= 3));
    }
    console.log('20 complete matches passed with every point simulated.');
});
test('sport shuffle bags contain all four sports and never repeat across the boundary', () => { const m = new MatchManager('quick', 1, seeded(35)); for (let i = 0; i < 25; i++) {
    const bag = [m.nextSport(), m.nextSport(), m.nextSport(), m.nextSport()];
    assert.equal(new Set(bag).size, 4);
    const last = bag[3], next = m.nextSport();
    assert.notEqual(next, last);
    m.deck = [];
} });
test('Chaos Cup resets best-of-five state as its three tournament matches advance', () => {
    const cup = new MatchManager('cup', 0);
    for (let stage = 0; stage < 3; stage++) {
        assert.equal(cup.cupStage, stage); assert.equal(cup.difficulty, [0, 2, 3][stage]);
        for(let round=0; round<3; round++) { cup.nextSport(); cup.score(0); cup.score(0); assert.equal(cup.score(0), true); }
        cup.cup!.resolveHuman(true);
        if (stage < 2) { cup.nextCup(); assert.deepEqual(cup.wins, [0, 0]); assert.equal(cup.round, 0); }
    }
    assert.equal(cup.cup!.champion!.human, true);
});
