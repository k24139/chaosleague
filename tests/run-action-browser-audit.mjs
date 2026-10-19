// Optional Playwright dependency: use an installed package or PLAYWRIGHT_MODULE.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const root=fileURLToPath(new URL('../',import.meta.url));
const readAudit=async name=>Function('return ('+await fs.readFile(new URL(name,import.meta.url),'utf8')+')')();
const errors=[];
try {
    const focused=await browser.newPage({hasTouch:true,viewport:{width:1440,height:900}});
    focused.on('pageerror',e=>errors.push(e.message));
    const focusedResult=await (await readAudit('action-browser-audit.mjs'))(focused);
    await fs.writeFile(root+'audit/action-browser-results.json',JSON.stringify(focusedResult,null,2)+'\n');
    console.log('Focused browser checks:',focusedResult.results.length);
    await focused.close();
    if(!process.argv.includes('--focused')) {
        const page=await browser.newPage({viewport:{width:1440,height:900}});
        page.on('pageerror',e=>errors.push(e.message));
        await page.goto('http://localhost:5174');
        await page.waitForFunction(()=>window.__chaos?.phase==='menu');
        await page.locator('[data-mode=quick]').click();
        await page.evaluate(async()=>{
            const {AIController}=await import('/src/systems/AIController.ts');
            window.__matchAudit={mode:'quick',drivers:[new AIController(3,0,()=>.5),new AIController(3,1,()=>.5)],events:[],started:performance.now(),done:[]};
        });
        // Advance browser frames without real-time waits; physics and keyboard events stay intact.
        await page.clock.install({time:new Date('2026-10-18T12:00:00Z')});
        await page.clock.pauseAt(new Date('2026-10-18T12:00:00.100Z'));
        await page.evaluate(()=>window.__chaos.frameAt=performance.now());
        const run=await readAudit('match-action-browser-audit.mjs');
        let result;
        for(let i=0;i<40;i++) {
            result=await run(page);
            await fs.writeFile(root+'audit/action-match-results.json',JSON.stringify(result,null,2)+'\n');
            console.log(result.mode,result.phase,result.points,result.wins);
            if(result.done.length===2)break;
        }
        assert.equal(result.done.length,2,'Quick Match and Two Player must both finish');
        assert.equal(result.rematch,true,'Rematch returns to intro');
        await page.screenshot({path:root+'audit/action-match-results.png'});
    }
    assert.deepEqual(errors,[],'No uncaught browser errors');
} finally {
    await browser.close();
}
