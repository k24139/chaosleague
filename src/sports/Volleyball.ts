import { FLOOR, type Side } from '../config/game';
import type { PhysicsWorld } from '../systems/PhysicsWorld';
import type { Sport } from './BaseSport';
export class Volleyball implements Sport {
    id = 'volleyball' as const;
    setup(w: PhysicsWorld) { w.floor(0, 1120); w.addStatic(2, 260, 36, 650); w.addStatic(1118, 260, 36, 650); w.addStatic(560, -20, 1160, 40); w.addStatic(560, FLOOR - 88, 12, 176, 'net'); }
    update(_w: PhysicsWorld) { }
    check(w: PhysicsWorld): Side | null { for (const b of w.balls)
        if (b.body.position.y + b.radius >= FLOOR - 3)
            return b.body.position.x < 560 ? 1 : 0; return null; }
}
