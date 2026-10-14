import test from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { PhysicsWorld } from '../src/systems/PhysicsWorld';
import { AIController } from '../src/systems/AIController';
import { SHOT_CHARGE_MS, RECATCH_MS, shotVelocity } from '../src/systems/BasketballPossession';
import { EMPTY_INPUT, type Side } from '../src/config/game';
const held = { ...EMPTY_INPUT, action: true };
function nearby(w: PhysicsWorld, side: Side = 0, ball = 0) {
    const p = w.players[side]; Matter.Body.setPosition(w.balls[ball].body, { x: p.body.position.x + 38 * (side === 0 ? 1 : -1), y: p.body.position.y - 10 });
}
for (const mods of [[], ['giant-ball'], ['tiny-ball'], ['double-ball'], ['giant-players'], ['tiny-players'], ['low-gravity'], ['high-gravity'], ['super-bounce'], ['speed-boost'], ['moving-goals'], ['strong-wind'], ['ice-floor']]) test(`catch, carry, charge and release: ${mods.join() || 'normal'}`, () => {
    const w = new PhysicsWorld('basketball', mods), b = w.balls[0]; nearby(w);
    const moving = { ...held, right: true };
    w.step([moving, EMPTY_INPUT]); assert.equal(b.holder, 0); assert.equal(b.possession.kind, 'charging'); assert.equal(b.body.isSensor, true);
    const x = w.players[0].body.position.x;
    for (let i = 0; i < 8; i++) w.step([moving, EMPTY_INPUT]);
    assert.ok(w.players[0].body.position.x > x); assert.equal(b.holder, 0); assert.ok(b.charge(w.elapsed) > 0);
    assert.deepEqual(b.body.position, w.heldPosition(b), 'anchor follows after the physics step');
    w.step([EMPTY_INPUT, EMPTY_INPUT]); assert.equal(b.holder, null); assert.equal(b.possession.kind, 'released'); assert.equal(b.charge(w.elapsed), 0); assert.equal(b.body.isSensor, false);
    assert.equal(b.body.collisionFilter.mask, 1); assert.ok(b.body.velocity.x > 0); assert.ok(b.body.velocity.y < 0);
    nearby(w); assert.equal(w.grabBall(w.players[0], b), false); w.destroy();
});
test('hard body contact dislodges possession; incidental contact preserves it', () => {
    for (const speed of [.5, 8]) {
        const w = new PhysicsWorld('basketball', []), b = w.balls[0]; nearby(w); w.step([held, EMPTY_INPUT]);
        Matter.Body.setVelocity(w.players[0].body, { x: 0, y: 0 });
        Matter.Body.setPosition(w.players[1].body, { x: w.players[0].body.position.x + 46, y: w.players[0].body.position.y });
        Matter.Body.setVelocity(w.players[1].body, { x: -speed, y: 0 });
        w.step([held, EMPTY_INPUT]);
        assert.equal(b.holder, speed > 4.5 ? null : 0);
        if (speed > 4.5) assert.equal(b.possession.kind, 'released');
        w.destroy();
    }
});
test('opponent action contests a held ball before body contact', () => {
    const w = new PhysicsWorld('basketball', []), b = w.balls[0]; nearby(w); w.step([held, EMPTY_INPUT]);
    Matter.Body.setPosition(w.players[1].body, { x: b.body.position.x + 55, y: b.body.position.y });
    w.step([held, held]); assert.equal(b.holder, null); w.destroy();
});
test('each player can hold only one ball and Double Ball ownership is independent', () => {
    const w = new PhysicsWorld('basketball', ['double-ball']); nearby(w, 0, 0); nearby(w, 0, 1);
    assert.equal(w.grabBall(w.players[0], w.balls[0]), true); assert.equal(w.grabBall(w.players[0], w.balls[1]), false);
    assert.equal(w.grabBall(w.players[1], w.balls[0]), false);
    nearby(w, 1, 1); assert.equal(w.grabBall(w.players[1], w.balls[1]), true);
    w.step([held, held]);
    w.step([EMPTY_INPUT, held]);
    assert.equal(w.balls[0].holder, null); assert.equal(w.balls[1].holder, 1); assert.equal(w.balls[1].possession.kind, 'charging');
    w.destroy();
});
test('held balls cannot score through a hoop', () => {
    const w = new PhysicsWorld('basketball', []); nearby(w); w.grabBall(w.players[0], w.balls[0]);
    const b = w.balls[0]; Matter.Body.setPosition(b.body, { x: 1026, y: 330 }); b.previous = { x: 1026, y: 270 };
    Matter.Body.setVelocity(b.body, { x: 0, y: 5 }); assert.equal(w.sport.check(w), null); w.destroy();
});
test('charging caps at full power without an automatic timed release', () => {
    const w = new PhysicsWorld('basketball', []); nearby(w); w.step([held, EMPTY_INPUT]);
    const b = w.balls[0]; w.elapsed += SHOT_CHARGE_MS * 4;
    assert.equal(b.charge(w.elapsed), 1); w.step([held, EMPTY_INPUT]); assert.equal(b.holder, 0);
    w.step([EMPTY_INPUT, EMPTY_INPUT]); assert.equal(b.holder, null); assert.equal(b.charge(w.elapsed), 0); w.destroy();
});
test('a held ball waits for press, charges while held, then shoots on release only', () => {
    const w = new PhysicsWorld('basketball', []); nearby(w); const b = w.balls[0]; w.grabBall(w.players[0], b);
    w.step([EMPTY_INPUT, EMPTY_INPUT]); assert.equal(b.possession.kind, 'held');
    w.step([held, EMPTY_INPUT]); assert.equal(b.possession.kind, 'charging');
    for (let i = 0; i < 12; i++) w.step([held, EMPTY_INPUT]);
    assert.ok(b.charge(w.elapsed) > .15); assert.equal(w.events.filter(e=>e.type==='throw').length, 0);
    w.step([EMPTY_INPUT, EMPTY_INPUT]); assert.equal(w.events.filter(e=>e.type==='throw').length, 1); w.destroy();
});
test('short, medium and full charge produce increasingly strong capped shots', () => {
    const speeds = [0, .5, 1, 3].map(charge => shotVelocity({x:400,y:430},{x:1026,y:315},charge,1,{x:0,y:0}));
    assert.ok(speeds[0].x < speeds[1].x && speeds[1].x < speeds[2].x);
    assert.ok(speeds[0].y > speeds[1].y && speeds[1].y > speeds[2].y);
    assert.deepEqual(speeds[2],speeds[3]);
});
for (const side of [0,1] as Side[]) test(`P${side+1} shoots at the opponent despite facing and running home`, () => {
    const w = new PhysicsWorld('basketball', []), p = w.players[side], b = w.balls[0]; nearby(w,side); w.grabBall(p,b);
    p.facing = side === 0 ? -1 : 1; Matter.Body.setVelocity(p.body,{x:p.facing*10,y:-4});
    b.possession = {kind:'charging',owner:side,caughtAt:0,startedAt:0}; w.elapsed = 600;
    const target = w.opponentBasket(side), from = w.heldPosition(b); w.releaseBall(b);
    const v = b.body.velocity;
    assert.ok((target.x-from.x)*v.x > 0); assert.ok((target.x-from.x)*v.x+(target.y-from.y)*v.y > 0);
    assert.equal(b.holder,null); w.destroy();
});
test('Moving Goals uses the current rim geometry on release', () => {
    const w = new PhysicsWorld('basketball',['moving-goals']), b = w.balls[0]; nearby(w); w.grabBall(w.players[0],b);
    w.elapsed=800; w.sport.update(w);
    w.setPosition(w.hoops[3],800,w.goalY); w.setPosition(w.hoops[4],900,w.goalY);
    b.possession={kind:'charging',owner:0,caughtAt:0,startedAt:200};
    const expected=shotVelocity(w.heldPosition(b),{x:850,y:w.goalY},b.charge(w.elapsed),w.rules.gravity,w.players[0].body.velocity);
    w.releaseBall(b); assert.ok(Math.abs(b.body.velocity.x-expected.x)<1e-9); assert.ok(Math.abs(b.body.velocity.y-expected.y)<1e-9); w.destroy();
});
test('recapture cooldown applies to the releaser while an opponent can catch', () => {
    const w=new PhysicsWorld('basketball',[]), b=w.balls[0]; nearby(w); w.grabBall(w.players[0],b); w.releaseBall(b);
    nearby(w); assert.equal(w.grabBall(w.players[0],b),false);
    nearby(w,1); assert.equal(w.grabBall(w.players[1],b),true); w.releaseBall(b);
    w.elapsed+=RECATCH_MS+1; nearby(w,1); assert.equal(w.grabBall(w.players[1],b),true); w.destroy();
});
test('grab range is local and a fast ball requires close contact', () => {
    const w=new PhysicsWorld('basketball',[]), p=w.players[0], b=w.balls[0];
    assert.equal(w.grabBall(p,b),false);
    w.setPosition(b.body,p.body.position.x+p.radius+b.radius+12,p.body.position.y); Matter.Body.setVelocity(b.body,{x:18,y:0});
    assert.equal(w.grabBall(p,b),false); w.setPosition(b.body,p.body.position.x+p.radius+b.radius,p.body.position.y);
    assert.equal(w.grabBall(p,b),true); w.destroy();
});
test('carrying hand stays stable through direction changes and the player can jump', () => {
    const w=new PhysicsWorld('basketball',[]); for(let i=0;i<20;i++)w.step([EMPTY_INPUT,EMPTY_INPUT]);
    nearby(w); const b=w.balls[0]; w.grabBall(w.players[0],b); const anchor=w.heldPosition(b);
    w.players[0].facing=-1; assert.deepEqual(w.heldPosition(b),anchor);
    w.step([held,EMPTY_INPUT]); assert.ok(w.players[0].body.velocity.y < -8); assert.equal(b.holder,0); w.destroy();
});
test('resets and world disposal clear all possession and charge state', () => {
    const w=new PhysicsWorld('basketball',['double-ball']); nearby(w); w.step([held,EMPTY_INPUT]);
    w.resetBall(w.balls[0]); assert.equal(w.balls[0].possession.kind,'free'); assert.equal(w.balls[0].body.isSensor,false);
    nearby(w); w.step([held,EMPTY_INPUT]); w.resetPlayers(); assert.equal(w.balls[0].holder,null);
    nearby(w); w.step([held,EMPTY_INPUT]); const b=w.balls[0]; w.destroy(); assert.equal(b.possession.kind,'free');
});
test('other sports cannot carry balls', () => {
    for(const sport of ['soccer','volleyball'] as const){const w=new PhysicsWorld(sport,[]); nearby(w); assert.equal(w.grabBall(w.players[0],w.balls[0]),false);w.destroy();}
});
test('simultaneous loose-ball contest resolves deterministically with one owner', () => {
    const run=()=>{const w=new PhysicsWorld('basketball',[]); w.setPosition(w.players[0].body,510,430);w.setPosition(w.players[1].body,610,430);w.setPosition(w.balls[0].body,560,430);w.step([held,held]);const state=w.balls[0].possession;w.destroy();return state.kind;};
    assert.equal(run(),run());
});
test('CPU acquires, charges and releases using the same opponent-targeted shot path', () => {
    const w=new PhysicsWorld('basketball',[]),ai=new AIController(3,1,()=>.5);nearby(w,1);
    let thrown=false;
    for(let i=0;i<160;i++){
        w.step([EMPTY_INPUT,ai.update(w)]);
        if(w.events.some(e=>e.type==='throw'&&e.side===1)){assert.ok(w.balls[0].body.velocity.x<0);thrown=true;break;}
    }
    assert.ok(thrown);w.destroy();
});
test('a real point clears a second held ball before the next play or round',()=>{
    const w=new PhysicsWorld('basketball',['double-ball']),b=w.balls[0];nearby(w,1,1);w.grabBall(w.players[1],w.balls[1]);
    w.setPosition(b.body,1026,280);b.previous={x:1026,y:270};Matter.Body.setVelocity(b.body,{x:0,y:2});assert.equal(w.sport.check(w),null);
    w.setPosition(b.body,1026,309);Matter.Body.setVelocity(b.body,{x:0,y:20});
    assert.equal(w.step([EMPTY_INPUT,held]),0);
    for(const ball of w.balls){assert.equal(ball.possession.kind,'free');assert.equal(ball.holder,null);assert.equal(ball.charge(w.elapsed),0);assert.equal(ball.body.isSensor,false);}
    w.destroy();
});
test('CPU pursues an opposing holder and prioritizes a loose second ball',()=>{
    const w=new PhysicsWorld('basketball',['double-ball']),ai=new AIController(3,1,()=>.5);nearby(w);w.grabBall(w.players[0],w.balls[0]);
    // Remove the loose-ball alternative temporarily: the defender must contest the holder.
    const second=w.balls.pop()!;
    assert.equal(ai.update(w).left,true);
    w.balls.push(second);w.setPosition(second.body,950,490);ai.next=0;
    assert.equal(ai.update(w).right,true);w.destroy();
});
test('a release directly under the target hoop has no arbitrary sideways aim',()=>{
    const v=shotVelocity({x:94,y:450},{x:94,y:315},.5,1,{x:8,y:0});assert.equal(Math.abs(v.x),0);assert.ok(v.y<0);
});
