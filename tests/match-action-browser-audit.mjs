async (page) => {
    if (!await page.evaluate(()=>!!window.__matchAudit)) {
        await page.goto('http://localhost:5174');
        await page.waitForFunction(()=>window.__chaos?.phase==='menu');
        await page.setViewportSize({width:1440,height:900});
        await page.locator('[data-mode=quick]').click();
        await page.evaluate(async()=>{
            const {AIController}=await import('/src/systems/AIController.ts');
            window.__matchAudit={mode:'quick',drivers:[new AIController(3,0,()=>.5),new AIController(3,1,()=>.5)],events:[],started:performance.now(),done:[]};
        });
    }
    const start=Date.now();
    const keys=[['a','d','w','s'],['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']];
    while(Date.now()-start<20000) {
        const data=await page.evaluate(()=>{
            const a=window.__matchAudit,s=window.__chaos;
            if(a.world!==s.world) {a.world=s.world;a.drivers.forEach(d=>{d.next=0;d.actionRelease=0;d.input={left:false,right:false,action:false};});}
            const key=JSON.stringify([s.phase,s.match.round,s.match.points,s.match.wins,s.world.sportId]);
            if(a.previous!==key){a.previous=key;a.events.push({phase:s.phase,round:s.match.round,points:[...s.match.points],wins:[...s.match.wins],sport:s.world.sportId,at:Math.round(performance.now()-a.started)});}
            return {mode:a.mode,phase:s.phase,inputs:s.phase==='live'?a.drivers.map(d=>d.update(s.world)):[]};
        });
        if(data.phase==='finished') {
            for(const scheme of keys)for(const k of scheme)await page.keyboard.up(k);
            await page.evaluate(()=>{const a=window.__matchAudit,s=window.__chaos;a.done.push({mode:a.mode,wins:s.match.wins,events:a.events});a.events=[];});
            if(data.mode==='quick') {
                await page.locator('#rematch-button').click();
                await page.clock.runFor(20);
                await page.evaluate(()=>{window.__matchAudit.rematch=true;window.__chaos.showMenu();});
                await page.locator('[data-mode=two]').click();
                await page.evaluate(()=>window.__matchAudit.mode='two');
            } else break;
        }
        for(let side=0;side<(data.mode==='two'?2:1);side++)
            for(const [i,control] of ['left','right','jump','action'].entries()) {
                if(data.inputs[side]?.[control])await page.keyboard.down(keys[side][i]);else await page.keyboard.up(keys[side][i]);
            }
        await page.clock.runFor(70);
    }
    return await page.evaluate(()=>{const a=window.__matchAudit,s=window.__chaos;return {mode:a.mode,phase:s.phase,points:s.match.points,wins:s.match.wins,events:a.events,done:a.done,rematch:a.rematch};});
}
