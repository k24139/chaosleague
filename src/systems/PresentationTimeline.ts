import type { Mode, Side, SportId } from '../config/game';
export const INTRO_DURATION = 9450;
export const SCORE_DURATION = 3000;
export const SCORE_IMPACT = 220;
export interface IntroCue { kind: 'sport' | 'map' | 'chaos' | 'count' | 'fight' | 'live'; label: string; key: string; }
export function introCue(time: number): IntroCue {
    if (time < 2000) return { kind: 'sport', label: '', key: 'sport' };
    if (time < 4000) return { kind: 'map', label: '', key: 'map' };
    if (time < 6000) return { kind: 'chaos', label: '', key: 'chaos' };
    if (time < 9000) { const label = String(3 - Math.floor((time - 6000) / 1000)); return { kind: 'count', label, key: 'count-' + label }; }
    if (time < INTRO_DURATION) return { kind: 'fight', label: 'Fight!', key: 'fight' };
    return { kind: 'live', label: '', key: 'live' };
}
export function advanceIntro(time: number, elapsed: number) {
    const next = [2000, 4000, 6000, 7000, 8000, 9000, INTRO_DURATION].find(end => end > time);
    return next === undefined ? INTRO_DURATION : Math.min(next, time + Math.max(0, elapsed));
}
export function advanceScore(time: number, elapsed: number) {
    const boundary = time < SCORE_IMPACT ? SCORE_IMPACT : SCORE_IMPACT + SCORE_DURATION;
    return Math.min(boundary, time + Math.max(0, elapsed));
}
export function scoreTimeScale(time: number) { return time < SCORE_IMPACT ? .18 : time < 1250 ? .32 : .045; }
const events: Record<SportId, string> = { basketball: 'Score!', soccer: 'Goal!', volleyball: 'Point!', knockout: 'Knockout!' };
const playerLines = ["That's yours.", 'Keep the pressure on.', 'One closer.', 'Take control.'];
const rivalLines = ['They took your point. Answer back.', 'Your move.', "They're one closer.", "Don't let that stand.", 'Take it back.', 'Too slow.'];
export class ScorePresentation {
    private last = [-1, -1];
    constructor(private random = Math.random) {}
    event(sport: SportId) { return events[sport]; }
    line(mode: Mode, side: Side) {
        if (mode === 'two') return side === 0 ? 'Player 1 strikes.' : 'Player 2 takes the point.';
        const pool = side === 0 ? playerLines : rivalLines;
        let next = Math.floor(this.random() * pool.length);
        if (next === this.last[side]) next = (next + 1) % pool.length;
        this.last[side] = next; return pool[next];
    }
}
