import { GOAL } from '../config/geometry';
import { FLOOR, type Side } from '../config/game';
import type { PhysicsWorld } from '../systems/PhysicsWorld';
import type { Sport } from './BaseSport';
export class Soccer implements Sport {
    id = 'soccer' as const;
    setup(w: PhysicsWorld) {
        w.floor(0, 1120);
        w.goalY = FLOOR - 56;
        // Side-wall openings track the goal, including Moving Goals.
        for (const x of [-12, 1132]) {
            w.hoops.push(w.addStatic(x, 200, 24, 500, 'goal-wall'));
            w.hoops.push(w.addStatic(x, 590, 24, 100, 'goal-wall'));
        }
        // Only the overhead bar is solid at the visible mouth. The front mesh is a near-side art layer.
        w.hoops.push(w.addStatic(GOAL.depth / 2, w.goalY - GOAL.halfHeight - GOAL.topBar / 2, GOAL.depth, GOAL.topBar, 'goal-crossbar'));
        w.hoops.push(w.addStatic(1120 - GOAL.depth / 2, w.goalY - GOAL.halfHeight - GOAL.topBar / 2, GOAL.depth, GOAL.topBar, 'goal-crossbar'));
        w.hoops.push(w.addStatic(-16, w.goalY, 8, GOAL.halfHeight * 2, 'goal-net'));
        w.hoops.push(w.addStatic(1136, w.goalY, 8, GOAL.halfHeight * 2, 'goal-net'));
        // Keep character art inside the stage. Balls pass through these player-only edge stops.
        for (const x of [2, 1118]) {
            const stop = w.addStatic(x, 315, 36, 630, 'player-edge');
            stop.collisionFilter.category = 2;
        }
        w.addStatic(560, -20, 1160, 40);
        w.addStatic(560, 620, 1160, 40);
    }
    update(w: PhysicsWorld) { w.goalY = FLOOR - 56 + (w.rules.movingGoals ? -30 + Math.sin(w.elapsed * .0016) * 30 : 0); for (let i = 0; i < w.hoops.length; i++) {
        const b = w.hoops[i], top = i % 2 === 0;
        if (b.label === 'goal-net') { w.setPosition(b, b.position.x, w.goalY); continue; }
        if (b.label === 'goal-crossbar') { w.setPosition(b, b.position.x, w.goalY - GOAL.halfHeight - GOAL.topBar / 2); continue; }
        const edge = top ? w.goalY - GOAL.halfHeight : w.goalY + GOAL.halfHeight;
        const height = top ? edge + 80 : 700 - edge;
        w.setBodyHeight(b, height);
        w.setPosition(b, b.position.x, top ? (-80 + edge) / 2 : (700 + edge) / 2);
    } }
    check(w: PhysicsWorld): Side | null { for (const b of w.balls) {
        const { x, y } = b.body.position;
        if (y - b.radius >= w.goalY - GOAL.halfHeight && y + b.radius <= w.goalY + GOAL.halfHeight) {
            if (x < GOAL.scoreInset)
                return 1;
            if (x > 1120 - GOAL.scoreInset)
                return 0;
        }
    } return null; }
}
