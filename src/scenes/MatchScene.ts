import { FullscreenControl } from '../systems/FullscreenControl';
import { stageFit } from '../systems/StageLayout';
import { nextMap } from '../config/maps';
import Phaser from 'phaser';
import Matter from 'matter-js';
import { PhysicsWorld } from '../systems/PhysicsWorld';
import { AIController } from '../systems/AIController';
import { InputManager } from '../systems/InputManager';
import { AudioManager, readSettings, saveSettings } from '../systems/AudioManager';
import { MatchManager } from '../systems/MatchManager';
import { LocalPlatform } from '../systems/PlatformAdapter';
import { selectModifiers } from '../systems/ModifierManager';
import { ArenaRenderer } from '../ui/ArenaRenderer';
import { EntityRenderer } from '../ui/EntityRenderer';
import { HUD, el } from '../ui/HUD';
import { INTRO_DURATION, introCue, advanceIntro, SCORE_DURATION, SCORE_IMPACT, scoreTimeScale, advanceScore } from '../systems/PresentationTimeline';
import { icon } from '../ui/icons';
import { TEAMS, type Mode, type Side } from '../config/game';
type Phase = 'menu' | 'intro' | 'live' | 'point' | 'finished' | 'bracket';
export class MatchScene extends Phaser.Scene {
    world!: PhysicsWorld;
    arena!: ArenaRenderer;
    entities!: EntityRenderer;
    inputManager!: InputManager;
    audio = new AudioManager(readSettings());
    hud = new HUD();
    platform = new LocalPlatform();
    match = new MatchManager('quick');
    ai = new AIController();
    phase: Phase = 'menu';
    phaseTime = 0;
    accumulator = 0;
    paused = false;
    lastCount = -1;
    roundWinner: Side | null = null;
    particles: Phaser.GameObjects.Arc[] = [];
    demoTime = 0;
    orientationPaused = false;
    freeze = 0;
    private fullscreen!: FullscreenControl;
    private scoreShown = false;
    private bracketLaunching = false;
    private previousMaps = new Map<string, number>();
    private cameraSize = '';
    private lifecycle = new AbortController();
    private falling = new Set<Side>();
    private frameAt = performance.now();
    get effects() { return this.audio.settings.effects && !window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    constructor() { super('Match'); }
    create() {
        this.lifecycle = new AbortController();
        if (this.audio.context?.state === 'closed') this.audio = new AudioManager(readSettings());
        this.arena = new ArenaRenderer(this);
        this.entities = new EntityRenderer(this);
        this.inputManager = new InputManager();
        this.showMenu();
        this.bindUI();
        const signal = this.lifecycle.signal;
        document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(true); }, { signal });
        window.addEventListener('blur', () => this.pause(true), { signal });
        window.addEventListener('keydown', e => {
            if (document.querySelector('dialog[open]')) return;
            if (e.key === 'Escape' && !document.fullscreenElement && this.phase !== 'menu' && this.phase !== 'finished' && this.phase !== 'bracket') {
                e.preventDefault(); this.pause(!this.paused);
            }
            const overlay = this.paused ? el('pause-overlay') : this.phase === 'finished' ? el('results') : this.phase === 'bracket' ? el('bracket-overlay') : null;
            if (e.key === 'Tab' && overlay) {
                const buttons = Array.from(overlay.querySelectorAll<HTMLButtonElement>('button'));
                const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
                e.preventDefault(); buttons[(index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
            }
        }, { signal });
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.lifecycle.abort(); this.inputManager.destroy(); this.audio.destroy(); this.fullscreen.destroy(); this.clean();
        });
        el('pause-overlay').setAttribute('role', 'dialog');
        el('pause-overlay').setAttribute('aria-label', 'Paused match');
        el('results').setAttribute('role', 'dialog');
        el('results').setAttribute('aria-label', 'Match result');
        for (const id of ['pause-overlay', 'results']) el(id).setAttribute('aria-modal', 'true');
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => this.applyEffects(), { signal });
        this.applyEffects();
    }
    applyEffects() { document.documentElement.classList.toggle('effects-off', !this.effects); }
    bindUI() {
        document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.addEventListener('click', () => this.start(b.dataset.mode as Mode), { signal: this.lifecycle.signal }));
        el('pause-button').onclick = () => this.pause(true);
        el('resume-button').onclick = () => this.pause(false);
        el('restart-button').onclick = () => this.start(this.match.mode);
        el('quit-button').onclick = () => this.showMenu();
        el('result-menu').onclick = () => this.showMenu();
        el('rematch-button').onclick = () => this.start(this.match.mode);
        el('cup-menu').onclick = () => this.showMenu();
        el('cup-enter').onclick = () => {
            if (!this.match.cup?.active) { this.start('cup'); return; }
            if (this.bracketLaunching) return;
            this.bracketLaunching = true; this.phaseTime = 0; this.frameAt = performance.now();
            el('bracket-overlay').classList.add('launching');
            el<HTMLButtonElement>('cup-enter').disabled = true;
            this.audio.play('matchup');
        };
        const openDialog = (id: string) => { this.audio.unlock(); this.audio.play('button'); el<HTMLDialogElement>(id).showModal(); };
        el('how-button').onclick = () => openDialog('how-dialog');
        el('settings-button').onclick = () => openDialog('settings-dialog');
        document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(b => b.onclick = () => { b.closest('dialog')?.close(); this.audio.play('button'); });
        document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) {
            const r = d.getBoundingClientRect();
            const p = e as MouseEvent;
            if (p.clientX < r.left || p.clientX > r.right || p.clientY < r.top || p.clientY > r.bottom)
                d.close();
        } }, { signal: this.lifecycle.signal }));
        el('teams').innerHTML = TEAMS.map((t, i) => `<button class="team-pick" data-team="${i}" title="${t.name}" aria-label="Play as ${t.name}" aria-pressed="${i === this.audio.settings.team}"><span class="team-face" style="background:${t.hex}"></span></button>`).join('');
        document.querySelectorAll<HTMLButtonElement>('[data-team]').forEach(b => b.onclick = () => { this.audio.settings.team = Number(b.dataset.team); saveSettings(this.audio.settings); document.querySelectorAll('[data-team]').forEach(t => t.setAttribute('aria-pressed', String(t === b))); el('team-name').textContent = TEAMS[this.audio.settings.team].name; this.world.players[0].team = this.audio.settings.team; this.audio.unlock(); this.audio.play('button'); });
        el('team-name').textContent = TEAMS[this.audio.settings.team].name;
        el<HTMLSelectElement>('setting-rival').innerHTML = TEAMS.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
        for (const id of ['muted', 'sound', 'music', 'effects', 'volume', 'difficulty', 'rival'] as const) {
            const element = el<HTMLInputElement>('setting-' + id);
            if (['muted', 'sound', 'music', 'effects'].includes(id))
                element.checked = this.audio.settings[id] as boolean;
            else
                element.value = String(this.audio.settings[id]);
            element.addEventListener('change', () => { const s = this.audio.settings; if (id === 'muted' || id === 'sound' || id === 'music' || id === 'effects')
                s[id] = element.checked;
            else if (id === 'volume')
                s.volume = Number(element.value);
            else if (id === 'difficulty')
                s.difficulty = Number(element.value);
            else
                s.rival = Number(element.value); saveSettings(s); this.audio.unlock(); this.audio.sync(); this.applyEffects(); this.soundButton(); }, { signal: this.lifecycle.signal });
        }
        el('sound-top').onclick = () => {
            this.audio.unlock(); this.audio.setMuted(!this.audio.settings.muted);
            el<HTMLInputElement>('setting-muted').checked = this.audio.settings.muted;
            this.soundButton();
        };
        this.soundButton();
        this.fullscreen = new FullscreenControl(el<HTMLButtonElement>('fullscreen'), el('game-shell'), text => this.hud.announce(text));
        el('pause-button').innerHTML = icon('pause');
        el('how-button').innerHTML = icon('rules') + 'How to play';
        el('settings-button').innerHTML = icon('settings') + 'Settings';
        document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach(b => b.innerHTML = icon(b.dataset.control === 'action' ? 'action' : b.dataset.control === 'left' ? 'left' : 'right'));

    }
    soundButton() {
        const muted = this.audio.settings.muted;
        el('sound-top').innerHTML = icon(muted ? 'muted' : 'audio');
        el('sound-top').setAttribute('aria-label', muted ? 'Unmute all audio' : 'Mute all audio');
        el('sound-top').setAttribute('aria-pressed', String(muted));
        el('sound-top').title = muted ? 'Unmute all audio' : 'Mute all audio';
    }
    clean() { if (this.world)
        this.world.destroy(); this.particles.forEach(p => p.destroy()); this.particles = []; this.tweens.killAll(); this.cameras.main.resetFX(); }
    showMenu() { this.clean(); this.phase = 'menu'; el('game-shell').classList.remove('bracketing'); this.paused = false; this.orientationPaused = false; this.inputManager.enabled = false; this.inputManager.inMatch = false; this.inputManager.clear(); this.audio.music(true, 'menu'); this.platform.gameplayStop(); this.hud.show(false); el('game-shell').classList.remove('paused'); this.world = new PhysicsWorld('soccer', [], 0, [this.audio.settings.team, this.audio.settings.rival]); this.arena.build(0); Matter.Body.setPosition(this.world.players[0].body, { x: 730, y: 477 }); Matter.Body.setPosition(this.world.players[1].body, { x: 925, y: 473 }); this.world.players[0].scale = 1.5; this.world.players[1].scale = 1.5; Matter.Body.setPosition(this.world.balls[0].body, { x: 830, y: 492 }); this.world.balls[0].radius = 25; }
    start(mode: Mode) { this.audio.unlock(); this.audio.play('button'); this.match = new MatchManager(mode, mode === 'cup' ? 0 : this.audio.settings.difficulty, Math.random, this.audio.settings.team); this.roundWinner = null; this.paused = false; this.orientationPaused = false; el('game-shell').classList.remove('paused'); el('pause-overlay').hidden = true; el('results').hidden = true; this.inputManager.twoPlayer = mode === 'two'; this.inputManager.inMatch = true; this.hud.show(true, mode === 'two'); this.audio.music(true, 'match'); if (mode === 'cup') this.showBracket(); else this.nextRound(); }
    showBracket() {
        this.phase = 'bracket'; this.phaseTime = 0; this.bracketLaunching = false; this.paused = false;
        this.inputManager.enabled = false; this.inputManager.inMatch = true;
        el('game-shell').classList.add('bracketing');
        el('hud').hidden = true; el('touch').hidden = true; el('results').hidden = true; el('pause-overlay').hidden = true;
        el<HTMLButtonElement>('cup-enter').disabled = false;
        this.hud.overlay(false); this.hud.hideScore(); this.hud.bracket(this.match);
        this.platform.gameplayStop(); this.audio.music(true, 'menu'); this.audio.play(this.match.cup?.champion?.human ? 'cup-victory' : 'bracket');
    }
    fitCamera() {
        const rail = this.phase !== 'menu' && this.phase !== 'bracket' && window.matchMedia('(pointer: coarse)').matches ? 70 : 0;
        const width = this.scale.width, height = Math.max(1, this.scale.height - rail), key = `${width}:${height}`;
        if (key === this.cameraSize) return;
        this.cameraSize = key;
        const fit = stageFit(width, height);
        this.cameras.main.setViewport(0, 0, width, height).setZoom(Math.max(.001, fit.scale)).centerOn(560, 315);
    }
    nextRound() {
        this.clean();
        el('game-shell').classList.remove('bracketing'); el('bracket-overlay').hidden = true; el('hud').hidden = false; el('touch').hidden = false;
        const sport = this.match.nextSport();
        const map = nextMap(this.previousMaps.get(sport) ?? -1); this.previousMaps.set(sport, map);
        const rival = this.match.mode === 'cup' ? this.match.cup!.opponent!.team : this.audio.settings.rival;
        this.world = new PhysicsWorld(sport, selectModifiers(sport), map, [this.audio.settings.team, rival === this.audio.settings.team ? (rival + 1) % TEAMS.length : rival]);
        this.ai = new AIController(this.match.difficulty);
        this.arena.build(this.world.arenaIndex);
        this.phase = 'intro'; this.phaseTime = 0; this.frameAt = performance.now(); this.freeze = 0; this.lastCount = -1; this.accumulator = 0;
        this.falling.clear(); this.inputManager.enabled = false;
        this.world.players.forEach(p => p.jumpHeld = false);
        this.hud.update(this.world, this.match); this.hud.timer(35); this.hud.resetIntro();
        this.hud.intro(this.world, this.match, 0); this.audio.play('sport');
        this.audio.music(true, this.match.wins.some(s => s === 2) ? 'tension' : 'match');
        this.platform.gameplayStop();
    }
    pause(value: boolean) { if (this.phase === 'menu' || this.phase === 'finished' || this.phase === 'bracket')
        return; this.frameAt = performance.now(); this.paused = value; el('game-shell').classList.toggle('paused', value); el('pause-overlay').hidden = !value; this.inputManager.enabled = !value && this.phase === 'live'; this.world.players.forEach(p => p.jumpHeld = false); this.audio.music(!value); if (value) {
        this.tweens.pauseAll();
        el('touch').hidden = true;
        el('resume-button').focus({ preventScroll: true });
        this.platform.gameplayStop();
    }
    else {
        this.tweens.resumeAll();
        el('touch').hidden = false;
        el('pause-button').focus({ preventScroll: true });
        if (this.phase === 'live')
            this.platform.gameplayStart();
    } }
    endRound(winner: Side | null) {
        if (this.phase !== 'live')
            return;
        this.roundWinner = winner;
        this.phase = 'point';
        this.scoreShown = false;
        this.phaseTime = 0;
        this.accumulator = 0;
        this.inputManager.enabled = false;
        this.platform.gameplayStop();
        if (winner === null) {
            this.hud.overlay(true, 'Draw', 'Round resets. No point awarded.', 'Time expired', '');
            return;
        }
        this.match.score(winner);
        this.audio.play(this.match.mode !== 'two' && winner === 1 ? 'score-cpu' : 'score-player');
        this.hud.update(this.world, this.match);
    }
    scoreImpact() {
        this.scoreShown = true;
        const winner = this.roundWinner!;
        this.hud.celebrate(this.world, this.match, winner);
        this.audio.play(this.world.sportId === 'knockout' ? 'knockout' : this.world.sportId === 'volleyball' ? 'point' : this.world.sportId === 'basketball' ? 'score' : 'goal');
        this.audio.play('score-impact');
        if (this.effects) {
            const team = TEAMS[this.world.players[winner].team];
            this.cameras.main.shake(180, .005);
            this.cameras.main.flash(90, (team.color >> 16) & 255, (team.color >> 8) & 255, team.color & 255);
            this.burst(this.world.players[winner].body.position.x, this.world.players[winner].body.position.y - 20, team.color, this.match.wins[winner] === 3 ? 42 : 26);
        }
    }

    burst(x: number, y: number, color: number, count = 8) { if (!this.effects)
        return; for (let i = 0; i < count; i++) {
        const p = this.add.circle(x, y, 3 + Math.random() * 3, color).setDepth(10);
        this.particles.push(p);
        this.tweens.add({ targets: p, x: x + (Math.random() - .5) * 170, y: y - 20 - Math.random() * 120, alpha: 0, duration: 400 + Math.random() * 300, onComplete: () => { p.destroy(); this.particles = this.particles.filter(a => a !== p); } });
    } }
    update(_time: number, delta: number) {
        this.fitCamera();
        const now = performance.now(), presentationDelta = Math.max(0, now - this.frameAt);
        this.frameAt = now;
        const dt = Math.min(delta, 50);
        this.demoTime += dt;
        if (this.phase === 'menu') {
            const demoTime = this.effects ? this.demoTime : 0;
            this.world.players[0].body.angle = Math.sin(demoTime * .0015) * .09;
            this.world.players[1].body.angle = Math.sin(demoTime * .0018) * -.08;
            this.world.balls[0].body.position.y = 481 + Math.sin(demoTime * .002) * 12;
            this.world.balls[0].body.angle = demoTime * .0008;
            this.arena.draw(this.world, this.effects ? this.demoTime : 0);
            this.entities.draw(this.world, this.effects ? this.demoTime : 0);
            return;
        }
        if (this.phase === 'bracket') {
            if (this.bracketLaunching) { this.phaseTime += presentationDelta; if (this.phaseTime >= 1200) this.nextRound(); }
            this.arena.draw(this.world, this.effects ? this.demoTime : 0); this.entities.draw(this.world, this.effects ? this.demoTime : 0); return;
        }
        const portrait = window.matchMedia('(pointer: coarse) and (orientation: portrait)').matches;
        if (portrait) {
            if (!this.orientationPaused) {
                this.orientationPaused = true;
                this.audio.music(false);
                this.inputManager.enabled = false; this.inputManager.clear();
                this.platform.gameplayStop();
            }
            return;
        }
        if (this.orientationPaused) {
            this.orientationPaused = false;
            this.inputManager.enabled = !this.paused && this.phase === 'live';
            this.world.players.forEach(p => p.jumpHeld = false);
            this.audio.music(!this.paused && this.phase !== 'finished');
            if (this.phase === 'live' && !this.paused)
                this.platform.gameplayStart();
        }
        if (this.paused)
            return;
        this.phaseTime = this.phase === 'intro' ? advanceIntro(this.phaseTime, presentationDelta) : this.phase === 'point' ? advanceScore(this.phaseTime, presentationDelta) : this.phaseTime + presentationDelta;
        if (this.phase === 'intro') {
            if (this.hud.intro(this.world, this.match, this.phaseTime)) { const cue = introCue(this.phaseTime); this.audio.play(cue.kind === 'count' ? 'count-' + cue.label : cue.kind === 'chaos' ? 'modifier' : cue.kind); }
            if (this.phaseTime >= INTRO_DURATION) {
                this.phase = 'live'; this.phaseTime = 0;
                this.hud.overlay(false); this.inputManager.enabled = true;
                this.platform.gameplayStart();
            }
        }
        if (this.phase === 'live') {
            this.freeze = Math.max(0, this.freeze - dt);
            this.accumulator += this.freeze > 0 ? 0 : dt;
            let steps = 0;
            while (this.accumulator >= 1000 / 60 && steps++ < 4) {
                const human = this.inputManager.get(0), rival = this.match.mode === 'two' ? this.inputManager.get(1) : this.ai.update(this.world);
                const winner = this.world.step([human, rival]);
                this.accumulator -= 1000 / 60;
                if (winner !== null) {
                    this.endRound(winner);
                    break;
                }
            }
            this.hud.timer(35 - this.world.elapsed / 1000);
            if (this.world.elapsed > 35000) {
                el('objective').textContent = 'Overtime / Sudden death';
                if (this.audio.intensity !== 'tension') this.audio.music(true, 'tension');
                if (this.world.sportId === 'basketball' || this.world.sportId === 'soccer')
                    for (const b of this.world.balls)
                        if (b.idle > 800)
                            this.world.resetBall(b);
            }
            if (this.world.elapsed > 45000)
                this.endRound(null);
            for (const e of this.world.events) {
                if (e.type === 'hit') {
                    this.audio.play('hit');
                    this.burst(e.x, e.y, 0xfff4cc, 5);
                    if (this.world.sportId === 'knockout' && this.effects) {
                        this.freeze = 35;
                        this.cameras.main.shake(65, .002);
                    }
                }
                if (e.type === 'catch') this.audio.play('catch');
                if (e.type === 'throw') this.audio.play('throw');
                if (e.type === 'jump')
                    this.audio.play('jump');
            }
            this.world.events = [];
            if (this.world.sportId === 'knockout') for (const p of this.world.players) {
                if (p.body.position.y > 550 && !this.falling.has(p.side)) { this.falling.add(p.side); this.audio.play('fall'); }
                if (p.body.position.y < 530) this.falling.delete(p.side);
            }
        }
        if (this.phase === 'point') {
            if (this.roundWinner !== null) {
                this.accumulator += dt * scoreTimeScale(this.phaseTime);
                while (this.accumulator >= 1000 / 60) { this.world.settle(); this.accumulator -= 1000 / 60; }
                if (!this.scoreShown && this.phaseTime >= SCORE_IMPACT) this.scoreImpact();
            }
            if (this.phaseTime >= SCORE_IMPACT + SCORE_DURATION) {
                this.hud.overlay(false); this.hud.hideScore();
                if (this.match.wins.some(s => s >= 3)) {
                    this.audio.music(false); el('touch').hidden = true;
                    if (this.match.mode === 'cup') {
                        this.match.cup!.resolveHuman(this.roundWinner === 0);
                        if (this.match.cup!.active) this.match.nextCup();
                        this.showBracket();
                    } else {
                        this.phase = 'finished'; this.audio.play('victory'); this.hud.result(this.match, this.roundWinner!);
                    }
                } else this.nextRound();
            }
        }
        this.arena.draw(this.world, this.effects ? this.demoTime : 0);
        this.entities.draw(this.world, this.effects ? this.demoTime : 0, (this.phase === 'point' || this.phase === 'finished') && this.phaseTime > this.freeze ? this.roundWinner : null);
    }
}
