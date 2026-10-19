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
    actionStarted = -Infinity;
    actionUntil = 0;
    actionReady = 0;
    actionDirection = 1;
    actionHits = new Set<number>();
    airJumpUsed = false;
    airDashUsed = false;
    resetActions() {
        this.stun = 0; this.cooldown = 0; this.jumpHeld = false; this.lastAction = -999;
        this.actionStarted = -Infinity; this.actionUntil = this.actionReady = 0;
        this.actionHits.clear(); this.airJumpUsed = this.airDashUsed = false;
    }
    constructor(public side: Side, team: number, rules: Rules, x: number, y = FLOOR - 43 * rules.playerScale) {
        this.team = team;
        this.scale = rules.playerScale;
        this.radius = 27 * this.scale;
        this.facing = side === 0 ? 1 : -1;
        this.body = Matter.Bodies.rectangle(x, y, 48 * this.scale, 78 * this.scale, { chamfer: { radius: 19 * this.scale }, label: `player${side}`, friction: rules.friction, frictionAir: .013, restitution: .12, density: .0024 });
    }
    move(input: Input, rules: Rules, dt: number, time: number) {
        this.cooldown = Math.max(0, this.cooldown - dt);
        if (this.grounded) this.airJumpUsed = this.airDashUsed = false;
        const dir = Number(input.right) - Number(input.left);
        if (dir && this.stun <= 0) {
            this.facing = dir;
            Matter.Body.applyForce(this.body, this.body.position, { x: dir * .0026 * this.body.mass * rules.speed, y: 0 });
        }
        else if (this.grounded && rules.friction > .01 && this.stun <= 0) {
            Matter.Body.setVelocity(this.body, { x: this.body.velocity.x * .84, y: this.body.velocity.y });
        }
        const cap = 7.6 * rules.speed;
        if (time >= this.actionUntil && this.stun <= 0 && Math.abs(this.body.velocity.x) > cap)
            Matter.Body.setVelocity(this.body, { x: Math.sign(this.body.velocity.x) * cap, y: this.body.velocity.y });
        // An upright spring keeps the loose rotation controllable after collisions.
        const angle = Math.atan2(Math.sin(this.body.angle), Math.cos(this.body.angle));
        Matter.Body.setAngularVelocity(this.body, this.body.angularVelocity * .85 - angle * .036 + (this.stun <= 0 ? dir * .005 : 0));
        let acted = false;
        if (input.jump && !this.jumpHeld && this.cooldown <= 0 && this.stun <= 0 && this.grounded) {
            Matter.Body.setVelocity(this.body, { x: this.body.velocity.x, y: -11.4 * rules.jump });
            acted = true;
            this.cooldown = 230; this.lastAction = time;
        }
        this.jumpHeld = !!input.jump;
        return acted;
    }
}
