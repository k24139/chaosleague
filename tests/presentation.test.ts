import test from 'node:test';
import assert from 'node:assert/strict';
import { introCue, INTRO_DURATION, ScorePresentation } from '../src/systems/PresentationTimeline';
import { PhysicsWorld } from '../src/systems/PhysicsWorld';
import Matter from 'matter-js';
import { PALETTE } from '../src/config/theme';

test('sport and map share one cue, modifiers follow, then a full three-second countdown', () => {
    assert.equal(introCue(0).kind, 'arena'); assert.equal(introCue(949).kind, 'arena');
    assert.equal(introCue(950).kind, 'chaos'); assert.equal(introCue(1649).kind, 'chaos');
    for (const [start, label] of [[1650, '3'], [2650, '2'], [3650, '1']] as const) {
        assert.equal(introCue(start).label, label); assert.equal(introCue(start + 999).label, label);
    }
    assert.equal(introCue(4650).kind, 'fight'); assert.equal(introCue(4949).kind, 'fight');
    assert.equal(INTRO_DURATION, 4950); assert.equal(introCue(INTRO_DURATION).kind, 'live');
});
test('score copy uses sport terms, avoids repeats and labels local players', () => {
    const p = new ScorePresentation(() => 0);
    assert.equal(p.event('soccer'), 'Goal!'); assert.equal(p.event('basketball'), 'Score!');
    assert.equal(p.event('volleyball'), 'Point!'); assert.equal(p.event('knockout'), 'Knockout!');
    for (const side of [0, 1] as const) {
        const first = p.line('quick', side); assert.notEqual(p.line('quick', side), first);
    }
    assert.equal(p.line('two', 0), 'Player 1 strikes.');
    assert.equal(p.line('two', 1), 'Player 2 takes the point.');
});
test('a scored basketball continues down through the net without further strikes or points', () => {
    const w = new PhysicsWorld('basketball', []), ball = w.balls[0];
    Matter.Body.setPosition(ball.body, { x: 1026, y: 329 });
    Matter.Body.setVelocity(ball.body, { x: 0, y: 3 }); w.winner = 0;
    for (let i = 0; i < 12; i++) w.settle();
    assert.ok(ball.body.position.y > 373); assert.equal(w.winner, 0);
    assert.equal(w.events.filter(e => e.type === 'score').length, 0); w.destroy();
});

test('the original local SVG set shares one grid, stroke and corner style', async () => {
    const { icon, iconNames } = await import('../src/ui/icons');
    const { readFileSync } = await import('node:fs');
    for (const name of iconNames) {
        const svg = icon(name);
        assert.match(svg, /viewBox="0 0 32 32"/); assert.match(svg, /stroke-width="2"/); assert.match(svg, /stroke-linejoin="bevel"/);
        assert.equal(readFileSync(new URL(`../public/icons/${name}.svg`, import.meta.url), 'utf8'), svg.replace('currentColor', '#' + PALETTE.text.toString(16).toUpperCase()));
    }
});
test('rear goal, ball and front net layers bracket gameplay and remain below effects', async () => {
    const { LAYERS } = await import('../src/config/geometry');
    assert.ok(LAYERS.background < LAYERS.court);
    assert.ok(LAYERS.court < LAYERS.rearGoal);
    assert.ok(LAYERS.rearGoal < LAYERS.entities);
    assert.ok(LAYERS.entities < LAYERS.frontGoal);
    assert.ok(LAYERS.frontGoal < LAYERS.effects);
});

test('intro uses continuous real time without boundary stalls', async () => {
    const { advanceIntro } = await import('../src/systems/PresentationTimeline');
    assert.equal(advanceIntro(900, 75), 975);
    assert.equal(advanceIntro(1650, 300), 1950);
    assert.equal(advanceIntro(4900, 100), INTRO_DURATION);
    assert.equal(advanceIntro(800, 0), 800);
});
