export interface Settings {
    muted: boolean;
    sound: boolean;
    music: boolean;
    volume: number;
    musicVolume: number;
    soundVolume: number;
    effects: boolean;
    difficulty: number;
    team: number;
    rival: number;
}
export const AUDIO_BOOST = 6;
export function audioLevels(settings: Settings, active: boolean) {
    return { master: settings.muted ? 0 : settings.volume * AUDIO_BOOST, music: settings.music && active ? settings.musicVolume : 0, sound: settings.sound ? settings.soundVolume : 0 };
}
export class AudioManager {
    context: AudioContext | null = null;
    musicTimer: ReturnType<typeof setInterval> | null = null;
    private master: GainNode | null = null;
    private musicBus: GainNode | null = null;
    private soundBus: GainNode | null = null;
    private output: GainNode | null = null;
    private noiseBuffer: AudioBuffer | null = null;
    note = 0;
    active = false;
    intensity: 'menu' | 'match' | 'tension' = 'menu';
    constructor(public settings: Settings) {}
    unlock() {
        try {
            if (typeof AudioContext === 'undefined') return;
            if (!this.context) {
                this.context = new AudioContext();
                this.master = this.context.createGain();
                this.musicBus = this.context.createGain();
                this.soundBus = this.context.createGain();
                this.musicBus.connect(this.master);
                this.soundBus.connect(this.master);
                const compressor = this.context.createDynamicsCompressor();
                compressor.threshold.value = -10; compressor.knee.value = 12;
                compressor.ratio.value = 12; compressor.attack.value = .003; compressor.release.value = .12;
                const limiter = this.context.createWaveShaper();
                const curve = new Float32Array(4096);
                // Smooth bounded transfer is a final peak safety stage, not oscillator clipping.
                for (let i = 0; i < curve.length; i++) curve[i] = .94 * Math.tanh((i * 2 / (curve.length - 1) - 1) / .94);
                limiter.curve = curve; limiter.oversample = '4x';
                this.output = this.context.createGain();
                this.master.connect(compressor); compressor.connect(limiter);
                limiter.connect(this.output); this.output.connect(this.context.destination);
                this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
                const data = this.noiseBuffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            }
            this.sync();
            void this.context.resume().catch(() => {});
        } catch { /* Audio denial keeps silent play available. */ }
    }
    sync() {
        const levels = audioLevels(this.settings, this.active);
        if (this.context) {
            const t = this.context.currentTime;
            this.master?.gain.setTargetAtTime(levels.master, t, .008);
            this.output?.gain.setTargetAtTime(this.settings.muted ? 0 : 1, t, .003);
            this.musicBus?.gain.cancelScheduledValues(t);
            this.musicBus?.gain.setTargetAtTime(levels.music, t, .008);
            this.soundBus?.gain.setTargetAtTime(levels.sound, t, .008);
        }
    }
    setMuted(muted: boolean) { this.settings.muted = muted; this.sync(); saveSettings(this.settings); }
    tone(frequency: number, duration = .09, type: OscillatorType = 'sine', volume = .08, slide = 0, music = false, delay = 0) {
        const ctx = this.context, bus = music ? this.musicBus : this.soundBus;
        if (!ctx || ctx.state !== 'running' || !bus) return;
        const t = ctx.currentTime + delay, osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, t);
        if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(25, frequency + slide), t + duration);
        gain.gain.setValueAtTime(.001, t);
        gain.gain.linearRampToValueAtTime(volume, t + .005);
        gain.gain.exponentialRampToValueAtTime(.001, t + duration);
        osc.connect(gain);
        gain.connect(bus);
        osc.start(t);
        osc.stop(t + duration);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    }
    private noise(duration: number, volume: number, frequency: number, music = false) {
        const ctx = this.context, bus = music ? this.musicBus : this.soundBus;
        if (!ctx || ctx.state !== 'running' || !bus || !this.noiseBuffer) return;
        const t = ctx.currentTime, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
        source.buffer = this.noiseBuffer;
        filter.type = 'highpass'; filter.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(.001, t + duration);
        source.connect(filter); filter.connect(gain); gain.connect(bus);
        source.start(t); source.stop(t + duration);
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    }
    play(name: string, strength = .6) {
        if (!this.settings.sound || this.settings.muted) return;
        if (['score', 'goal', 'point', 'knockout'].includes(name) && this.context && this.musicBus) {
            const t = this.context.currentTime, music = audioLevels(this.settings, this.active).music;
            this.musicBus.gain.cancelScheduledValues(t);
            this.musicBus.gain.setTargetAtTime(music * .3, t, .025);
            this.musicBus.gain.setTargetAtTime(music, t + .55, .16);
        }
        switch (name) {
            case 'sport': this.tone(130, .2, 'sawtooth', .025, 45); this.tone(65, .16, 'sine', .09); break;
            case 'score-player': this.tone(240, .18, 'triangle', .05, 120); break;
            case 'score-cpu': this.tone(190, .19, 'sawtooth', .022, -90); break;
            case 'score-impact': this.tone(60, .22, 'sine', .12, -30); this.noise(.08, .03, 1500); break;
            case 'bracket': this.tone(165, .14, 'triangle', .045); this.tone(247, .22, 'triangle', .045, 0, false, .1); break;
            case 'matchup': this.tone(110, .24, 'sawtooth', .025, 110); this.noise(.13, .025, 1800); break;
            case 'cup-victory': [130.81, 164.81, 196, 261.63, 329.63].forEach((n, i) => this.tone(n, .7, 'sawtooth', .025, 0, false, i * .1)); this.tone(55, .85, 'sine', .16, -25); break;
            case 'catch': this.tone(280, .07, 'triangle', .06, -130); break;
            case 'throw': this.noise(.06, .018, 4500); this.tone(150, .07, 'triangle', .03, 120); break;
            case 'jump': this.tone(160, .08, 'triangle', .055, 160); break;
            case 'hit': { const impact = .25 + .75 * Math.max(0, Math.min(1, strength)); this.tone(85 + impact * 30 + Math.random() * 10, .08, 'sine', .12 * impact, -65); this.noise(.045, .025 * impact, 900); } break;
            case 'count-3': this.tone(440, .09, 'square', .024, -60); break;
            case 'count-2': this.tone(520, .09, 'square', .026, -70); break;
            case 'count':
            case 'count-1': this.tone(620, .1, 'square', .03, -90); break;
            case 'fight': this.tone(100, .22, 'sine', .16, -55); this.tone(880, .13, 'sawtooth', .028, -380); this.noise(.12, .03, 1700); break;
            case 'modifier': this.noise(.18, .04, 1800); this.tone(90, .22, 'sawtooth', .035, -40); break;
            case 'score':
                this.tone(85, .24, 'sine', .18, -45);
                [293.66, 440].forEach(n => this.tone(n, .22, 'sawtooth', .022));
                this.noise(.08, .025, 2200); break;
            case 'point':
                this.tone(164.81, .16, 'triangle', .08); this.tone(329.63, .24, 'sawtooth', .022);
                this.noise(.07, .025, 3000); break;
            case 'goal':
                this.tone(110, .25, 'sine', .2, -65);
                [220, 261.63, 329.63].forEach(n => this.tone(n, .32, 'sawtooth', .025));
                this.noise(.16, .035, 1300); break;
            case 'victory':
                [110, 130.81, 164.81, 220].forEach((n, i) => this.tone(n, .55, 'sawtooth', .03, 0, false, i * .075));
                this.tone(65, .65, 'sine', .17, -30); break;
            case 'fall': this.tone(260, .32, 'sawtooth', .03, -225); break;
            case 'knockout': this.tone(75, .5, 'sine', .25, -45); this.noise(.3, .075, 350); break;
            case 'button': this.tone(750, .035, 'sine', .035, -300); break;
        }
    }
    music(active: boolean, intensity = this.intensity) {
        this.active = active;
        this.intensity = intensity;
        this.sync();
        if (this.musicTimer) clearInterval(this.musicTimer);
        this.musicTimer = null;
        if (!active) return;
        // 140 BPM, eighth-note sequencer. Original percussion and E-minor bass.
        this.musicTimer = setInterval(() => {
            if (!this.settings.music || this.settings.muted || !this.active) return;
            const step = this.note++ % 32, menu = this.intensity === 'menu';
            if (step % (menu ? 8 : 4) === 0) this.tone(135, .16, 'sine', menu ? .065 : .13, -102, true);
            if (!menu && step % 8 === 4) { this.noise(.1, .037, 1400, true); this.tone(170, .07, 'triangle', .035, -60, true); }
            if (!menu) this.noise(.025, step % 2 ? .012 : .019, 6500, true);
            const bass = [82.41, 82.41, 98, 73.42][Math.floor(step / 8)];
            if (step % (menu ? 8 : 2) === 0) this.tone(bass, .16, 'triangle', menu ? .03 : .065, 0, true);
            if (step === 14 || step === 30) this.tone(step === 14 ? 329.63 : 293.66, .3, 'sine', .018, 0, true);
            if (this.intensity === 'tension' && step % 2 === 1) this.tone(164.81, .065, 'sawtooth', .013, 0, true);
        }, 60000 / 140 / 2);
    }
    destroy() { this.music(false); void this.context?.close(); }
}
export function readSettings(): Settings {
    const defaults: Settings = { muted: false, sound: true, music: true, volume: .65, musicVolume: .75, soundVolume: 1, effects: !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, difficulty: 1, team: 0, rival: 1 };
    try {
        const s = JSON.parse(localStorage.getItem('chaos-league-settings') || '{}');
        const number = (key: keyof Settings, min: number, max: number) => Number.isFinite(s?.[key]) ? Math.max(min, Math.min(max, Number(s[key]))) : Number(defaults[key]);
        const bool = (key: 'muted' | 'sound' | 'music' | 'effects') => typeof s?.[key] === 'boolean' ? s[key] : defaults[key];
        return { muted: bool('muted'), sound: bool('sound'), music: bool('music'), effects: bool('effects'), volume: number('volume', 0, 1), musicVolume: number('musicVolume', 0, 1), soundVolume: number('soundVolume', 0, 1), difficulty: Math.round(number('difficulty', 0, 3)), team: Math.round(number('team', 0, 5)), rival: Math.round(number('rival', 0, 5)) };
    } catch { return defaults; }
}
export function saveSettings(s: Settings) { try { localStorage.setItem('chaos-league-settings', JSON.stringify(s)); } catch { /* Storage denial does not block play. */ } }
