import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchManager } from '../src/systems/MatchManager';
import { PhysicsWorld } from '../src/systems/PhysicsWorld';
import { SPORTS } from '../src/config/game';

test('one point keeps the sport round open; three points awards one round win', () => {
    const match = new MatchManager('quick'); match.nextSport();
    assert.equal(match.score(0), false); assert.deepEqual(match.points, [1,0]);
    assert.deepEqual(match.wins, [0,0]); assert.equal(match.roundComplete, false);
    match.score(1); match.score(0);
    assert.equal(match.score(0), true); assert.deepEqual(match.points, [3,1]);
    assert.deepEqual(match.wins, [1,0]);
    assert.equal(match.score(0), false); assert.deepEqual(match.points, [3,1]);
});
test('2–2 signals round point; the next point ends the round and the next arena starts 0–0', () => {
    const match = new MatchManager('two'); match.nextSport();
    for(const side of [0,1,0,1] as const) match.score(side);
    assert.equal(match.roundPoint, true); assert.equal(match.matchComplete, false);
    assert.equal(match.score(1), true); assert.deepEqual(match.wins, [0,1]);
    match.nextSport(); assert.deepEqual(match.points, [0,0]);
    assert.deepEqual(match.wins, [0,1]); assert.equal(match.roundPoint, false);
});
test('three sport rounds wins a match, with nine or more points required', () => {
    const match = new MatchManager('quick');
    for(let round=0;round<3;round++) {
        match.nextSport(); match.score(0); match.score(0); match.score(0);
        assert.equal(match.matchComplete, round===2);
    }
    assert.deepEqual(match.wins,[3,0]);
});
test('point resets can preserve every sport, theme, modifier and team configuration', () => {
    for(const sport of SPORTS) {
        const before = new PhysicsWorld(sport,['low-gravity'],13,[3,5]);
        before.elapsed=31000;
        const after = new PhysicsWorld(before.sportId,before.modifierIds,before.arenaIndex,before.players.map(p=>p.team));
        assert.equal(after.sportId,before.sportId); assert.equal(after.arenaIndex,13);
        assert.deepEqual(after.modifierIds,['low-gravity']); assert.deepEqual(after.players.map(p=>p.team),[3,5]);
        assert.equal(after.elapsed,0); assert.equal(after.winner,null);
        before.destroy(); after.destroy();
    }
});
test('scored physics moves on every display frame throughout slow motion', async () => {
    const { scoreTimeScale } = await import('../src/systems/PresentationTimeline');
    const Matter = (await import('matter-js')).default;
    const w = new PhysicsWorld('basketball',[]);
    const ball=w.balls[0]; Matter.Body.setPosition(ball.body,{x:560,y:200});
    Matter.Body.setVelocity(ball.body,{x:2,y:1}); w.winner=0;
    let prior=ball.body.position.x;
    for(let frame=0;frame<45;frame++) {
        w.settle(1000/60*scoreTimeScale(frame*1000/60));
        assert.ok(ball.body.position.x>prior,'scored motion never holds between render frames');
        prior=ball.body.position.x;
    }
    w.destroy();
});
