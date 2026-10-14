import assert from 'node:assert/strict';

export async function configure(page, sport = 'knockout', theme = 7) {
    await page.evaluate(async ({sport,theme}) => {
        const s=window.__chaos;
        const {PhysicsWorld}=await import('/src/systems/PhysicsWorld.ts');
        s.clean(); s.world=new PhysicsWorld(sport,[],theme,[0,1]);
        s.arena.build(theme); s.phase='live'; s.phaseTime=0; s.accumulator=0; s.freeze=0;
        s.paused=false; s.inputManager.enabled=true; s.hud.overlay(false); s.hud.hideScore();
        document.getElementById('results').hidden=true;
        document.getElementById('hud').hidden=false; s.hud.update(s.world,s.match); s.hud.timer(35);
    },{sport,theme});
}
async function physicalPoint(page,side) {
    await page.waitForFunction(()=>window.__chaos.phase==='live');
    await page.evaluate(side=>{
        const s=window.__chaos;
        s.world.setPosition(s.world.players[1-side].body,100,710);
    },side);
    await page.waitForFunction(()=>window.__chaos.phase==='point');
    await page.waitForFunction(()=>!document.getElementById('score-overlay').hidden);
}
export async function flow(page) {
    await page.goto('http://localhost:5174');
    await page.waitForFunction(()=>window.__chaos?.phase==='menu');
    await page.evaluate(()=>{
        window.__cues=[];
        new MutationObserver(()=>{
            const node=document.getElementById('round-overlay');
            const key=node.dataset.step+':'+document.getElementById('countdown').textContent;
            if(window.__cues.at(-1)?.key!==key)window.__cues.push({key,time:performance.now()});
        }).observe(document.getElementById('round-overlay'),{subtree:true,childList:true,attributes:true});
    });
    await page.locator('[data-mode=quick]').click();
    const intro=await page.locator('#round-overlay').innerText();
    assert.match(intro,/KNOCKOUT|BASKETBALL|SOCCER|VOLLEYBALL/);
    assert.ok(intro.split('\n').length>=2,'mode and map visible together');
    await page.waitForFunction(()=>window.__chaos.phase==='live');
    const cues=await page.evaluate(()=>window.__cues);
    for(const count of ['3','2','1']){
        const i=cues.findIndex(c=>c.key==='count:'+count);
        assert.ok(i>=0); const duration=cues[i+1].time-cues[i].time;
        assert.ok(duration>900&&duration<1250,`${count} lasts ${duration}ms`);
    }
    assert.ok(cues.findIndex(c=>c.key==='chaos:')>cues.findIndex(c=>c.key==='arena:'));
    await configure(page);
    const points=[];
    for(const side of [0,1,0,1]) {
        await physicalPoint(page,side);
        points.push(await page.locator('#score-overlay').innerText());
        await page.waitForFunction(()=>window.__chaos.phase==='live');
        assert.equal(await page.locator('#score-overlay').isVisible(),false);
        assert.equal(await page.evaluate(()=>window.__chaos.match.round),1);
        assert.equal(await page.evaluate(()=>window.__chaos.world.arenaIndex),7);
    }
    assert.match(await page.locator('#objective').innerText(),/ROUND POINT/);
    await physicalPoint(page,0);
    assert.match(await page.locator('#score-eyebrow').innerText(),/Round secured/i);
    await page.waitForFunction(()=>window.__chaos.phase==='transition');
    assert.equal(await page.locator('#arena-wipe').isVisible(),true);
    await page.waitForFunction(()=>window.__chaos.phase==='intro');
    assert.equal(await page.locator('#arena-wipe').isVisible(),false);
    assert.deepEqual(await page.evaluate(()=>window.__chaos.match.points),[0,0]);
    assert.deepEqual(await page.evaluate(()=>window.__chaos.match.wins),[1,0]);
    assert.notEqual(await page.evaluate(()=>window.__chaos.world.arenaIndex),7);
    return {intro,cues,points,after:await page.locator('#hud').innerText()};
}

// Normal-clock matches driven through actual keyboard events and real scoring detectors.
// Both sides may receive keyboard assistance in local mode. No score injection.
export async function playMatch(page, mode='quick', budget=210000, url='http://localhost:5174', onProgress=()=>{}) {
    await page.goto(url);
    await page.waitForFunction(()=>window.__chaos?.phase==='menu');
    await page.locator(`[data-mode=${mode}]`).click();
    if(mode==='cup') await page.locator('#cup-enter').click();
    await page.evaluate(async()=>{
        const {AIController}=await import('/src/systems/AIController.ts');
        window.__drivers=[new AIController(3,0),new AIController(3,1)];
    });
    const held=new Set(), keys=[['a','d','w'],['ArrowLeft','ArrowRight','ArrowUp']];
    const events=[], started=Date.now(); let prior='';
    while(Date.now()-started<budget) {
        const state=await page.evaluate(()=>{
            const s=window.__chaos;
            if(window.__driverWorld!==s.world) {
                window.__driverWorld=s.world;
                window.__drivers.forEach(a=>{a.next=0;a.actionRelease=0;a.input={left:false,right:false,action:false};});
            }
            return {phase:s.phase,round:s.match.round,points:s.match.points,wins:s.match.wins,sport:s.world.sportId,
                inputs:s.phase==='live'?window.__drivers.map(a=>a.update(s.world)):[]};
        });
        const key=JSON.stringify([state.phase,state.round,state.points,state.wins]);
        if(key!==prior){const event={...state,inputs:undefined,at:Date.now()-started};events.push(event);onProgress(event);prior=key;}
        if(state.phase==='finished'||mode==='cup'&&state.phase==='bracket'&&state.wins.some(w=>w>=3))break;
        for(let side=0;side<(mode==='two'?2:1);side++) {
            for(const [i,action] of ['left','right','action'].entries()) {
                const k=keys[side][i], down=state.inputs[side]?.[action]??false;
                if(down&&!held.has(k)){await page.keyboard.down(k);held.add(k);}
                if(!down&&held.has(k)){await page.keyboard.up(k);held.delete(k);}
            }
        }
        await page.waitForTimeout(70);
    }
    for(const k of held)await page.keyboard.up(k);
    const final=await page.evaluate(()=>({phase:window.__chaos.phase,wins:window.__chaos.match.wins}));
    assert.ok(final.wins.some(w=>w===3),`match completed: ${JSON.stringify(final)}`);
    return {mode,elapsed:Date.now()-started,events,final};
}

export async function themes(page, width=1280, height=800) {
    await page.setViewportSize({width,height});
    const names=await page.evaluate(async()=>(await import('/src/config/themes.ts')).THEMES.map(t=>t.name));
    const shots=[];
    for(let theme=0;theme<names.length;theme++) {
        await configure(page,['basketball','soccer','volleyball','knockout'][theme%4],theme);
        await page.keyboard.down('d'); await page.waitForTimeout(300); await page.keyboard.up('d');
        const data=(await page.screenshot({type:'jpeg',quality:75})).toString('base64');
        shots.push({name:names[theme],data});
    }
    await page.setViewportSize({width:1600,height:Math.ceil(6*(390*height/width+38)+24)});
    await page.evaluate(({shots,width,height})=>{
        const sheet=document.createElement('div'); sheet.id='audit-sheet';
        sheet.style.cssText='position:fixed;inset:0;z-index:999;background:#050507;padding:12px;display:grid;grid-template-columns:repeat(4,1fr);align-content:start;gap:10px;color:white;overflow:auto';
        for(const shot of shots){const item=document.createElement('div');const title=document.createElement('p');title.style.margin='4px 0';title.textContent=shot.name+' · '+width+'×'+height;const img=new Image();img.style.width='100%';img.src='data:image/jpeg;base64,'+shot.data;item.append(title,img);sheet.append(item);}
        document.body.append(sheet);
    },{shots,width,height});
    return {width,height,themes:names};
}

export async function responsive(page) {
    const checks=[];
    for(const [width,height] of [[1920,1080],[1440,900],[1280,800],[1024,768],[844,390],[667,375]]) {
        await page.setViewportSize({width,height}); await configure(page,'knockout',11);
        for(const cue of [0,950,1650,2650,3650,4650]) {
            await page.evaluate(cue=>{const s=window.__chaos;s.phase='intro';s.phaseTime=cue;s.paused=true;s.hud.resetIntro();s.hud.intro(s.world,s.match,cue);},cue);
            await page.waitForTimeout(260);
            const bounds=await page.evaluate(()=>['round-title','round-subtitle','countdown'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return {id,text:e.textContent,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,visible:getComputedStyle(e).display!=='none',overflow:e.scrollWidth>e.clientWidth+2};}));
            for(const b of bounds)if(b.text&&b.visible){assert.ok(b.left>=0&&b.right<=width+1&&b.top>=0&&b.bottom<=height+1,JSON.stringify({width,height,b}));assert.ok(!b.overflow,'intro text fits');}
        }
        await page.evaluate(()=>{const s=window.__chaos;s.hud.overlay(false);s.match.points=[2,2];s.hud.update(s.world,s.match);s.hud.celebrate(s.world,s.match,1);});
        await page.waitForTimeout(300);
        const score=await page.locator('#score-title').boundingBox(); assert.ok(score.x>=0&&score.x+score.width<=width);
        await page.evaluate(()=>{const s=window.__chaos;s.hud.hideScore();s.match.wins=[3,2];s.hud.result(s.world,s.match,0);});
        const result=await page.locator('.results-copy').boundingBox();
        assert.ok(result.y>=0&&result.y+result.height<=height+1,'result stays inside viewport');
        for(const id of ['rematch-button','result-menu']) {
            const box=await page.locator('#'+id).boundingBox(); assert.ok(box.height>=44&&box.width<width/2,'normal sized accessible result action');
        }
        await page.screenshot({path:`/Users/aaron/Documents/chaos-league/audit/results-${width}.png`});
        checks.push({width,height,result,score});
        await page.evaluate(()=>{const s=window.__chaos;document.getElementById('results').hidden=true;s.paused=false;s.phase='live';});
    }
    return checks;
}
