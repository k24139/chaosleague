async(page) => {
    const results=[],errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost:5174');
    await page.waitForFunction(()=>window.__chaos?.phase==='menu');
    await page.locator('[data-mode=two]').click();
    const setup=async(side,range,mode='two')=>{
        await page.evaluate(async({side,range,mode})=>{
            const s=window.__chaos,{PhysicsWorld}=await import('/src/systems/PhysicsWorld.ts'),{AIController}=await import('/src/systems/AIController.ts');
            s.clean();s.world=new PhysicsWorld('basketball',[]);s.match.mode=mode;s.match.points=[0,0];s.match.wins=[0,0];s.match.roundComplete=false;
            s.ai=new AIController(3,1,()=>.5);s.inputManager.clear();s.inputManager.twoPlayer=mode==='two';s.inputManager.inMatch=true;
            const p=s.world.players[side],x=range==='midcourt'?560:side===0?820:300;
            s.world.setPosition(p.body,x,490);s.world.setPosition(s.world.players[1-side].body,side===0?250:870,490);
            s.world.setPosition(s.world.balls[0].body,x+(side===0?65:-65),510);
            s.arena.build(0);s.phase='live';s.phaseTime=s.accumulator=s.freeze=0;s.paused=false;s.hud.show(true,mode==='two');s.hud.overlay(false);s.hud.hideScore();s.hud.update(s.world,s.match);s.inputManager.enabled=true;
            window.__hoopPath=[];
            clearInterval(window.__hoopTimer);
            window.__hoopTimer=setInterval(()=>{
                const w=s.world,b=w.balls[0];
                window.__hoopPath.push({phase:s.phase,x:b.body.position.x,y:b.body.position.y,vy:b.body.velocity.y,holder:b.holder,kind:b.possession.kind,points:[...s.match.points]});
            },16);
        },{side,range,mode});
    };
    const check=(value,message,details)=>{if(!value)throw new Error(message+': '+JSON.stringify(details));};
    for(const side of [0,1])for(const range of ['midcourt','close']) {
        await setup(side,range);
        const move=side===0?'d':'ArrowLeft',action=side===0?'s':'ArrowDown';
        await page.keyboard.down(move);
        await page.waitForFunction(side=>window.__chaos.world.balls[0].holder===side,side,{timeout:3000});
        await page.keyboard.up(move);await page.waitForTimeout(400);
        const pickup=await page.evaluate(()=>({holder:window.__chaos.world.balls[0].holder,kind:window.__chaos.world.balls[0].possession.kind}));
        check(pickup.holder===side && pickup.kind==='held','automatic pickup without W/Action',pickup);
        const charge=await page.evaluate(async side=>{
            const {preferredCharge}=await import('/src/systems/BasketballPossession.ts'),w=window.__chaos.world;
            return Math.round(preferredCharge(Math.abs(w.opponentBasket(side).x-w.balls[0].body.position.x))*1050);
        },side);
        await page.evaluate(meta=>window.__hoopShot=meta,{side,range,charge});
        await page.keyboard.down(action);await page.waitForTimeout(charge);
        check(await page.evaluate(()=>window.__chaos.world.balls[0].possession.kind==='charging'),'actual Action starts charge');
        await page.keyboard.up(action);
        await page.waitForFunction(side=>window.__chaos.match.points[side]===1,side,{timeout:3500});
        await page.waitForFunction(()=>!document.getElementById('score-overlay').hidden);
        const score=await page.locator('#score-overlay').innerText();
        const path=await page.evaluate(()=>window.__hoopPath);
        check(path.some(p=>p.holder===null&&p.vy>0&&p.y<315 && Math.abs(p.x-(side===0?1026:94))<46),'descending entry above the actual hoop',path.slice(-5));
        await page.screenshot({path:'audit/hoop-p'+(side+1)+'-'+range+'.png'});
        await page.waitForFunction(()=>window.__chaos.phase==='live',null,{timeout:5000});
        const reset=await page.evaluate(()=>({points:window.__chaos.match.points,balls:window.__chaos.world.balls.map(b=>({holder:b.holder,x:b.body.position.x,y:b.body.position.y})),players:window.__chaos.world.players.map(p=>({x:p.body.position.x,y:p.body.position.y}))}));
        check(reset.points[side]===1&&reset.balls.every(b=>b.holder===null),'scoring and clean point reset',reset);
        results.push({side,range,chargeMs:charge,pickup,score,reset,path});
    }
    // The built-in CPU uses the same pickup/charge path, with no keyboard assistance.
    await setup(1,'close','quick');
    await page.waitForFunction(()=>window.__chaos.match.points[1]===1,null,{timeout:12000});
    await page.waitForFunction(()=>!document.getElementById('score-overlay').hidden);
    results.push({cpu:true,side:1,score:await page.locator('#score-overlay').innerText(),path:await page.evaluate(()=>window.__hoopPath)});
    check(results.at(-1).path.some(p=>p.holder===1 && p.kind==='charging'),'CPU automatically collected and charged');
    await page.screenshot({path:'audit/hoop-cpu.png'});
    await page.waitForFunction(()=>window.__chaos.phase==='live',null,{timeout:5000});
    await page.evaluate(()=>clearInterval(window.__hoopTimer));
    check(errors.length===0,'no uncaught browser errors',errors);
    return {results,errors,notes:'Human tests used real movement, S/Down hold/release and real scoring. CPU test used the built-in side-1 AI. Initial positions and round selection were controlled; no ownership, score events or scoring calls were injected.'};
}
