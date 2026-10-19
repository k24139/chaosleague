import type { Side } from '../config/game';

export const BALL_AIR_FRICTION = .0015;
export const SHOT_CHARGE_MS = 1050;
export const RECATCH_MS = 250;
export const BLOCK_STARTUP_MS = 80;
export const BLOCK_ACTIVE_MS = 250;
export const BLOCK_RECOVERY_MS = 250;
export const DIZZY_MS = 1000;
export type Possession =
    | { kind: 'free' }
    | { kind: 'held'; owner: Side; caughtAt: number }
    | { kind: 'charging'; owner: Side; caughtAt: number; startedAt: number }
    | { kind: 'released'; owner: Side; until: number; strikeUntil: number; pickupUntil?: number };

export function chargeAmount(state: Possession, now: number) {
    return state.kind === 'charging' ? Math.min(1, Math.max(0, (now - state.startedAt) / SHOT_CHARGE_MS)) : 0;
}
export function preferredCharge(distance: number) { return Math.min(.85, .3 + distance / 1400); }

// Solve the free-flight launch once. Matter applies drag then gravity every 60 Hz step;
// aim for the DESCENDING rim crossing, with enough height to clear the actual front rim.
export function shotVelocity(from: { x: number; y: number }, target: { x: number; y: number }, charge: number, gravity: number, movement: { x: number; y: number }, radius = 20) {
    const dx = target.x - from.x, distance = Math.abs(dx), dir = Math.sign(dx);
    const q = Math.min(1, Math.max(0, charge)), ease = q * q * (3 - 2 * q);
    const ideal = preferredCharge(distance), idealEase = ideal * ideal * (3 - 2 * ideal);
    const g = (1000 / 60) ** 2 * .001 * gravity;
    const apex = Math.min(from.y, target.y) - Math.max(100, radius * 3 + 35);
    const flight = Math.ceil(Math.sqrt(2 * (from.y - apex) / g) + Math.sqrt(2 * (target.y - apex) / g));
    const drag = 1 - BALL_AIR_FRICTION, travel = drag * (1 - drag ** flight) / (1 - drag);
    const baseY = (target.y - from.y - g * (flight - travel) / (1 - drag)) / travel;
    return {
        x: dir * Math.max(0, distance / travel * (.65 + .65 * ease) / (.65 + .65 * idealEase) + dir * movement.x * .06),
        y: baseY * (.8 + .4 * ease) / (.8 + .4 * idealEase) + Math.min(0, movement.y) * .06
    };
}
