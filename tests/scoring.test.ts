import test from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { PhysicsWorld } from '../src/systems/PhysicsWorld';
import { EMPTY_INPUT } from '../src/config/game';
import { BASKET, GOAL } from '../src/config/geometry';
function pose(w: PhysicsWorld, x: number, previousY: number, y: number, vy = 5, index = 0) {
    const b = w.balls[index]; b.previous = { x, y: previousY };
    Matter.Body.setPosition(b.body, { x, y }); Matter.Body.setVelocity(b.body, { x: 0, y: vy });
    return w.sport.check(w);
}
for (const mods of [[], ['tiny-ball'], ['giant-ball'], ['double-ball']]) {
    test(`basket passage and outside-rim rejection with ${mods.join() || 'normal ball'}`, () => {
        for (const index of mods[0] === 'double-ball' ? [0,1] : [0]) {
            const w = new PhysicsWorld('basketball', mods), r = w.balls[index].radius;
            assert.equal(pose(w, 1026, 260, 280, 5, index), null);
            assert.equal(pose(w, 1026, 300, 316, 5, index), null);
            assert.equal(pose(w, 1026, 316, 330, 5, index), 0); w.destroy();
            const outside = new PhysicsWorld('basketball', mods);
            const x = 1026 + BASKET.rimInner - r + 2;
            assert.equal(pose(outside, x, 260, 280, 5, index), null);
            assert.equal(pose(outside, x, 300, 316, 5, index), null);
            assert.equal(pose(outside, x, 316, 330, 5, index), null); outside.destroy();
        }
    });
}
test('ascending from below, passing above and touching the outside net never awards a basket', () => {
    const w = new PhysicsWorld('basketball', []);
    assert.equal(pose(w, 1026, 330, 300, -6), null);
    assert.equal(pose(w, 1026, 300, 280, -4), null);
    assert.equal(pose(w, 1026, 280, 316, 5), null);
    assert.equal(pose(w, 1026, 316, 330, 5), null);
    assert.equal(pose(w, 1090, 270, 290, 4), null);
    assert.equal(pose(w, 1090, 310, 350, 4), null); w.destroy();
});
test('crossing the lower plane beside the basket invalidates a previously entered ball', () => {
    const w = new PhysicsWorld('basketball', []);
    pose(w, 1026, 260, 280);
    assert.equal(pose(w, 1026, 300, 316), null);
    assert.equal(pose(w, 1064, 316, 330), null); w.destroy();
});
test('moving hoops keep the detector and actual rim colliders aligned', () => {
    const w = new PhysicsWorld('basketball', ['moving-goals']);
    for (let i = 0; i < 20; i++) w.step([EMPTY_INPUT, EMPTY_INPUT]);
    assert.equal(w.hoops[0].position.y, w.goalY); assert.equal(w.hoops[3].position.y, w.goalY);
    const y = w.goalY;
    assert.equal(pose(w, 1026, y - 55, y - 30), null);
    assert.equal(pose(w, 1026, y - 10, y + 2), null);
    assert.equal(pose(w, 1026, y + 2, y + 18), 0); w.destroy();
});
for (const mods of [[], ['tiny-ball'], ['giant-ball'], ['double-ball'], ['moving-goals']]) {
    test(`soccer requires full ball clearance inside the visible opening: ${mods.join() || 'normal'}`, () => {
        const w = new PhysicsWorld('soccer', mods); w.sport.update(w); const b = w.balls[0];
        Matter.Body.setPosition(b.body, { x: 1105, y: w.goalY - GOAL.halfHeight + b.radius - 2 });
        assert.equal(w.sport.check(w), null);
        Matter.Body.setPosition(b.body, { x: 1105, y: w.goalY }); assert.equal(w.sport.check(w), 0);
        for (const bar of w.hoops.filter(b => b.label === 'goal-crossbar')) assert.ok(Math.abs(bar.bounds.max.y - (w.goalY - GOAL.halfHeight)) < .1);
        w.destroy();
    });
}

test('a scored ball continues physically into the net without allowing another score', () => {
    const w = new PhysicsWorld('basketball', []), ball = w.balls[0];
    const at = () => pose(w, 1026, 260, 280);
    at(); pose(w, 1026, 300, 316); assert.equal(pose(w, 1026, 316, 330), 0);
    w.winner = 0;
    const y = ball.body.position.y;
    for (let i = 0; i < 12; i++) w.settle();
    assert.ok(ball.body.position.y > y);
    assert.equal(w.step([EMPTY_INPUT, EMPTY_INPUT]), 0);
    assert.equal(w.sport.check(w), null);
    w.destroy();
});

test('court edge stops leave room for the full character silhouette and do not close soccer mouths', () => {
    for (const sport of ['basketball','volleyball','soccer'] as const) {
        const w = new PhysicsWorld(sport, ['giant-players']);
        for (const player of w.players) {
            Matter.Body.setPosition(player.body, { x: player.side === 0 ? 5 : 1115, y: 460 });
            Matter.Body.setVelocity(player.body, { x: 0, y: 0 });
        }
        for (let i = 0; i < 24; i++) w.step([EMPTY_INPUT,EMPTY_INPUT]);
        assert.ok(w.players[0].body.position.x >= 47, sport);
        assert.ok(w.players[1].body.position.x <= 1073, sport);
        if (sport === 'soccer') {
            const b = w.balls[0];
            assert.equal(b.body.collisionFilter.mask! & 2, 0, 'Balls ignore player-only stops');
            Matter.Body.setPosition(b.body, { x: 20, y: w.goalY });
            assert.equal(w.sport.check(w), 1);
        }
        w.destroy();
    }
});
