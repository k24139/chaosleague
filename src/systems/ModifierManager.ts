import type { SportId } from '../config/game';
export interface Rules {
    gravity: number;
    ballRadius: number;
    bounce: number;
    friction: number;
    wind: number;
    movingGoals: boolean;
    doubleBall: boolean;
    playerScale: number;
    speed: number;
    jump: number;
}
export const BASE_RULES: Rules = { gravity: 1, ballRadius: 20, bounce: .78, friction: .16, wind: 0, movingGoals: false, doubleBall: false, playerScale: 1, speed: 1, jump: 1 };
export const MODIFIERS = [
    { id: 'low-gravity', name: 'Low Gravity', tag: 'Floaty jumps', group: 'gravity', sports: ['basketball', 'soccer', 'volleyball', 'knockout'], apply: (r: Rules) => { r.gravity = .52; r.jump = .84; } },
    { id: 'high-gravity', name: 'High Gravity', tag: 'Heavy landings', group: 'gravity', sports: ['basketball', 'soccer', 'volleyball', 'knockout'], apply: (r: Rules) => { r.gravity = 1.45; r.jump = 1.2; } },
    { id: 'giant-ball', name: 'Giant Ball', tag: 'Big ball energy', group: 'ball', sports: ['basketball', 'soccer', 'volleyball'], apply: (r: Rules) => { r.ballRadius = 29; } },
    { id: 'tiny-ball', name: 'Tiny Ball', tag: 'Small and slippery', group: 'ball', sports: ['basketball', 'soccer', 'volleyball'], apply: (r: Rules) => { r.ballRadius = 12; } },
    { id: 'ice-floor', name: 'Ice Floor', tag: 'Watch your momentum', group: 'floor', sports: ['basketball', 'soccer', 'volleyball', 'knockout'], apply: (r: Rules) => { r.friction = .005; } },
    { id: 'super-bounce', name: 'Super Bounce', tag: 'Extra spring', group: 'bounce', sports: ['basketball', 'soccer', 'volleyball', 'knockout'], apply: (r: Rules) => { r.bounce = .96; r.jump = 1.15; } },
    { id: 'strong-wind', name: 'Strong Wind', tag: 'Follow the gusts', group: 'wind', sports: ['basketball', 'soccer', 'volleyball', 'knockout'], apply: (r: Rules) => { r.wind = .00042; } },
    { id: 'moving-goals', name: 'Moving Goals', tag: 'Time your shot', group: 'goals', sports: ['basketball', 'soccer'], apply: (r: Rules) => { r.movingGoals = true; } },
    { id: 'double-ball', name: 'Double Ball', tag: 'Two balls. One point.', group: 'count', sports: ['basketball', 'soccer', 'volleyball'], apply: (r: Rules) => { r.doubleBall = true; } },
    { id: 'tiny-players', name: 'Tiny Players', tag: 'Little legends', group: 'size', sports: ['basketball', 'soccer', 'volleyball', 'knockout'], apply: (r: Rules) => { r.playerScale = .72; } },
    { id: 'giant-players', name: 'Giant Players', tag: 'Heavy hitters', group: 'size', sports: ['basketball', 'soccer', 'volleyball', 'knockout'], apply: (r: Rules) => { r.playerScale = 1.25; } },
    { id: 'speed-boost', name: 'Speed Boost', tag: 'Fast feet', group: 'speed', sports: ['basketball', 'soccer', 'volleyball', 'knockout'], apply: (r: Rules) => { r.speed = 1.35; } }
];
export type ModifierId = typeof MODIFIERS[number]['id'];
export function compatible(ids: string[], sport: SportId): boolean {
    const entries = ids.map(id => MODIFIERS.find(m => m.id === id));
    return entries.every(m => m?.sports.includes(sport)) && new Set(entries.map(m => m!.group)).size === entries.length && !(ids.includes('high-gravity') && ids.includes('tiny-players'));
}
export function selectModifiers(sport: SportId, random = Math.random): string[] {
    const pool = MODIFIERS.filter(m => m.sports.includes(sport));
    const first = pool[Math.floor(random() * pool.length)].id;
    if (random() < .5)
        return [first];
    const rest = pool.filter(m => compatible([first, m.id], sport));
    return [first, rest[Math.floor(random() * rest.length)].id];
}
export function makeRules(ids: string[]): Rules { const r = { ...BASE_RULES }; for (const id of ids)
    MODIFIERS.find(m => m.id === id)?.apply(r); return r; }
export const modifierNames = (ids: string[]) => ids.map(id => MODIFIERS.find(m => m.id === id)?.name).filter(Boolean).join(' + ');
