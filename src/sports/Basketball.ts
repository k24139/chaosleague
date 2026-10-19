import type { Side } from '../config/game';
import { BASKET } from '../config/geometry';
import type { PhysicsWorld } from '../systems/PhysicsWorld';
import type { Sport } from './BaseSport';
interface Passage { above: boolean; crossed: boolean; blocked: boolean; }
export class Basketball implements Sport {
    id = 'basketball' as const;
    private previousRimY = 315;
    private passages = new Map<string, Passage>();
    private scored = new Set<number>();
    setup(w: PhysicsWorld) {
        w.floor(0, 1120);
        w.addStatic(2, 270, 36, 650);
        w.addStatic(1118, 270, 36, 650);
        w.addStatic(560, -20, 1160, 40);
        w.goalY = 315;
        for (const x of BASKET.centers) {
            w.hoops.push(w.addStatic(x - BASKET.rimHalf, 315, BASKET.rimBodyWidth, 12, 'rim'), w.addStatic(x + BASKET.rimHalf, 315, BASKET.rimBodyWidth, 12, 'rim'));
            w.hoops.push(w.addStatic(x + (x < 560 ? -BASKET.boardOffset : BASKET.boardOffset), 275, 10, 106, 'backboard'));
        }
    }
    update(w: PhysicsWorld) {
        this.previousRimY = w.goalY;
        w.goalY = 315 + (w.rules.movingGoals ? Math.sin(w.elapsed * .0019) * 54 : 0);
        for (let i = 0; i < w.hoops.length; i++) {
            const b = w.hoops[i];
            w.setPosition(b, b.position.x, w.goalY + (i % 3 === 2 ? -40 : 0));
        }
    }
    check(w: PhysicsWorld): Side | null {
        for (const ball of w.balls) {
            if (ball.holder !== null) {
                for (const i of [0, 1]) this.passages.delete(`${ball.body.id}:${i}`);
                continue;
            }
            if (this.scored.has(ball.body.id)) continue;
            const p = ball.body.position, prev = ball.previous, r = ball.radius;
            for (const [i, rimX] of BASKET.centers.entries()) {
                const key = `${ball.body.id}:${i}`;
                let pass = this.passages.get(key);
                if (!pass) { pass = { above: false, crossed: false, blocked: false }; this.passages.set(key, pass); }
                const prior = prev.y - this.previousRimY, current = p.y - w.goalY;
                const inside = Math.abs(p.x - rimX) <= BASKET.rimInner - r;
                const near = Math.abs(p.x - rimX) < BASKET.rimHalf + r;
                if (!near || p.y < w.goalY - r - 70) { pass.above = false; pass.crossed = false; pass.blocked = false; }
                const delta = current - prior;
                const atPlane = (depth: number) => prev.x + (p.x - prev.x) * (depth - prior) / delta;
                const opening = (x: number) => Math.abs(x - rimX) <= BASKET.rimInner - r;
                // Only an upward crossing THROUGH the opening is an underhand entry.
                // Crossing beside the rim must not poison a later legitimate basket.
                if (prior >= 0 && current < 0 && ball.body.velocity.y < 0 && opening(atPlane(0))) {
                    pass.blocked = true; pass.above = false; pass.crossed = false;
                }
                if (!pass.blocked && ((prev.y + r < this.previousRimY) || (p.y + r < w.goalY))) pass.above = true;
                if (prior < 0 && current >= 0 && ball.body.velocity.y > 0) {
                    pass.crossed = pass.above && !pass.blocked && opening(atPlane(0));
                }
                // Sample the actual lower-plane crossing, not the end of a fast physics step.
                if (pass.crossed && prior < BASKET.scoreDepth && current >= BASKET.scoreDepth && ball.body.velocity.y > 0 && opening(atPlane(BASKET.scoreDepth))) {
                    this.scored.add(ball.body.id);
                    return i === 0 ? 1 : 0;
                }
                if (current < -r || (!inside && current >= 0)) pass.crossed = false;
            }
        }
        return null;
    }
}
