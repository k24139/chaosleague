import { preferredCharge } from './BasketballPossession';
import type { Input } from '../config/game';
import type { PhysicsWorld } from './PhysicsWorld';
export class AIController {
    next = 0;
    actionRelease = 0;
    input: Input = { left: false, right: false, action: false };
    constructor(public difficulty = 1, public side: 0 | 1 = 1, private random = Math.random) { }
    update(w: PhysicsWorld): Input {
        if (w.players[this.side].stun > 0) { this.input = { left: false, right: false, action: false }; return this.input; }
        if (w.elapsed < this.next)
            return this.input;
        this.next = w.elapsed + [240, 155, 100, 75][this.difficulty];
        const p = w.players[this.side], enemy = w.players[1 - this.side], pos = p.body.position;
        const dir = this.side === 0 ? 1 : -1;
        const priority = (holder: 0 | 1 | null) => holder === this.side ? 0 : holder === null ? 1 : 2;
        const ball = w.balls.slice().sort((a, b) => priority(a.holder) - priority(b.holder) || Math.abs(a.body.position.x - pos.x) - Math.abs(b.body.position.x - pos.x))[0];
        let target = pos.x, action = false, jump = false;
        if (w.sportId === 'knockout') {
            target = enemy.body.position.x;
            const edge = Math.abs(pos.x - 560) > w.platformHalf - 85;
            if (edge)
                target = 560;
            jump = p.grounded && (Math.abs(enemy.body.position.x - pos.x) < 115 || edge);
            action = Math.abs(enemy.body.position.x - pos.x) < 150;
        }
        else if (ball) {
            const b = ball.body.position, v = ball.body.velocity;
            const prediction = [2, 6, 10, 13][this.difficulty];
            target = b.x + v.x * prediction - dir * (w.sportId === 'soccer' ? 42 : 20);
            if (w.sportId === 'volleyball') {
                if ((this.side === 1 && b.x < 535) || (this.side === 0 && b.x > 585))
                    target = this.side === 1 ? 790 : 330;
                target = Math.max(this.side === 1 ? 590 : 30, Math.min(this.side === 1 ? 1090 : 530, target));
            }
            const close = Math.abs(b.x - pos.x) < [85, 115, 135, 145][this.difficulty];
            jump = close && b.y < pos.y - 35 && p.grounded;
            action = close && (w.sportId !== 'basketball' || ball.holder !== null) && Math.abs(b.y - pos.y) < 100;
        }
        if (w.sportId === 'basketball' && w.balls.some(b => b.holder === this.side)) {
            const held = w.balls.find(b => b.holder === this.side)!;
            const basket = w.opponentBasket(this.side);
            target = basket.x - dir * [300, 360, 420, 460][this.difficulty];
            const distance = Math.abs(basket.x - held.body.position.x);
            const error = [.14, .08, .035, 0][this.difficulty];
            const desired = Math.min(1, preferredCharge(distance) + error);
            action = held.possession.kind === 'held' ? !this.input.action : held.charge(w.elapsed) < desired;
        }
        const carrying = w.balls.some(b => b.holder === this.side);
        const mistake = !carrying && this.random() < [.14, .08, .04, .025][this.difficulty];
        const deadzone = [32, 24, 18, 14][this.difficulty];
        if (w.sportId === 'basketball' && !carrying && ball?.holder !== null && ball?.holder !== undefined) {
            target = enemy.body.position.x; action = Math.abs(ball.body.position.x - pos.x) < 100 && Math.abs(ball.body.position.y - pos.y) < 75;
        }
        this.input = { jump: !mistake && jump && !p.jumpHeld, left: !mistake && target < pos.x - deadzone, right: !mistake && target > pos.x + deadzone, action: !mistake && action && (w.balls.some(b => b.holder === this.side) || w.elapsed > this.actionRelease) };
        if (this.input.action)
            this.actionRelease = w.elapsed + 350;
        return this.input;
    }
}
