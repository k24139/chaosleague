import test from 'node:test';
import assert from 'node:assert/strict';
import { introCue, INTRO_DURATION, ScorePresentation } from '../src/systems/PresentationTimeline';
import { PhysicsWorld } from '../src/systems/PhysicsWorld';
import Matter from 'matter-js';

test('sport, map and modifier each hold for two seconds, then three one-second counts', () => {
    for (const [start, kind] of [[0, 'sport'], [2000, 'map'], [4000, 'chaos']] as const) {
        assert.equal(introCue(start).kind, kind); assert.equal(introCue(start + 1999).kind, kind);
    }
    for (const [start, label] of [[6000, '3'], [7000, '2'], [8000, '1']] as const) {
        assert.equal(introCue(start).label, label); assert.equal(introCue(start + 999).label, label);
    }
    assert.equal(introCue(9000).kind, 'fight'); assert.equal(introCue(9449).kind, 'fight');
    assert.equal(introCue(INTRO_DURATION).kind, 'live');
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
        assert.equal(readFileSync(new URL(`../public/icons/${name}.svg`, import.meta.url), 'utf8'), svg.replace('currentColor', '#f7f7fa'));
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

test('long or uneven frame gaps cannot skip a countdown numeral or FIGHT', async () => {
    const { advanceIntro } = await import('../src/systems/PresentationTimeline');
    let time = 0;
    const seen = [introCue(time).key];
    for (let i = 0; i < 7; i++) { time = advanceIntro(time, 5000); seen.push(introCue(time).key); }
    assert.deepEqual(seen, ['sport','map','chaos','count-3','count-2','count-1','fight','live']);
    assert.equal(advanceIntro(6000, 300), 6300);
    assert.equal(advanceIntro(6700, 500), 7000);
    assert.equal(advanceIntro(6700, 0), 6700);
});
