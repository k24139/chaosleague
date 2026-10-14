import Matter from 'matter-js';
import { chargeAmount, type Possession } from '../systems/BasketballPossession';
import type { Rules } from '../systems/ModifierManager';
export class Ball {
    body: Matter.Body;
    lastTouch: 0 | 1 | null = null;
    previous = { x: 560, y: 250 };
    idle = 0;
    possession: Possession = { kind: 'free' };
    get holder() { return this.possession.kind === 'held' || this.possession.kind === 'charging' ? this.possession.owner : null; }
    get heldSince() { return this.possession.kind === 'held' || this.possession.kind === 'charging' ? this.possession.caughtAt : 0; }
    get noStrikeUntil() { return this.possession.kind === 'released' ? this.possession.strikeUntil : 0; }
    charge(now: number) { return chargeAmount(this.possession, now); }
    radius: number;
    constructor(rules: Rules, x = 560, y = 230) { this.radius = rules.ballRadius; this.body = Matter.Bodies.circle(x, y, this.radius, { label: 'ball', collisionFilter: { category: 1, mask: 1 }, restitution: rules.bounce, friction: .025, frictionAir: .0015, density: .0012 }); }
}
