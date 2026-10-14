import test from 'node:test';
import assert from 'node:assert/strict';
import { SCORE_DURATION, SCORE_IMPACT, scoreTimeScale } from '../src/systems/PresentationTimeline';
import { fullscreenView } from '../src/systems/FullscreenControl';
test('score presentation keeps three seconds of copy after a 220ms slow impact', () => {
    assert.equal(SCORE_DURATION, 3000); assert.equal(SCORE_IMPACT, 220);
    assert.equal(scoreTimeScale(0), .18); assert.equal(scoreTimeScale(219), .18);
    assert.equal(scoreTimeScale(220), .32); assert.equal(scoreTimeScale(1249), .32); assert.equal(scoreTimeScale(1250), .045);
});
test('fullscreen labels and enter/exit glyphs always correspond to browser state', () => {
    assert.deepEqual(fullscreenView(false), { label: 'Enter fullscreen', icon: 'fullscreen' });
    assert.deepEqual(fullscreenView(true), { label: 'Exit fullscreen', icon: 'exitFullscreen' });
});
test('fullscreen control reacts to enter, exit and external browser changes', async () => {
    const { FullscreenControl } = await import('../src/systems/FullscreenControl');
    class Button extends EventTarget { hidden = false; innerHTML = ''; title = ''; attrs = new Map<string,string>(); setAttribute(k: string, v: string) { this.attrs.set(k, v); } }
    const doc = Object.assign(new EventTarget(), { fullscreenEnabled: true, fullscreenElement: null as object | null, exitFullscreen: async () => { doc.fullscreenElement = null; doc.dispatchEvent(new Event('fullscreenchange')); } });
    const target = { requestFullscreen: async () => { doc.fullscreenElement = target; doc.dispatchEvent(new Event('fullscreenchange')); } };
    Object.assign(globalThis, { document: doc });
    const button = new Button(), control = new FullscreenControl(button as unknown as HTMLButtonElement, target as HTMLElement, () => {});
    const enterIcon = button.innerHTML;
    button.dispatchEvent(new Event('click')); await new Promise(r => setTimeout(r, 0));
    assert.equal(button.attrs.get('aria-label'), 'Exit fullscreen'); assert.notEqual(button.innerHTML, enterIcon);
    button.dispatchEvent(new Event('click')); await new Promise(r => setTimeout(r, 0));
    assert.equal(button.attrs.get('aria-label'), 'Enter fullscreen'); assert.equal(button.innerHTML, enterIcon);
    doc.fullscreenElement = target; doc.dispatchEvent(new Event('fullscreenchange'));
    assert.equal(button.attrs.get('aria-label'), 'Exit fullscreen');
    await doc.exitFullscreen(); assert.equal(button.attrs.get('aria-pressed'), 'false'); control.destroy();
});
test('long frame gaps cannot erase the score text before it receives a rendered phase', async () => {
    const { advanceScore } = await import('../src/systems/PresentationTimeline');
    assert.equal(advanceScore(0, 10000), SCORE_IMPACT);
    assert.equal(advanceScore(SCORE_IMPACT, 10000), SCORE_IMPACT + SCORE_DURATION);
    assert.equal(advanceScore(500, 20), 520);
});
