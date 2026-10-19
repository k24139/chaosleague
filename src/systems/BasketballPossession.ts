import type { Side } from '../config/game';

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

// A bounded arcade arc. The basket supplies direction; momentum only trims power.
// Medium charge reaches nearby rims; longer cross-court shots need more charge.
export function shotVelocity(from: { x: number; y: number }, target: { x: number; y: number }, charge: number, gravity: number, movement: { x: number; y: number }) {
    const dx = target.x - from.x, distance = Math.abs(dx), dir = Math.sign(dx);
    const q = Math.min(1, Math.max(0, charge)), ease = q * q * (3 - 2 * q);
    const ideal = preferredCharge(distance), idealEase = ideal * ideal * (3 - 2 * ideal);
    const power = .65 + .65 * ease, reference = .65 + .65 * idealEase;
    const flight = Math.min(72, Math.max(26, distance / 10));
    const g = .27778 * gravity;
    const baseY = (target.y - 12 - from.y - .5 * g * flight * flight) / flight;
    return {
        x: dir * Math.max(.6, distance / flight * power / reference + dir * movement.x * .06),
        y: Math.min(-3, baseY) * (.8 + .4 * ease) / (.8 + .4 * idealEase) + Math.min(0, movement.y) * .06
    };
}
