import test from 'node:test';
import assert from 'node:assert/strict';
import { readSettings, saveSettings } from '../src/systems/AudioManager';
let stored: string | null = null;
Object.assign(globalThis, { window: { matchMedia: () => ({ matches: false }) }, localStorage: { getItem: () => stored, setItem: (_key: string, v: string) => { stored = v; } } });
test('audio and team settings round-trip through local save', () => { const s = readSettings(); assert.equal(s.difficulty, 1); s.sound = false; s.music = false; s.team = 5; s.volume = .2; saveSettings(s); assert.deepEqual(readSettings(), s); });
test('corrupt saves recover to playable defaults', () => { stored = 'not JSON'; assert.equal(readSettings().volume, .65); stored = '{"team":200,"volume":"loud","difficulty":-10,"sound":"off"}'; const s = readSettings(); assert.equal(s.team, 5); assert.equal(s.volume, .65); assert.equal(s.difficulty, 0); assert.equal(s.sound, true); stored = 'null'; assert.equal(readSettings().team, 0); });

test('master mute and volume apply to both buses without replacing individual preferences', async () => {
    const { audioLevels, AudioManager } = await import('../src/systems/AudioManager');
    stored = null;
    const s = readSettings(), audio = new AudioManager(s);
    assert.deepEqual(audioLevels(s, true), { master: .65, music: 1, sound: 1 });
    audio.setMuted(true);
    assert.deepEqual(audioLevels(s, true), { master: 0, music: 1, sound: 1 });
    assert.equal(readSettings().muted, true);
    s.sound = false; audio.setMuted(false);
    assert.deepEqual(audioLevels(s, true), { master: .65, music: 1, sound: 0 });
    s.sound = true; s.music = false;
    assert.deepEqual(audioLevels(s, true), { master: .65, music: 0, sound: 1 });
    s.volume = 0; assert.equal(audioLevels(s, true).master, 0);
    s.volume = .4; s.music = true;
    assert.deepEqual(audioLevels(s, false), { master: .4, music: 0, sound: 1 });
    saveSettings(s); assert.deepEqual(readSettings(), s); audio.destroy();
});
test('live Web Audio buses silence existing notes on mute, channel toggles and volume changes', async () => {
    const { AudioManager } = await import('../src/systems/AudioManager');
    const gains: { gain: { value: number; setTargetAtTime(v: number): void }; connect(): void }[] = [];
    class Context {
        currentTime = 10;
        sampleRate = 32;
        destination = {};
        state = 'running';
        createGain() { const node = { gain: { value: 1, setTargetAtTime(v: number) { this.value = v; } }, connect() {} }; gains.push(node); return node; }
        createBuffer() { return { getChannelData: () => new Float32Array(32) }; }
        resume() { return Promise.resolve(); }
        close() { return Promise.resolve(); }
    }
    Object.assign(globalThis, { AudioContext: Context });
    stored = null; const s = readSettings(); const audio = new AudioManager(s); audio.unlock(); audio.music(true);
    assert.deepEqual(gains.map(g => g.gain.value), [.65, 1, 1]);
    audio.setMuted(true); assert.equal(gains[0].gain.value, 0);
    audio.setMuted(false); assert.equal(gains[0].gain.value, .65);
    s.music = false; audio.sync(); assert.equal(gains[1].gain.value, 0); assert.equal(gains[2].gain.value, 1);
    s.sound = false; audio.sync(); assert.equal(gains[2].gain.value, 0);
    s.volume = .25; audio.sync(); assert.equal(gains[0].gain.value, .25);
    audio.destroy(); assert.equal(audio.musicTimer, null);
});
test('new reveal, score and Cup cues have distinct note signatures and respect mute', async () => {
    const { AudioManager } = await import('../src/systems/AudioManager'); stored = null;
    const audio = new AudioManager(readSettings()); const notes: number[][] = [];
    audio.tone = (...args: Parameters<typeof audio.tone>) => { notes.push(args.filter(a => typeof a === 'number') as number[]); };
    const names = ['sport', 'map', 'modifier', 'count-3', 'count-2', 'count-1', 'fight', 'score-player', 'score-cpu', 'score-impact', 'bracket', 'cup-victory'];
    const signatures = names.map(name => { notes.length = 0; audio.play(name); assert.ok(notes.length, name); return JSON.stringify(notes); });
    assert.equal(new Set(signatures).size, names.length);
    audio.settings.muted = true; notes.length = 0; for (const name of names) audio.play(name); assert.equal(notes.length, 0);
});
