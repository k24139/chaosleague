import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HUD } from '../src/ui/HUD';
import { PhysicsWorld } from '../src/systems/PhysicsWorld';
import { MatchManager } from '../src/systems/MatchManager';

// Small DOM adapter exercises production rendering without a browser dependency.
class Node {
    textContent = ''; innerHTML = ''; hidden = false; inert = false; dataset = {}; children: Node[] = [];
    parentElement: Node = this; attributes = new Map<string,string>(); classes = new Set<string>();
    style = { setProperty: (_key: string, _value: string) => {} };
    className = ''; focused = false;
    classList = { add: (...c:string[]) => c.forEach(v=>this.classes.add(v)), remove: (...c:string[])=>c.forEach(v=>this.classes.delete(v)), toggle: (c:string,on:boolean)=>on?this.classes.add(c):this.classes.delete(c) };
    setAttribute(key:string,value:string) { this.attributes.set(key,value); }
    replaceChildren() { this.children=[]; }
    append(node:Node) { this.children.push(node); }
    focus() { this.focused=true; }
}
function dom(run:(nodes:Map<string,Node>)=>void) {
    const prior = Object.getOwnPropertyDescriptor(globalThis,'document');
    const nodes=new Map<string,Node>();
    const get=(id:string)=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)!;};
    Object.defineProperty(globalThis,'document',{configurable:true,value:{getElementById:get,createElement:()=>new Node(),querySelector:get}});
    try{run(nodes);}finally{if(prior)Object.defineProperty(globalThis,'document',prior);else Reflect.deleteProperty(globalThis,'document');}
}
for(const mode of ['quick','two','cup'] as const) test(`${mode} HUD distinguishes current points from match round wins`,()=>dom(nodes=>{
    const w=new PhysicsWorld('basketball',[]),m=new MatchManager(mode),hud=new HUD();
    m.points=[2,1];m.wins=[1,2];hud.update(w,m);
    assert.equal(nodes.get('score-0')!.textContent,'2');assert.equal(nodes.get('score-1')!.textContent,'1');
    assert.equal(nodes.get('wins-0')!.textContent,'1');assert.equal(nodes.get('wins-1')!.textContent,'2');
    assert.equal(nodes.get('match-progress')!.textContent,'ROUNDS 1–2 · FIRST TO 3');
    assert.equal(nodes.get('player-1')!.textContent,mode==='two'?'P2':'CPU');
    assert.match(nodes.get('scoreboard')!.attributes.get('aria-label')!,/Points 2 to 1. Rounds 1 to 2/);w.destroy();
}));
test('pause/result modal gate disables background HUD, touch and utility controls',()=>dom(nodes=>{
    const hud=new HUD();hud.modal(true);for(const id of ['hud','touch','.game-utility'])assert.equal(nodes.get(id)!.inert,true);
    hud.modal(false);for(const id of ['hud','touch','.game-utility'])assert.equal(nodes.get(id)!.inert,false);
}));
test('Cup action labels describe start and continuation, and result hides gameplay controls',()=>dom(nodes=>{
    const m=new MatchManager('cup'),hud=new HUD();hud.bracket(m);assert.equal(nodes.get('cup-enter')!.textContent,'Start Cup');
    m.cup!.resolveHuman(true);m.nextCup();hud.bracket(m);assert.equal(nodes.get('cup-enter')!.textContent,'Continue Cup');
    const w=new PhysicsWorld('soccer',[]);m.wins=[3,2];hud.result(w,m,0);
    assert.equal(nodes.get('hud')!.hidden,true);assert.equal(nodes.get('touch')!.hidden,true);assert.equal(nodes.get('result-score')!.textContent,'3–2');assert.equal(nodes.get('rematch-button')!.focused,true);w.destroy();
}));
test('scoreboard owns point numerals and modal/Cup actions are semantic buttons',()=>{
    const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
    assert.match(html, /class="scoreboard"[^\n]+id="score-0"[^\n]+id="score-1"/);
    for(const id of ['cup-enter','cup-menu','resume-button','restart-button','quit-button','rematch-button','result-menu'])assert.match(html,new RegExp(`<button[^>]*id="${id}"`));
});
