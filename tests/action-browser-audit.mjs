async (page) => {
    const results = [];
    const check = (value, label, details) => { if (!value) throw new Error(label + ': ' + JSON.stringify(details)); results.push(label); };
    const configure = async (sport='basketball', mode='two', mods=[]) => {
        for(const key of ['a','d','w','s','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']) await page.keyboard.up(key);
        await page.evaluate(async ({sport,mode,mods})=>{
            const s=window.__chaos, {PhysicsWorld}=await import('/src/systems/PhysicsWorld.ts'), {AIController}=await import('/src/systems/AIController.ts');
            s.clean(); s.world=new PhysicsWorld(sport,mods,0,[0,1]);s.match.mode=mode;
            s.ai=new AIController(3);s.inputManager.clear();s.inputManager.twoPlayer=mode==='two';s.inputManager.inMatch=true;
            s.arena.build(0);s.phase='live';s.phaseTime=s.accumulator=s.freeze=0;s.paused=false;
            s.hud.show(true,mode==='two');s.hud.overlay(false);s.hud.hideScore();s.hud.update(s.world,s.match);s.inputManager.enabled=true;
            // Let players settle without allowing the initial ball to end a rally.
            for(let i=0;i<30;i++)s.world.step([{left:false,right:false,action:false},{left:false,right:false,action:false}]);
            s.world.events=[];
        },{sport,mode,mods});
    };
    const state = () => page.evaluate(()=>{
        const w=window.__chaos.world;
        return {balls:w.balls.map(b=>({holder:b.holder,kind:b.possession.kind,charge:b.charge(w.elapsed),x:b.body.position.x,y:b.body.position.y,vx:b.body.velocity.x,vy:b.body.velocity.y})),
            players:w.players.map(p=>({x:p.body.position.x,y:p.body.position.y,stun:p.stun,action:p.actionStarted,ready:p.actionReady,airJump:p.airJumpUsed,dash:p.airDashUsed})), elapsed:w.elapsed,events:w.events};
    });
    const pickup = async(side=0,mode='two',mods=[])=>{
        await configure('basketball',mode,mods);
        await page.evaluate(side=>{const w=window.__chaos.world,p=w.players[side],b=w.balls[0];w.setPosition(b.body,p.body.position.x+(side===0?125:-125),515);},side);
        const key=side===0?'d':'ArrowLeft';
        await page.keyboard.down(key);
        await page.waitForFunction(side=>window.__chaos.world.balls[0].holder===side,side,{timeout:3000});
        await page.keyboard.up(key);
        check((await state()).balls[0].holder===side,'automatic horizontal-only pickup P'+(side+1));
    };
    await page.goto('http://localhost:5174');
    await page.waitForFunction(()=>window.__chaos?.phase==='menu');
    await page.locator('[data-mode=two]').click();
    await page.waitForFunction(()=>window.__chaos.phase==='live');
    for(const side of [0,1]) {
        await pickup(side);
        const key=side===0?'s':'ArrowDown';
        await page.keyboard.down(side===0?'w':'ArrowUp');await page.waitForTimeout(100);await page.keyboard.up(side===0?'w':'ArrowUp');
        check((await state()).balls[0].kind==='held','Jump does not charge P'+(side+1));
        await page.keyboard.down(key);await page.waitForTimeout(500);
        check((await state()).balls[0].kind==='charging','Action charge P'+(side+1));
        await page.keyboard.up(key);await page.waitForTimeout(50);
        const shot=(await state()).balls[0];
        check(shot.holder===null && shot.vx*(side===0?1:-1)>0,'release shoots at opponent P'+(side+1),shot);
    }
    await pickup();
    // Actual body collisions cannot release a held basketball.
    await page.evaluate(()=>{const w=window.__chaos.world;w.setPosition(w.players[1].body,w.players[0].body.position.x+85,w.players[0].body.position.y);});
    await page.keyboard.down('ArrowLeft');await page.waitForTimeout(450);await page.keyboard.up('ArrowLeft');
    check((await state()).balls[0].holder===0,'ordinary rival collisions preserve possession');
    // Place defender beside the hand, then use real Action input.
    await page.evaluate(()=>{const w=window.__chaos.world;w.setPosition(w.players[1].body,w.balls[0].body.position.x+45,w.players[0].body.position.y);w.players[1].facing=-1;});
    await page.keyboard.down('ArrowDown');
    await page.waitForFunction(()=>window.__chaos.world.players[0].stun>0,null,{timeout:2000});
    let blocked=await state();
    check(blocked.balls[0].holder===null && blocked.players[0].stun>900,'block releases ball and applies one-second dizzy',blocked);
    await page.keyboard.up('ArrowDown');
    await page.keyboard.down('a');await page.keyboard.down('w');await page.keyboard.down('s');
    await page.keyboard.press('Escape');let paused=await state();await page.waitForTimeout(1100);
    check((await state()).players[0].stun===paused.players[0].stun,'pause suspends dizzy timer');
    await page.keyboard.up('a');await page.keyboard.up('w');await page.keyboard.up('s');
    await page.locator('#resume-button').click();await page.waitForTimeout(1100);
    check((await state()).players[0].stun===0,'dizzy visibly recovers after resume');

    await pickup(0,'two',['moving-goals','double-ball']);
    await page.keyboard.down('s');await page.waitForTimeout(1300);
    let max=await state();check(max.balls[0].holder===0 && max.balls[0].charge===1,'maximum charge holds without autofire with Moving Goals / Double Ball',max);
    await page.keyboard.up('s');await page.waitForTimeout(70);
    check((await state()).balls[0].vx>0,'Moving Goals / Double Ball release shoots forward');

    await configure('basketball','quick');
    await page.evaluate(()=>{const w=window.__chaos.world;w.setPosition(w.balls[0].body,690,515);});
    await page.waitForFunction(()=>window.__chaos.world.balls[0].holder===1,null,{timeout:4000});
    check(true,'CPU automatically collects by contact');
    // Prevent the offense releasing while testing repeated body collisions.
    await page.evaluate(()=>{window.__chaos.ai.next=Infinity;window.__chaos.ai.input={left:false,right:false,action:false};const w=window.__chaos.world;w.setPosition(w.players[0].body,w.players[1].body.position.x-70,w.players[1].body.position.y);});
    await page.keyboard.down('d');await page.waitForTimeout(400);await page.keyboard.up('d');
    check((await state()).balls[0].holder===1,'ordinary human collision preserves CPU possession');
    await page.evaluate(()=>window.__chaos.ai.next=0);
    await page.waitForFunction(()=>window.__chaos.world.balls[0].possession.kind==='released' && window.__chaos.world.balls[0].body.velocity.x<0,null,{timeout:4000});
    check(true,'CPU charges and releases toward human basket');

    await pickup(0,'quick');
    await page.evaluate(()=>{const s=window.__chaos,w=s.world;s.ai.next=0;w.setPosition(w.players[1].body,w.balls[0].body.position.x+50,w.players[0].body.position.y);w.players[1].facing=-1;});
    await page.waitForFunction(()=>window.__chaos.world.players[0].stun>0,null,{timeout:3000});
    check((await state()).balls[0].holder===null,'CPU Action block stuns human and releases possession');

    await configure('basketball');
    await page.keyboard.down('s');await page.waitForTimeout(100);
    await page.evaluate(async()=>{const w=window.__chaos.world,p=w.players[0],b=w.balls[0],Matter=(await import('/node_modules/.vite/deps/matter-js.js')).default;w.setPosition(b.body,p.body.position.x+60,p.body.position.y-16);Matter.Body.setVelocity(b.body,{x:-10,y:0});});
    await page.waitForTimeout(50);
    const deflected=await state();
    check(deflected.balls[0].holder===null && deflected.balls[0].vx>0 && deflected.players.every(p=>p.stun===0),'in-flight Action block deflects without stunning');
    await page.keyboard.up('s');
    for(const sport of ['soccer' ,'volleyball','knockout']) {
        await configure(sport);
        if(sport==='volleyball') {
            await page.evaluate(()=>window.__chaos.world.setPosition(window.__chaos.world.balls[0].body,850,80));
            await page.keyboard.press('w');await page.waitForTimeout(160);await page.keyboard.down('s');await page.waitForTimeout(60);
            check((await state()).players[0].airJump,'Volleyball Action double jump');
            await page.keyboard.up('s');
        } else {
            await page.keyboard.down('a');await page.keyboard.down('s');await page.waitForTimeout(70);
            const st=await state();check(st.players[0].action>0 && st.players[0].x<300,sport+' Action moves in requested direction',st);
            await page.keyboard.up('a');await page.keyboard.up('s');
        }
    }
    await page.evaluate(()=>window.__chaos.showMenu());
    await page.locator('[data-mode=cup]').click();await page.locator('#cup-enter').click();await page.waitForFunction(()=>window.__chaos.phase==='live');
    await page.waitForTimeout(350);
    if(await page.evaluate(()=>window.__chaos.world.sportId==='volleyball')) { await page.keyboard.press('w'); await page.waitForTimeout(100); }
    await page.keyboard.down('s');await page.waitForTimeout(120);await page.keyboard.up('s');
    check(await page.evaluate(()=>window.__chaos.match.mode==='cup' && window.__chaos.world.players[0].actionStarted>0),'Chaos Cup entry and live Action');
    for(const sport of ['basketball','soccer','volleyball','knockout']) {
        await configure(sport,'cup');
        if(sport==='volleyball') {
            await page.evaluate(()=>window.__chaos.world.setPosition(window.__chaos.world.balls[0].body,850,80));
            await page.keyboard.press('w');await page.waitForTimeout(100);
        }
        await page.keyboard.down('s');await page.waitForTimeout(90);await page.keyboard.up('s');
        check(await page.evaluate(()=>window.__chaos.world.players[0].actionStarted>0),'Cup '+sport+' Action uses shared rules');
    }
    const sizes=[];
    for(const [width,height] of [[1920,1080],[1440,900],[1024,768],[844,390],[667,375]]) {
        await page.setViewportSize({width,height});await page.waitForTimeout(100);
        const fit=await page.evaluate(()=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,canvas:!!document.querySelector('canvas')}));
        check(!fit.overflow && fit.canvas,'responsive '+width+'x'+height,fit);sizes.push(fit);
    }
    // Native multi-touch via Chrome DevTools, not synthetic pointer dispatch.
    await configure('basketball');
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    await page.addStyleTag({content:'.touch-controls{display:flex!important}'});
    const boxes=await Promise.all(['left','action'].map(control=>page.locator('[data-side="0"][data-control="'+control+'"]').boundingBox()));
    const points=boxes.map((b,i)=>({x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2),id:i+1}));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
    await page.waitForTimeout(80);
    const multi=await page.evaluate(()=>({touches:window.__chaos.inputManager.touches.size,inputs:window.__chaos.inputManager.get(0)}));
    check(multi.touches===2 && multi.inputs.left && multi.inputs.action,'native simultaneous touch movement + Action',multi);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(60);
    check(await page.evaluate(()=>window.__chaos.inputManager.touches.size===0),'native touch release clears Action');
    await page.evaluate(()=>{const w=window.__chaos.world,p=w.players[0];w.setPosition(w.balls[0].body,p.body.position.x+30,p.body.position.y-10);});
    await page.waitForFunction(()=>window.__chaos.world.balls[0].holder===0);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
    await page.waitForTimeout(500);
    check((await state()).balls[0].kind==='charging','native touch hold charges while moving');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(50);
    check((await state()).balls[0].holder===null,'native touch release shoots');
    await cdp.detach();
    await page.screenshot({path:'audit/actions-mobile.png'});
    return {results,sizes};
}
