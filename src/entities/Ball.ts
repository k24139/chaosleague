import Matter from 'matter-js';
import type { Rules } from '../systems/ModifierManager';
export class Ball {
    body: Matter.Body;
    lastTouch: 0 | 1 | null = null;
    previous = { x: 560, y: 250 };
    idle = 0;
    holder: 0 | 1 | null = null;
    heldSince = 0;
    grabCooldown = 0;
    noStrikeUntil = 0;
    radius: number;
    constructor(rules: Rules, x = 560, y = 230) { this.radius = rules.ballRadius; this.body = Matter.Bodies.circle(x, y, this.radius, { label: 'ball', collisionFilter: { category: 1, mask: 1 }, restitution: rules.bounce, friction: .025, frictionAir: .0015, density: .0012 }); }
}
