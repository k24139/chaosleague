import type { Mode, Side, SportId } from '../config/game';
export const INTRO_DURATION = 4950;
export const SCORE_DURATION = 2600;
export const SCORE_IMPACT = 100;
export const TRANSITION_DURATION = 500;
export interface IntroCue { kind: 'arena' | 'chaos' | 'count' | 'fight' | 'live'; label: string; key: string; }
export function introCue(time: number): IntroCue {
    if (time < 950) return { kind: 'arena', label: '', key: 'arena' };
    if (time < 1650) return { kind: 'chaos', label: '', key: 'chaos' };
    if (time < 4650) { const label = String(3 - Math.floor((time - 1650) / 1000)); return { kind: 'count', label, key: 'count-' + label }; }
    if (time < INTRO_DURATION) return { kind: 'fight', label: 'Fight!', key: 'fight' };
    return { kind: 'live', label: '', key: 'live' };
}
export function advanceIntro(time: number, elapsed: number) {
    // Wall-clock cues stay continuous; visibility/blur pauses are owned by MatchScene.
    return Math.min(INTRO_DURATION, time + Math.max(0, elapsed));
}
export function advanceScore(time: number, elapsed: number) {
    const boundary = time < SCORE_IMPACT ? SCORE_IMPACT : SCORE_IMPACT + SCORE_DURATION;
    return Math.min(boundary, time + Math.max(0, elapsed));
}
export function scoreTimeScale(time: number) {
    const progress = Math.min(1, Math.max(0, time / 160));
    return 1 - .8 * (progress * progress * (3 - 2 * progress));
}
const events: Record<SportId, string> = { basketball: 'Score!', soccer: 'Goal!', volleyball: 'Point!', knockout: 'Knockout!' };
const playerLines = ["That's yours.", 'Keep the pressure on.', 'One closer.', 'Take control.', 'Again.', "Don't let up."];
const rivalLines = ['Answer back.', 'They took that one.', 'Your move.', "They're one closer.", "Don't let that stand.", 'Take it back.', 'Too slow.', 'Make them pay for it.'];
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
