import assert from 'node:assert/strict';

const ROOT=process.env.CHAOS_QA_URL ?? 'http://localhost:5175';
export async function configure(page,{sport='basketball',mods=[],mode='two',points=[0,0],wins=[0,0]}={}) {
    await page.evaluate(async({sport,mods,mode,points,wins})=>{
        const s=window.__chaos, {PhysicsWorld}=await import('/src/systems/PhysicsWorld.ts');
        s.clean();s.world=new PhysicsWorld(sport,mods,10,[0,1]);s.arena.build(10);
        s.match.mode=mode;s.match.points=points;s.match.wins=wins;
        s.phase='live';s.phaseTime=0;s.accumulator=0;s.freeze=0;s.paused=false;
        s.inputManager.twoPlayer=mode==='two';s.inputManager.inMatch=true;s.inputManager.enabled=true;s.inputManager.clear();
        s.hud.show(true,mode==='two');s.hud.overlay(false);s.hud.hideScore();s.hud.update(s.world,s.match);
        document.getElementById('pause-overlay').hidden=true;
        document.getElementById('results').hidden=true;
        document.getElementById('bracket-overlay').hidden=true;
        document.getElementById('game-shell').classList.remove('paused','bracketing');
        s.arena.draw(s.world,0);s.entities.draw(s.world,0);
        window.__throws=[];const original=s.world.releaseBall.bind(s.world);
        s.world.releaseBall=(ball,shoot=true)=>{const side=ball.holder,charge=ball.charge(s.world.elapsed),from={...ball.body.position},target=side===null?null:s.world.opponentBasket(side);original(ball,shoot);if(side!==null)window.__throws.push({side,shoot,charge,from,target,velocity:{...ball.body.velocity},holder:ball.holder,state:ball.possession.kind});};
    },{sport,mods,mode,points,wins});
}
async function shot(page,path){await page.screenshot({path,animations:'disabled'});}
async function ready(page){await page.goto(ROOT);await page.waitForFunction(()=>window.__chaos?.phase==='menu');}
const visibleBounds=async(page,selector)=>page.locator(selector).evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {id:n.id,x:r.x,y:r.y,w:r.width,h:r.height,scrollW:n.scrollWidth,clientW:n.clientWidth};}));
function within(box,w,h){assert.ok(box.x>=-1&&box.y>=-1&&box.x+box.w<=w+1&&box.y+box.h<=h+1,`bounds ${JSON.stringify(box)} in ${w}x${h}`);}
export async function screenshots(page,dir){
    const report=[];await ready(page);
    for(const [width,height] of [[1920,1080],[1440,900],[1024,768],[844,390],[667,375]]){
        await page.setViewportSize({width,height});
        for(const mode of ['quick','two']){
            await page.evaluate(()=>window.__chaos.showMenu());await page.locator(`[data-mode=${mode}]`).click();
            await configure(page,{mode,points:[2,1],wins:[1,0]});
            await page.evaluate(()=>{const s=window.__chaos;s.paused=true;s.inputManager.enabled=false;});
            const score=(await visibleBounds(page,'#scoreboard'))[0];within(score,width,height);
            assert.ok(Math.abs(score.x+score.w/2-width/2)<1,'points centered on viewport');
            const corners=await visibleBounds(page,'.score-team');assert.equal(corners[0].y,corners[1].y);assert.equal(corners[0].h,corners[1].h);
            assert.ok(corners[0].x+corners[0].w<score.x);assert.ok(corners[1].x>score.x+score.w);
            for(const box of await visibleBounds(page,'#hud .score-team,#hud .hud-info,.game-utility,#hud .hud-right'))within(box,width,height);
            assert.equal(await page.locator('#score-0').textContent(),'2');assert.equal(await page.locator('#wins-0').textContent(),'1');
            await shot(page,`${dir}/quick-${width}.png`.replace('quick-',`${mode}-`));
            // Name length and score changes must not move the central score.
            const stable=await page.evaluate(()=>{const n=document.getElementById('name-1');n.textContent='Extraordinarily Long Rival Name';return document.getElementById('scoreboard').getBoundingClientRect().x;});
            assert.equal(stable,score.x);
            for(let n=0;n<=3;n++)await page.evaluate(n=>{const s=window.__chaos;s.match.points=[n,3-n];s.hud.update(s.world,s.match);},n);
            assert.equal((await visibleBounds(page,'#scoreboard'))[0].x,score.x);
        }
        await page.evaluate(()=>{window.__chaos.paused=false;});await page.keyboard.press('Escape');
        assert.equal(await page.locator('#pause-overlay').isVisible(),true);
        const elapsed=await page.evaluate(()=>window.__chaos.world.elapsed);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>window.__chaos.world.elapsed),elapsed);
        const pause=(await visibleBounds(page,'.dialog-card'))[0];within(pause,width,height);assert.ok(pause.w<=520);
        for(const b of await visibleBounds(page,'.dialog-card button')){within(b,width,height);assert.ok(b.h>=44);}
        await page.keyboard.press('Tab');assert.equal(await page.locator('#restart-button').evaluate(n=>n===document.activeElement),true);
        await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('#resume-button').evaluate(n=>n===document.activeElement),true);
        await shot(page,`${dir}/pause-${width}.png`);
        await page.locator('#resume-button').click();assert.equal(await page.evaluate(()=>window.__chaos.paused),false);
        await page.keyboard.press('Escape');await page.locator('#restart-button').click();assert.equal(await page.evaluate(()=>window.__chaos.phase),'intro');
        await page.keyboard.press('Escape');await page.locator('#quit-button').click();assert.equal(await page.evaluate(()=>window.__chaos.phase),'menu');
        await page.locator('[data-mode=quick]').click();await configure(page,{mode:'quick'});
        await page.evaluate(()=>{const s=window.__chaos;s.match.wins=[3,2];s.phase='finished';s.inputManager.enabled=false;s.hud.result(s.world,s.match,0);});
        for(const b of await visibleBounds(page,'.results-copy,#result-title,#result-score,.result-actions button'))within(b,width,height);
        assert.equal(await page.locator('#hud').isVisible(),false);assert.equal(await page.locator('#touch').isVisible(),false);
        await shot(page,`${dir}/results-${width}.png`);
        await page.keyboard.press('Tab');assert.equal(await page.locator('#result-menu').evaluate(n=>n===document.activeElement),true);
        await page.keyboard.press('Shift+Tab');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.__chaos.phase),'intro');
        await page.evaluate(()=>window.__chaos.showMenu());await page.locator('[data-mode=cup]').click();
        const start=(await visibleBounds(page,'#cup-enter'))[0];assert.ok(Math.abs(start.x+start.w/2-width/2)<1,'Start Cup centered');
        for(const b of await visibleBounds(page,'.bracket-header,#bracket,.bracket-footer,.cup-actions button'))within(b,width,height);
        const bracket=(await visibleBounds(page,'#bracket'))[0],footer=(await visibleBounds(page,'.bracket-footer'))[0];assert.ok(bracket.y+bracket.h<=footer.y+1);
        assert.equal(await page.locator('#cup-menu').evaluate(n=>n.tagName),'BUTTON');
        await shot(page,`${dir}/cup-${width}.png`);
        await page.keyboard.press('Tab');assert.equal(await page.locator('#cup-menu').evaluate(n=>n===document.activeElement),true);
        await page.keyboard.press('Shift+Tab');await page.keyboard.press(width===667?'Space':'Enter');
        await page.waitForFunction(()=>window.__chaos.phase==='intro');
        await page.evaluate(()=>window.__chaos.showMenu());
        report.push({width,height,screens:['quick','two','pause','results','cup'],bounds:'pass',actions:'pass'});
    }
    // Shared native dialogs, reduced motion and a 200%-zoom-equivalent CSS viewport.
    await page.setViewportSize({width:720,height:450});
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const [open,id] of [['how-button','how-dialog'],['settings-button','settings-dialog']]){
        await page.locator(`#${open}`).click();assert.equal(await page.locator(`#${id}`).isVisible(),true);
        within((await visibleBounds(page,`#${id}`))[0],720,450);await shot(page,`${dir}/${id}-720.png`);await page.keyboard.press('Escape');
    }
    await page.emulateMedia({reducedMotion:'no-preference'});
    return report;
}
async function placeForCatch(page,side,ball=0){
    await page.evaluate(({side,ball})=>{const w=window.__chaos.world,p=w.players[side];w.setPosition(w.balls[ball].body,p.body.position.x+(side===0?38:-38),p.body.position.y-10);w.setPosition(w.players[1-side].body,side===0?900:220,490);}, {side,ball});
}
async function releaseCase(page,{side=0,duration=500,mods=[],away=false,jump=false}={}){
    await configure(page,{mods});await page.waitForTimeout(200);await placeForCatch(page,side);
    const key=side===0?'w':'ArrowUp',movement=side===0?'a':'ArrowRight';
    if(away)await page.keyboard.down(movement);
    await page.keyboard.down(key);
    await page.waitForFunction(side=>window.__chaos.world.balls[0].holder===side,side);
    const jumped=await page.evaluate(side=>window.__chaos.world.players[side].body.velocity.y<0,side);
    await page.waitForTimeout(duration);
    const holding=await page.evaluate(({side})=>{const w=window.__chaos.world;return {charge:w.balls[0].charge(w.elapsed),holder:w.balls[0].holder,jump:w.players[side].body.velocity.y};},{side});
    assert.equal(holding.holder,side);if(duration>=1200)assert.equal(holding.charge,1);
    await page.keyboard.up(key);await page.waitForFunction(()=>window.__throws.some(e=>e.shoot));
    if(away)await page.keyboard.up(movement);
    const result=await page.evaluate(()=>window.__throws.find(e=>e.shoot));assert.equal(result.holder,null);assert.equal(result.state,'released');
    assert.ok(result.velocity.x*(result.target.x-result.from.x)>0,JSON.stringify(result));
    const recatch=await page.evaluate(side=>{const w=window.__chaos.world,b=w.balls[0],p=w.players[side];w.setPosition(b.body,p.body.position.x+38*(side===0?1:-1),p.body.position.y-10);return w.grabBall(p,b);},side);
    assert.equal(recatch,false);
    return {side,duration,mods,away,jumped,charge:result.charge,velocity:result.velocity};
}
export async function basketball(page,dir){
    await ready(page);await page.setViewportSize({width:1440,height:900});await page.locator('[data-mode=two]').click();
    const cases=[];
    for(const side of [0,1])for(const duration of [50,500,1250])cases.push(await releaseCase(page,{side,duration}));
    for(const side of [0,1])cases.push(await releaseCase(page,{side,duration:500,away:true}));
    for(const mod of ['moving-goals','giant-ball','tiny-ball','double-ball','low-gravity','high-gravity','super-bounce','speed-boost','giant-players','tiny-players','strong-wind','ice-floor'])cases.push(await releaseCase(page,{mods:[mod],duration:500}));
    await configure(page);await page.waitForTimeout(200);await placeForCatch(page,0);await page.keyboard.down('w');await page.waitForTimeout(500);
    await shot(page,`${dir}/basketball-charge.png`);
    await page.keyboard.press('Escape');const charge=await page.evaluate(()=>window.__chaos.world.balls[0].charge(window.__chaos.world.elapsed));
    await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.__chaos.world.balls[0].charge(window.__chaos.world.elapsed)),charge);
    await page.keyboard.up('w');await page.locator('#resume-button').click();await page.waitForFunction(()=>window.__throws.some(e=>e.shoot));
    await configure(page);await placeForCatch(page,0);await page.keyboard.down('w');await page.waitForTimeout(100);
    await page.evaluate(async()=>{const {default:Matter}=await import('/node_modules/.vite/deps/matter-js.js');const w=window.__chaos.world,p=w.players[0],enemy=w.players[1];w.setPosition(enemy.body,p.body.position.x+46,p.body.position.y);Matter.Body.setVelocity(enemy.body,{x:-9,y:0});});
    await page.waitForFunction(()=>window.__chaos.world.balls[0].holder===null);await page.keyboard.up('w');
    await configure(page);for(let i=0;i<8;i++){await placeForCatch(page,0);await page.keyboard.down('w');await page.waitForTimeout(40);await page.keyboard.up('w');await page.waitForTimeout(280);}
    assert.equal(await page.evaluate(()=>window.__chaos.world.balls[0].holder),null);
    await configure(page,{mods:['double-ball']});await placeForCatch(page,0);await placeForCatch(page,1,1);
    // placeForCatch moves the other player, so put both balls near their final players together.
    await page.evaluate(()=>{const w=window.__chaos.world;w.players.forEach((p,i)=>w.setPosition(w.balls[i].body,p.body.position.x+(i===0?38:-38),p.body.position.y-10));});
    await page.keyboard.down('w');await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>window.__chaos.world.balls[0].holder===0&&window.__chaos.world.balls[1].holder===1);
    await page.keyboard.up('w');await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>window.__chaos.world.balls[1].holder),1);await page.keyboard.up('ArrowUp');
    // Score through the detector while the other basketball is held.
    await configure(page,{mods:['double-ball']});await placeForCatch(page,1,1);await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>window.__chaos.world.balls[1].holder===1);
    await page.evaluate(async()=>{const {default:Matter}=await import('/node_modules/.vite/deps/matter-js.js');const w=window.__chaos.world,b=w.balls[0];w.setPosition(b.body,1026,280);b.previous={x:1026,y:270};Matter.Body.setVelocity(b.body,{x:0,y:2});w.sport.check(w);w.setPosition(b.body,1026,309);Matter.Body.setVelocity(b.body,{x:0,y:20});});
    await page.waitForFunction(()=>window.__chaos.phase==='point');assert.equal(await page.evaluate(()=>window.__chaos.world.balls.every(b=>b.holder===null)),true);await page.keyboard.up('ArrowUp');
    await page.waitForFunction(()=>window.__chaos.phase==='live');assert.equal(await page.evaluate(()=>window.__chaos.world.balls.every(b=>b.possession.kind==='free')),true);
    await configure(page,{mode:'quick'});await page.evaluate(async()=>{const {AIController}=await import('/src/systems/AIController.ts');window.__chaos.ai=new AIController(3);});await placeForCatch(page,0);await page.keyboard.down('w');await page.waitForFunction(()=>window.__chaos.world.balls[0].holder===0);
    const cpuBefore=await page.evaluate(()=>window.__chaos.world.players[1].body.position.x);await page.waitForTimeout(300);assert.ok(await page.evaluate(before=>window.__chaos.world.players[1].body.position.x<before,cpuBefore));await page.keyboard.up('w');
    return {cases,extra:['jump on charge press','no instant self-recatch','pause while charging, release during pause, resume','strong contact dislodges','8 rapid press/release cycles','Double Ball independent local input','point detector clears held second ball; next play starts free','CPU pursues opposing holder']};
}
export async function extras(page,dir){
    await ready(page);await page.setViewportSize({width:1440,height:900});
    const main=page.locator('[data-mode=quick]');
    const normal=await main.evaluate(n=>({bg:getComputedStyle(n).backgroundColor,h:n.getBoundingClientRect().height,r:getComputedStyle(n).borderRadius}));
    await main.hover();await page.waitForTimeout(200);const hover=await main.evaluate(n=>getComputedStyle(n).backgroundColor);assert.notEqual(hover,normal.bg);
    await page.mouse.down();await page.waitForTimeout(200);const pressed=await main.evaluate(n=>getComputedStyle(n).backgroundColor);assert.notEqual(pressed,hover);await page.mouse.move(1000,800);await page.mouse.up();
    await main.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.match(await main.evaluate(n=>getComputedStyle(n).outlineColor),/41, 217, 255/);
    await page.locator('#fullscreen').click();await page.waitForFunction(()=>Boolean(document.fullscreenElement));await page.locator('#fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
    await page.locator('[data-mode=cup]').click();await page.locator('#cup-enter').click();assert.equal(await page.locator('#cup-enter').isDisabled(),true);
    await page.evaluate(()=>window.__chaos.showMenu());
    const context=await page.context().browser().newContext({viewport:{width:667,height:375},hasTouch:true});const touch=await context.newPage(),touchErrors=[],touchWarnings=[];
    touch.on('pageerror',e=>touchErrors.push(e.message));touch.on('console',m=>{if(m.type()==='error')touchErrors.push(m.text());if(m.type()==='warning')touchWarnings.push(m.text());});
    try{
        await ready(touch);await touch.locator('[data-mode=two]').tap();await configure(touch,{mods:['double-ball']});await touch.waitForTimeout(250);
        await touch.evaluate(()=>{const w=window.__chaos.world;w.players.forEach((p,i)=>w.setPosition(w.balls[i].body,p.body.position.x+(i===0?38:-38),p.body.position.y-10));});
        const targets=await touch.locator('[data-control=action]').evaluateAll(nodes=>nodes.map((n,i)=>{const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id:i+1};}));
        const session=await context.newCDPSession(touch);
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:targets});await touch.waitForFunction(()=>window.__chaos.world.balls[0].holder===0&&window.__chaos.world.balls[1].holder===1);await touch.waitForTimeout(400);
        await shot(touch,`${dir}/touch-charge-667.png`);
        await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[targets[1]]});await touch.waitForTimeout(60);
        assert.equal(await touch.evaluate(()=>window.__chaos.world.balls[1].holder),1);
        await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.waitForFunction(()=>window.__throws.filter(e=>e.shoot).length===2);
        const throws=await touch.evaluate(()=>window.__throws);assert.ok(throws.find(e=>e.side===0).velocity.x>0);assert.ok(throws.find(e=>e.side===1).velocity.x<0);
        const before=await touch.evaluate(()=>window.__chaos.world.players.map(p=>p.body.position.x));
        const moves=await touch.locator('[data-side="0"][data-control=right],[data-side="1"][data-control=left]').evaluateAll(nodes=>nodes.map((n,i)=>{const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id:i+1};}));
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:moves});await touch.waitForTimeout(250);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        const after=await touch.evaluate(()=>window.__chaos.world.players.map(p=>p.body.position.x));assert.ok(after[0]>before[0]);assert.ok(after[1]<before[1]);
        await touch.locator('#pause-button').tap();await shot(touch,`${dir}/touch-pause-667.png`);await touch.locator('#resume-button').tap();
        await touch.locator('#pause-button').tap();await touch.locator('#quit-button').tap();await touch.locator('[data-mode=cup]').tap();await shot(touch,`${dir}/touch-cup-667.png`);await touch.locator('#cup-menu').tap();
        assert.deepEqual(touchErrors,[]);assert.deepEqual(touchWarnings,[]);
        return {touchErrors,touchWarnings,buttonStates:'default, hover, active, focus-visible, disabled',fullscreen:'enter and exit',touch:'independent two-player move, catch, charge, release, pause/resume, Cup menu',before,after};
    }finally{await context.close();}
}
