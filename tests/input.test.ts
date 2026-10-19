import test from 'node:test';
import assert from 'node:assert/strict';
import { InputManager } from '../src/systems/InputManager';
import { PhysicsWorld } from '../src/systems/PhysicsWorld';
import { SPORTS, EMPTY_INPUT } from '../src/config/game';

class Button extends EventTarget {
    dataset: { side: string; control: string };
    held = false;
    classList = { add: () => this.held = true, remove: () => this.held = false };
    constructor(side: number, control: string) { super(); this.dataset = { side: String(side), control }; }
    setPointerCapture() {}
}
const nodes = [0, 1].flatMap(side => ['left', 'right', 'action'].map(key => new Button(side, key)));
const win = new EventTarget();
const doc = Object.assign(new EventTarget(), { hidden: false, querySelectorAll: (selector: string) => selector === '[data-control]' ? nodes : nodes.filter(n => n.held) });
Object.assign(globalThis, { window: win, document: doc });
function key(type: string, code: string, extra: object = {}) {
    const e = Object.assign(new Event(type, { cancelable: true }), { code, key: '', ...extra });
    win.dispatchEvent(e);
    return e;
}
function input(two = false) { const m = new InputManager(); m.twoPlayer = two; m.enabled = true; return m; }
const down = (code: string) => key('keydown', code);
const up = (code: string) => key('keyup', code);
for (const [code, control] of [['KeyA', 'left'], ['KeyD', 'right'], ['KeyS', 'action'], ['ArrowLeft', 'left'], ['ArrowRight', 'right'], ['ArrowDown', 'action']] as const) {
    test(`solo ${code} controls the human`, () => {
        const m = input();
        assert.equal(down(code).defaultPrevented, true);
        assert.deepEqual(m.get(0), { ...EMPTY_INPUT, [control]: true });
        assert.deepEqual(m.get(1), EMPTY_INPUT);
        up(code); assert.deepEqual(m.get(0), EMPTY_INPUT); m.destroy();
    });
}
test('solo can alternate schemes repeatedly and combine equivalent held keys', () => {
    const m = input();
    for (let i = 0; i < 10; i++) for (const scheme of [['KeyA', 'KeyD', 'KeyS'], ['ArrowLeft', 'ArrowRight', 'ArrowDown']]) {
        down(scheme[0]); assert.equal(m.get(0).left, true); up(scheme[0]);
        down(scheme[1]); assert.equal(m.get(0).right, true); up(scheme[1]);
        down(scheme[2]); assert.equal(m.get(0).action, true); up(scheme[2]);
    }
    for (const [a, b, control] of [['KeyA', 'ArrowLeft', 'left'], ['KeyD', 'ArrowRight', 'right'], ['KeyS', 'ArrowDown', 'action']] as const) {
        down(a); down(b); up(a); assert.equal(m.get(0)[control], true); up(b); assert.equal(m.get(0)[control], false);
    }
    m.destroy();
});
test('opposite directions are neutral and releasing one restores the other', () => {
    const m = input();
    down('KeyA'); down('ArrowRight'); assert.deepEqual(m.get(0), EMPTY_INPUT);
    up('KeyA'); assert.equal(m.get(0).right, true);
    down('ArrowLeft'); assert.deepEqual(m.get(0), EMPTY_INPUT);
    up('ArrowRight'); assert.equal(m.get(0).left, true); m.destroy();
});
for (const held of ['KeyA', 'KeyD', 'KeyS']) for (const arrow of ['ArrowLeft', 'ArrowRight', 'ArrowDown']) {
    test(`two-player ${held} remains held across ${arrow} down and up`, () => {
        const m = input(true); down(held); const initial = m.get(0);
        down(arrow); assert.deepEqual(m.get(0), initial); const other = m.get(1);
        up(held); assert.deepEqual(m.get(1), other);
        down(held); up(arrow); assert.deepEqual(m.get(0), initial); m.destroy();
    });
}
test('both players move and act together and change directions independently', () => {
    const m = input(true);
    down('KeyS'); down('KeyD'); down('ArrowLeft'); down('ArrowDown');
    assert.deepEqual(m.get(0), { left: false, right: true, action: true });
    assert.deepEqual(m.get(1), { left: true, right: false, action: true });
    up('KeyD'); down('KeyA'); up('ArrowLeft'); down('ArrowRight');
    assert.deepEqual(m.get(0), { left: true, right: false, action: true });
    assert.deepEqual(m.get(1), { left: false, right: true, action: true }); m.destroy();
});
test('blur, hidden page and full exit clear all held state', () => {
    const m = input(true);
    for (const clear of [() => win.dispatchEvent(new Event('blur')), () => { doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); doc.hidden = false; }, () => m.clear()]) {
        m.enabled = true; down('KeyD'); down('ArrowLeft'); down('KeyS'); down('ArrowDown');
        clear(); assert.deepEqual(m.get(0), EMPTY_INPUT); assert.deepEqual(m.get(1), EMPTY_INPUT);
        m.enabled = true; down('KeyA'); down('ArrowRight');
        assert.equal(m.get(0).left, true); assert.equal(m.get(1).right, true); m.clear();
    }
    m.destroy();
});
test('physical codes ignore key labels, auto-repeat is stable, button clicks do not replace held state', () => {
    const m = input(true);
    key('keydown', 'KeyD', { key: 'a' });
    for (let i = 0; i < 5; i++) key('keydown', 'ArrowDown', { repeat: true });
    assert.equal(m.get(0).right, true); assert.equal(m.get(0).left, false); assert.equal(m.get(1).action, true);
    up('ArrowDown'); assert.equal(m.get(0).right, true);
    // Input listens at window, not a focused canvas or button.
    nodes[0].dispatchEvent(new Event('click')); down('KeyS'); assert.equal(m.get(0).action, true); m.destroy();
});
test('keyboard and multiple touch pointers coexist and cancellation releases only that pointer', () => {
    const m = input(true);
    const pointer = (node: Button, type: string, id: number) => node.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { pointerId: id }));
    pointer(nodes[0], 'pointerdown', 1); pointer(nodes[2], 'pointerdown', 2); pointer(nodes[4], 'pointerdown', 3);
    down('ArrowDown'); assert.deepEqual(m.get(0), { left: true, right: false, action: true });
    assert.deepEqual(m.get(1), { left: false, right: true, action: true });
    pointer(nodes[0], 'pointercancel', 1); assert.equal(m.get(0).left, false); assert.equal(m.get(0).action, true);
    pointer(nodes[4], 'lostpointercapture', 3); assert.equal(m.get(1).right, false); assert.equal(m.get(1).action, true);
    pointer(nodes[2], 'pointerdown', 4); pointer(nodes[2], 'pointerup', 2); assert.equal(nodes[2].held, true);
    win.dispatchEvent(new Event('blur')); assert.ok(nodes.every(n => !n.held)); m.destroy();
});
test('disabled or destroyed input does not consume navigation and restart adds no duplicate listeners', () => {
    const old = input(); old.destroy(); const m = input(true);
    down('KeyA'); assert.equal(old.keys.size, 0); assert.equal(m.keys.size, 1);
    m.enabled = false; assert.equal(down('ArrowLeft').defaultPrevented, false);
    assert.deepEqual(m.get(0), EMPTY_INPUT); m.destroy();
});
test('real physics consumes both input schemes through scoring/reset boundaries for every sport', () => {
    const m = input(true);
    for (const sport of SPORTS) {
        const w = new PhysicsWorld(sport, []);
        for (let step = 0; step < 40; step++) w.step([EMPTY_INPUT, EMPTY_INPUT]);
        down('KeyD'); down('ArrowLeft'); down('KeyW'); down('ArrowUp');
        const before = w.players.map(p => ({ ...p.body.position }));
        for (let step = 0; step < 8; step++) w.step([m.get(0), m.get(1)]);
        assert.ok(w.players[0].body.position.x > before[0].x, sport);
        assert.ok(w.players[1].body.position.x < before[1].x, sport);
        assert.ok(w.players.every((p, i) => p.body.position.y < before[i].y), sport);
        m.enabled = false; m.clear(); w.destroy(); m.enabled = true;
        down('KeyA'); down('ArrowRight'); assert.equal(m.get(0).left, true); assert.equal(m.get(1).right, true); m.clear();
    }
    m.twoPlayer = false;
    const w = new PhysicsWorld('soccer', []);
    down('ArrowRight'); for (let i = 0; i < 20; i++) w.step([m.get(0), EMPTY_INPUT]);
    assert.ok(w.players[0].body.position.x > 310); m.clear();
    down('KeyA'); for (let i = 0; i < 50; i++) w.step([m.get(0), EMPTY_INPUT]);
    assert.ok(w.players[0].body.velocity.x < 0); w.destroy(); m.destroy();
});

test('phase gates preserve physical presses and always consume releases', () => {
    const m = input(); m.inMatch = true;
    for (const code of ['KeyA', 'KeyD', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowDown']) {
        m.enabled = false; down(code);
        assert.ok(m.keys.has(code)); assert.deepEqual(m.get(0), EMPTY_INPUT);
        up(code); m.enabled = true; assert.deepEqual(m.get(0), EMPTY_INPUT);
        down(code); m.enabled = false; up(code); m.enabled = true;
        assert.deepEqual(m.get(0), EMPTY_INPUT);
    }
    down('KeyD'); m.get(0); m.enabled = false; m.enabled = true;
    assert.equal(m.get(0).right, true); up('KeyD');
    assert.deepEqual(m.get(0), EMPTY_INPUT); m.destroy();
});
test('a complete tap between physics frames is consumed once and cannot stick', () => {
    const m = input();
    for (const code of ['KeyA', 'KeyD', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowDown']) {
        down(code); up(code); assert.ok(Object.values(m.get(0)).some(Boolean));
        assert.deepEqual(m.get(0), EMPTY_INPUT);
        down(code); up(code); assert.ok(Object.values(m.get(0)).some(Boolean)); assert.deepEqual(m.get(0), EMPTY_INPUT);
        down(code); up(code); m.enabled = false; m.enabled = true; assert.deepEqual(m.get(0), EMPTY_INPUT);
    }
    m.destroy();
});

test('rapid solo tap-release-tap sequences and mixed schemes survive twenty round gates', () => {
    const m = input(); m.inMatch = true;
    for (let round = 0; round < 20; round++) {
        for (const [code, control] of [['KeyA','left'], ['KeyD','right'], ['KeyA','left'], ['KeyS','action'], ['ArrowRight','right'], ['ArrowDown','action'], ['KeyD','right']] as const) {
            down(code); assert.equal(m.get(0)[control], true); up(code); assert.deepEqual(m.get(0), EMPTY_INPUT);
        }
        m.enabled = false; down('KeyS'); up('KeyS'); down('KeyD'); m.enabled = true;
        assert.equal(m.get(0).right, true); up('KeyD'); assert.deepEqual(m.get(0), EMPTY_INPUT);
    }
    m.destroy();
});
test('local players can hold and release across pause, scoring and countdown gates independently', () => {
    const m = input(true); m.inMatch = true;
    for (let transition = 0; transition < 12; transition++) {
        down('KeyD'); down('ArrowLeft'); m.enabled = false;
        assert.ok(m.keys.has('KeyD')); assert.ok(m.keys.has('ArrowLeft'));
        up('KeyD'); down('KeyA'); m.enabled = true;
        assert.equal(m.get(0).left, true); assert.equal(m.get(1).left, true);
        up('ArrowLeft'); assert.equal(m.get(0).left, true); assert.deepEqual(m.get(1), EMPTY_INPUT);
        up('KeyA'); down('KeyS'); down('ArrowDown');
        assert.equal(m.get(0).action, true); assert.equal(m.get(1).action, true);
        up('KeyS'); assert.equal(m.get(0).action, false); assert.equal(m.get(1).action, true); up('ArrowDown');
    }
    m.destroy();
});

test('a brief touch action survives normal release but not cancellation or stolen capture', () => {
    const m = input(true), action = nodes[2];
    const pointer = (type: string, id: number) => action.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { pointerId: id }));
    pointer('pointerdown', 100); pointer('pointerup', 100); pointer('lostpointercapture', 100);
    assert.equal(m.get(0).action, true); assert.equal(m.get(0).action, false);
    pointer('pointerdown', 101); pointer('pointercancel', 101); assert.equal(m.get(0).action, false);
    pointer('pointerdown', 102); pointer('lostpointercapture', 102); assert.equal(m.get(0).action, false);
    m.destroy();
});

for (const code of ['KeyW','ArrowUp']) test(code+' exclusively controls Jump',()=>{
    const m=input(); down(code);assert.equal(m.get(0).jump,true);assert.equal(m.get(0).action,false);up(code);assert.deepEqual(m.get(0),EMPTY_INPUT);m.destroy();
});
test('held Action is suppressed across a transition until physically released',()=>{
    const m=input(true);down('KeyS');down('ArrowDown');m.get(0);m.get(1);
    m.enabled=false;m.enabled=true;assert.equal(m.get(0).action,false);assert.equal(m.get(1).action,false);
    up('KeyS');down('KeyS');assert.equal(m.get(0).action,true);assert.equal(m.get(1).action,false);m.destroy();
});
