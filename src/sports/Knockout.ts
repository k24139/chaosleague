import type { Side } from '../config/game';
import type { PhysicsWorld } from '../systems/PhysicsWorld';
import type { Sport } from './BaseSport';
export class Knockout implements Sport {
    id = 'knockout' as const;
    setup(w: PhysicsWorld) { w.floor(170, 950); }
    update(w: PhysicsWorld) { if (w.elapsed > 18000) {
        w.platformHalf = Math.max(85, 390 - (w.elapsed - 18000) * .013);
        const floor = w.statics.find(b => b.label === 'floor')!;
        w.setPlatformWidth(floor, w.platformHalf * 2);
    } }
    check(w: PhysicsWorld): Side | null { const lost = w.players.map(p => p.body.position.y > 690 || p.body.position.x < -100 || p.body.position.x > 1220); if (lost[0] && lost[1]) {
        w.resetPlayers();
        return null;
    } if (lost[0])
        return 1; if (lost[1])
        return 0; return null; }
}
