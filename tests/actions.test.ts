import test from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { PhysicsWorld } from '../src/systems/PhysicsWorld';
import { AIController } from '../src/systems/AIController';
import { EMPTY_INPUT as idle, type Side } from '../src/config/game';
const action = {...idle, action:true};
function settle(w:PhysicsWorld) { for(let i=0;i<30;i++) w.step([idle,idle]); }
function contact(w:PhysicsWorld, side:Side, y=0) {
    const p=w.players[side], b=w.balls[0];
    w.setPosition(b.body,p.body.position.x+24*p.scale+b.radius-2,p.body.position.y+y);
}
for(const side of [0,1] as Side[]) for(const motion of ['still','run','jump','fall','fast']) test(`automatic P${side+1} contact pickup: ${motion}, no Action`,()=>{
    const w=new PhysicsWorld('basketball',[]);settle(w); const p=w.players[side], b=w.balls[0];
    if(motion==='jump') { w.setPosition(p.body,p.body.position.x,350); Matter.Body.setVelocity(p.body,{x:0,y:-8}); }
    contact(w,side, motion==='fall'?-20:0);
    if(motion==='fast') Matter.Body.setVelocity(b.body,{x:-20,y:0});
    if(motion==='fall') Matter.Body.setVelocity(b.body,{x:0,y:15});
    w.step(side===0?[{...idle,right:motion==='run'},idle]:[idle,{...idle,left:motion==='run'}]);
    assert.equal(b.holder,side); assert.deepEqual(b.body.position,w.heldPosition(b));w.destroy();
});
test('holding Action before pickup needs release and a fresh press',()=>{
    const w=new PhysicsWorld('basketball',[]);contact(w,0);
    w.step([action,idle]); assert.equal(w.balls[0].possession.kind,'held');
    for(let i=0;i<70;i++)w.step([action,idle]);
    assert.equal(w.balls[0].possession.kind,'held');
    w.step([idle,idle]); assert.equal(w.events.filter(e=>e.type==='throw').length,0);
    w.step([action,idle]);assert.equal(w.balls[0].possession.kind,'charging');
    w.step([idle,idle]);w.step([idle,idle]);assert.equal(w.events.filter(e=>e.type==='throw').length,1);w.destroy();
});
function blockSetup(side:Side=1) {
    const w=new PhysicsWorld('basketball',['double-ball']);settle(w);
    const victim=w.players[1-side], defender=w.players[side], b=w.balls[0];
    contact(w,victim.side);assert.ok(w.grabBall(victim,b));
    w.setPosition(defender.body,b.body.position.x+(side===1?44:-44),victim.body.position.y);
    defender.facing=side===1?-1:1;
    b.possession={kind:'charging',owner:victim.side,caughtAt:w.elapsed,startedAt:w.elapsed-400};
    return {w,victim,defender,b};
}
for(const side of [0,1] as Side[]) test(`P${side+1} block startup, impulse, charge cancellation, exact dizzy recovery`,()=>{
    const {w,victim,defender,b}=blockSetup(side);
    const inputs=side===1?[action,action] as const:[action,action] as const;
    w.step([...inputs]); assert.equal(b.holder,victim.side);
    for(let i=0;i<4;i++)w.step([...inputs]);
    assert.equal(b.holder,victim.side,'80ms startup');
    w.step([...inputs]);assert.equal(b.holder,null);assert.equal(b.charge(w.elapsed),0);
    assert.equal(victim.stun,1000);assert.equal(b.body.isSensor,false);
    assert.ok(Math.abs(b.body.velocity.x)>5);assert.equal(w.grabBall(defender,b),false);
    const until=defender.actionReady; const hits=w.events.filter(e=>e.type==='block').length;
    for(let i=0;i<59;i++)w.step([idle,idle]);
    assert.ok(victim.stun>0);w.step([idle,idle]);assert.ok(victim.stun<.00001);
    assert.equal(w.events.filter(e=>e.type==='block').length,hits);
    assert.ok(until>defender.actionStarted+500);w.destroy();
});
test('missed block cannot stun; activation and cooldown require fresh input',()=>{
    const w=new PhysicsWorld('basketball',[]);settle(w);
    w.step([idle,idle]);assert.equal(w.players[0].actionStarted,-Infinity);
    w.step([action,idle]);const start=w.players[0].actionStarted;
    w.step([idle,idle]);w.step([action,idle]);assert.equal(w.players[0].actionStarted,start);
    for(let i=0;i<40;i++)w.step([idle,idle]);
    assert.equal(w.players[1].stun,0);w.step([action,idle]);assert.ok(w.players[0].actionStarted>start);w.destroy();
});
test('free-ball block deflects once without stunning nearby player',()=>{
    const w=new PhysicsWorld('basketball',[]);settle(w);const p=w.players[0],b=w.balls[0];
    w.step([action,idle]);w.elapsed+=80;
    w.setPosition(b.body,p.body.position.x+60,p.body.position.y-16);
    Matter.Body.setVelocity(b.body,{x:-10,y:0});w.blockContacts(p);assert.ok(b.body.velocity.x>0);
    w.blockContacts(p);assert.equal(w.events.filter(e=>e.type==='block').length,1);
    assert.ok(w.players.every(p=>p.stun===0));w.destroy();
});
test('dizzy denies movement, jump and action to human and CPU while gravity continues',()=>{
    const w=new PhysicsWorld('basketball',[]);const p=w.players[1];p.stun=1000;
    w.setPosition(p.body,800,300);const x=p.body.position.x;
    const ai=new AIController(3);assert.deepEqual(ai.update(w),idle);
    for(let i=0;i<10;i++)w.step([idle,{...action,left:true,jump:true}]);
    assert.ok(Math.abs(p.body.position.x-x)<.01);assert.ok(p.body.position.y>300);
    assert.equal(p.actionStarted,-Infinity);assert.ok(p.stun>800);
    w.resetPlayers();assert.equal(p.stun,0);w.destroy();
});
for(const dir of [-1,1]) test(`soccer slide direction ${dir}, contact power and cooldown`,()=>{
    const w=new PhysicsWorld('soccer',[]);settle(w);const p=w.players[0],b=w.balls[0];
    w.setPosition(b.body,p.body.position.x+dir*50,p.body.position.y+20);
    w.step([{...action,left:dir<0,right:dir>0},idle]);
    assert.ok(p.body.velocity.x*dir>8);for(let i=0;i<3;i++)w.step([idle,idle]);
    assert.ok(b.body.velocity.x*dir>8);const start=p.actionStarted;
    w.step([action,idle]);assert.equal(p.actionStarted,start);w.destroy();
});
test('volleyball requires Jump then one fresh Action per airtime and resets on landing',()=>{
    const w=new PhysicsWorld('volleyball',[]);settle(w);
    // Keep the rally alive while testing airtime.
    w.setPosition(w.balls[0].body,850,100);w.winner=null;
    const p=w.players[0];w.step([{...idle,jump:true},idle]);
    assert.ok(p.body.velocity.y<-8);w.step([idle,idle]);w.step([action,idle]);
    assert.ok(p.airJumpUsed);const start=p.actionStarted;w.step([idle,idle]);w.step([action,idle]);assert.equal(p.actionStarted,start);
    w.setPosition(p.body,310,490);Matter.Body.setVelocity(p.body,{x:0,y:0});
    w.step([idle,idle]);assert.equal(p.airJumpUsed,false);w.destroy();
});
test('knockout dash has direction, physical tackle, cooldown and one air dash',()=>{
    const w=new PhysicsWorld('knockout',[]);settle(w);const [p,q]=w.players;
    w.setPosition(q.body,p.body.position.x+65,p.body.position.y);
    w.step([{...action,right:true},idle]);for(let i=0;i<4;i++)w.step([idle,idle]);
    assert.ok(q.body.velocity.x>8);const start=p.actionStarted;w.step([action,idle]);assert.equal(p.actionStarted,start);
    p.stun=0;w.elapsed=p.actionReady+1;w.setPosition(p.body,450,300);p.airDashUsed=false;
    w.step([idle,idle]);w.step([{...action,left:true},idle]);assert.ok(p.airDashUsed);
    const airStart=p.actionStarted;w.elapsed=p.actionReady+1;w.step([idle,idle]);w.step([action,idle]);assert.equal(p.actionStarted,airStart);w.destroy();
});
