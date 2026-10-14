import Matter from 'matter-js';
import { FLOOR, type Side, type Input } from '../config/game';
import type { Rules } from '../systems/ModifierManager';
export class Player {
    body: Matter.Body;
    stun = 0;
    scale: number;
    radius: number;
    cooldown = 0;
    jumpHeld = false;
    grounded = false;
    facing: number;
    lastAction = -999;
    team: number;
    constructor(public side: Side, team: number, rules: Rules, x: number, y = FLOOR - 43 * rules.playerScale) {
        this.team = team;
        this.scale = rules.playerScale;
        this.radius = 27 * this.scale;
        this.facing = side === 0 ? 1 : -1;
        this.body = Matter.Bodies.rectangle(x, y, 48 * this.scale, 78 * this.scale, { chamfer: { radius: 19 * this.scale }, label: `player${side}`, friction: rules.friction, frictionAir: .013, restitution: .12, density: .0024 });
    }
    move(input: Input, rules: Rules, dt: number, time: number) {
        this.cooldown = Math.max(0, this.cooldown - dt);
        this.stun = Math.max(0, this.stun - dt);
        const dir = Number(input.right) - Number(input.left);
        if (dir) {
            this.facing = dir;
            Matter.Body.applyForce(this.body, this.body.position, { x: dir * .0026 * this.body.mass * rules.speed * (this.stun > 0 ? .25 : 1), y: 0 });
        }
        else if (this.grounded && rules.friction > .01 && this.stun <= 0) {
            Matter.Body.setVelocity(this.body, { x: this.body.velocity.x * .84, y: this.body.velocity.y });
        }
        const cap = 7.6 * rules.speed;
        if (this.stun <= 0 && Math.abs(this.body.velocity.x) > cap)
            Matter.Body.setVelocity(this.body, { x: Math.sign(this.body.velocity.x) * cap, y: this.body.velocity.y });
        // An upright spring keeps the loose rotation controllable after collisions.
        const angle = Math.atan2(Math.sin(this.body.angle), Math.cos(this.body.angle));
        Matter.Body.setAngularVelocity(this.body, this.body.angularVelocity * .85 - angle * .036 + dir * .005);
        let acted = false;
        if (input.action && !this.jumpHeld && this.cooldown <= 0) {
            if (this.grounded) {
                Matter.Body.setVelocity(this.body, { x: this.body.velocity.x, y: -11.4 * rules.jump });
                acted = true;
            }
            else if (time - this.lastAction > 300) {
                acted = true;
            }
            if (acted) {
                this.cooldown = 230;
                this.lastAction = time;
            }
        }
        this.jumpHeld = input.action;
        return acted;
    }
}
