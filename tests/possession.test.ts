import test from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { PhysicsWorld } from '../src/systems/PhysicsWorld';
import { EMPTY_INPUT } from '../src/config/game';
const held = { left: false, right: true, action: true };
function nearby(w: PhysicsWorld, side = 0, ball = 0) {
    const p = w.players[side]; Matter.Body.setPosition(w.balls[ball].body, { x: p.body.position.x + 38 * p.facing, y: p.body.position.y - 10 });
}
for (const mods of [[], ['giant-ball'], ['tiny-ball'], ['double-ball'], ['giant-players'], ['tiny-players']]) test(`catch, carry and release: ${mods.join() || 'normal'}`, () => {
    const w = new PhysicsWorld('basketball', mods), b = w.balls[0]; nearby(w);
    w.step([held, EMPTY_INPUT]); assert.equal(b.holder, 0); assert.equal(b.body.isSensor, true);
    const x = w.players[0].body.position.x;
    for (let i = 0; i < 8; i++) w.step([held, EMPTY_INPUT]);
    assert.ok(w.players[0].body.position.x > x); assert.equal(b.holder, 0);
    assert.ok(b.body.position.x - w.players[0].body.position.x > b.radius + 24 * w.players[0].scale);
    w.step([EMPTY_INPUT, EMPTY_INPUT]); assert.equal(b.holder, null); assert.equal(b.body.isSensor, false);
    assert.equal(b.body.collisionFilter.mask, 1); assert.ok(b.body.velocity.x > 0); assert.ok(b.body.velocity.y < 0);
    nearby(w); assert.equal(w.grabBall(w.players[0], b), false); w.destroy();
});
test('body collision dislodges possession and does not immediately attach it again', () => {
    const w = new PhysicsWorld('basketball', []), b = w.balls[0]; nearby(w); w.step([held, EMPTY_INPUT]);
    Matter.Body.setPosition(w.players[1].body, { x: w.players[0].body.position.x + 25, y: w.players[0].body.position.y });
    w.step([held, EMPTY_INPUT]); assert.equal(b.holder, null); assert.ok(b.grabCooldown > w.elapsed); w.destroy();
});
test('opponent action contests a held ball before body contact', () => {
    const w = new PhysicsWorld('basketball', []), b = w.balls[0]; nearby(w); w.step([held, EMPTY_INPUT]);
    Matter.Body.setPosition(w.players[1].body, { x: b.body.position.x + 55, y: b.body.position.y });
    w.step([held, { ...EMPTY_INPUT, action: true }]); assert.equal(b.holder, null); w.destroy();
});
test('holding at the hoop never scores, and each player can hold only one ball', () => {
    const w = new PhysicsWorld('basketball', ['double-ball']); nearby(w, 0, 0); nearby(w, 0, 1);
    assert.equal(w.grabBall(w.players[0], w.balls[0]), true); assert.equal(w.grabBall(w.players[0], w.balls[1]), false);
    Matter.Body.setPosition(w.balls[0].body, { x: 1026, y: 330 }); w.balls[0].previous = { x: 1026, y: 270 };
    Matter.Body.setVelocity(w.balls[0].body, { x: 0, y: 5 }); assert.equal(w.sport.check(w), null); w.destroy();
});
test('possession expires, resets release it, and other sports cannot carry balls', () => {
    const w = new PhysicsWorld('basketball', []); nearby(w); w.step([held, EMPTY_INPUT]);
    w.balls[0].heldSince = w.elapsed - 3100; w.step([held, EMPTY_INPUT]); assert.equal(w.balls[0].holder, null);
    w.balls[0].grabCooldown = 0; nearby(w); w.grabBall(w.players[0], w.balls[0]); w.resetBall(w.balls[0]);
    assert.equal(w.balls[0].holder, null); assert.equal(w.balls[0].body.isSensor, false); w.destroy();
    for (const sport of ['soccer', 'volleyball'] as const) { const world = new PhysicsWorld(sport, []); nearby(world); assert.equal(world.grabBall(world.players[0], world.balls[0]), false); world.destroy(); }
});
