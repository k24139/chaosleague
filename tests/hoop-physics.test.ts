import test from 'node:test';
import assert from 'node:assert/strict';
import Matter from 'matter-js';
import { PhysicsWorld } from '../src/systems/PhysicsWorld';
import { AIController } from '../src/systems/AIController';
import { preferredCharge } from '../src/systems/BasketballPossession';
import { EMPTY_INPUT as idle, type Side } from '../src/config/game';
import { BASKET } from '../src/config/geometry';

function simulate(w:PhysicsWorld, frames=180) {
    let winner:Side|null=null;
    const path:{x:number;y:number;vy:number}[]=[];
    for(let i=0;i<frames;i++) {
        winner=w.step([idle,idle]);
        const b=w.balls[0]; path.push({...b.body.position,vy:b.body.velocity.y});
        if(winner!==null)break;
    }
    return {winner,path};
}
for(const side of [0,1] as Side[]) for(const mods of [[],['tiny-ball'],['giant-ball'],['double-ball'],['moving-goals']]) {
    test(`physical downward basket at hoop ${1-side}: ${mods.join()||'normal'} scores P${side+1} once`,()=>{
        const w=new PhysicsWorld('basketball',mods),b=w.balls[0],basket=w.opponentBasket(side);
        if(mods.includes('double-ball'))w.setPosition(w.balls[1].body,560,400);
        w.setPosition(b.body,basket.x,210);Matter.Body.setVelocity(b.body,{x:0,y:3});
        const result=simulate(w);
        assert.equal(result.winner,side);
        assert.ok(b.body.position.y>=w.goalY+BASKET.scoreDepth);
        const before=b.body.position.y;
        for(let i=0;i<8;i++)w.settle();
        assert.ok(b.body.position.y>before,'continues visibly through net');
        assert.equal(w.sport.check(w),null);
        assert.equal(w.events.filter(e=>e.type==='score').length,1);
        w.destroy();
    });
}
for(const side of [0,1] as Side[])for(const scenario of ['underneath','outside','rim']) {
    test(`physical ${scenario} contact at hoop ${1-side} never scores`,()=>{
        const w=new PhysicsWorld('basketball',[]),b=w.balls[0],target=w.opponentBasket(side);
        const x=target.x+(scenario==='rim'?BASKET.rimHalf:scenario==='outside'?75:0)*(side===0?-1:1);
        w.setPosition(b.body,x,scenario==='underneath'?355:240);
        Matter.Body.setVelocity(b.body,{x:0,y:scenario==='underneath'?-6:3});
        let rimHit=false;
        Matter.Events.on(w.engine,'collisionStart',(e:Matter.IEventCollision<Matter.Engine>)=>{
            rimHit ||= e.pairs.some(pair=>(pair.bodyA===b.body||pair.bodyB===b.body)&&(pair.bodyA.label==='rim'||pair.bodyB.label==='rim'));
        });
        assert.equal(simulate(w,100).winner,null);
        if(scenario==='rim')assert.ok(rimHit,'actually collides with real rim');
        w.destroy();
    });
}
for(const side of [0,1] as Side[])for(const range of ['midcourt','close'])for(const mods of [[],['tiny-ball'],['giant-ball'],['low-gravity'],['high-gravity']]) {
    test(`preferred-charge ${range} shot scores through real hoop ${1-side}, ${mods.join()||'normal'}`,()=>{
        const w=new PhysicsWorld('basketball',mods),p=w.players[side],b=w.balls[0];
        const x=range==='midcourt'?560:side===0?850:270;
        w.setPosition(p.body,x,490);
        w.setPosition(w.players[1-side].body,side===0?300:820,490);
        w.setPosition(b.body,x+(side===0?30:-30),478);assert.ok(w.grabBall(p,b));
        const target=w.opponentBasket(side),charge=preferredCharge(Math.abs(target.x-b.body.position.x));
        b.possession={kind:'charging',owner:side,caughtAt:0,startedAt:-charge*1050};w.releaseBall(b);
        const result=simulate(w);
        assert.equal(result.winner,side);
        assert.ok(result.path.some(pos=>Math.abs(pos.x-target.x)<BASKET.rimHalf+b.radius && pos.y+b.radius<w.goalY && pos.vy>0),'enters mouth from above while descending');
        w.destroy();
    });
}
for(const range of ['midcourt','close'])for(const charge of [.1,.5,1]) {
    test(`${range} low/medium/max charge ${charge} has mirrored physical trajectories`,()=>{
        const traces=[];
        for(const side of [0,1] as Side[]) {
            const w=new PhysicsWorld('basketball',[]),p=w.players[side],b=w.balls[0];
            const x=range==='midcourt'?560:side===0?850:270;
            w.setPosition(p.body,x,490);w.setPosition(w.players[1-side].body,side===0?250:870,490);
            w.setPosition(b.body,x+(side===0?30:-30),478);assert.ok(w.grabBall(p,b));
            b.possession={kind:'charging',owner:side,caughtAt:0,startedAt:-charge*1050};w.releaseBall(b);
            traces.push(simulate(w,90));w.destroy();
        }
        assert.ok(Math.abs(traces[0].path.length-traces[1].path.length)<=2,'contact resolution remains symmetric to within two physics frames');
        for(let i=0;i<20;i++){
            assert.ok(Math.abs(traces[0].path[i].x+traces[1].path[i].x-1120)<.1);
            assert.ok(Math.abs(traces[0].path[i].y-traces[1].path[i].y)<.1);
        }
        assert.equal(traces[0].winner===null,traces[1].winner===null);
    });
}
test('a fast valid depth crossing scores even when the frame endpoint is outside the mouth',()=>{
    for(const side of [0,1] as Side[]) {
        const w=new PhysicsWorld('basketball',[]),b=w.balls[0],x=w.opponentBasket(side).x;
        w.setPosition(b.body,x,275);Matter.Body.setVelocity(b.body,{x:0,y:18});
        w.step([idle,idle]);w.step([idle,idle]);
        // A legal crossing near the edge of the opening; all subsequent motion is Matter-driven.
        w.setPosition(b.body,x+(side===0?18:-18),308);Matter.Body.setVelocity(b.body,{x:side===0?14:-14,y:35});
        assert.equal(w.step([idle,idle]),side);w.destroy();
    }
});
test('an upward crossing beside the mouth does not invalidate a subsequent above-rim entry',()=>{
    for(const side of [0,1] as Side[]) {
        const w=new PhysicsWorld('basketball',[]),b=w.balls[0],x=w.opponentBasket(side).x;
        // Launch just courtward of the front rim, outside the opening.
        w.setPosition(b.body,x+(side===0?-58:58),325);
        Matter.Body.setVelocity(b.body,{x:side===0?5.5:-5.5,y:-15});
        assert.equal(simulate(w,180).winner,side);w.destroy();
    }
});

for(const side of [0,1] as Side[]) test(`CPU on side ${side} collects, charges and physically scores at the opponent hoop`,()=>{
    const w=new PhysicsWorld('basketball',[]),ai=new AIController(3,side,()=>.5),p=w.players[side];
    w.setPosition(w.balls[0].body,p.body.position.x+(side===0?30:-30),p.body.position.y);
    let winner:Side|null=null;
    for(let i=0;i<900;i++){
        winner=w.step(side===0?[ai.update(w),idle]:[idle,ai.update(w)]);
        if(winner!==null)break;
    }
    assert.equal(winner,side);
    assert.ok(w.events.some(e=>e.type==='catch'&&e.side===side));
    assert.ok(w.events.some(e=>e.type==='throw'&&e.side===side));
    w.destroy();
});
