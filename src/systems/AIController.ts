import type { Input } from '../config/game';
import type { PhysicsWorld } from './PhysicsWorld';
export class AIController {
    next = 0;
    actionRelease = 0;
    input: Input = { left: false, right: false, action: false };
    constructor(public difficulty = 1, public side: 0 | 1 = 1, private random = Math.random) { }
    update(w: PhysicsWorld): Input {
        if (w.elapsed < this.next)
            return this.input;
        this.next = w.elapsed + [240, 155, 100, 75][this.difficulty];
        const p = w.players[this.side], enemy = w.players[1 - this.side], pos = p.body.position;
        const dir = this.side === 0 ? 1 : -1;
        const ball = w.balls.slice().sort((a, b) => Math.abs(a.body.position.x - pos.x) - Math.abs(b.body.position.x - pos.x))[0];
        let target = pos.x, action = false;
        if (w.sportId === 'knockout') {
            target = enemy.body.position.x;
            const edge = Math.abs(pos.x - 560) > w.platformHalf - 85;
            if (edge)
                target = 560;
            action = p.grounded && (Math.abs(enemy.body.position.x - pos.x) < 115 || edge);
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
            action = close && b.y > 170 && (p.grounded || Math.abs(b.y - pos.y) < 110);
        }
        if (w.sportId === 'basketball' && w.balls.some(b => b.holder === this.side)) {
            target = this.side === 0 ? 690 : 430;
            action = w.elapsed - w.balls.find(b => b.holder === this.side)!.heldSince < 450;
        }
        const mistake = this.random() < [.14, .08, .04, .025][this.difficulty];
        const deadzone = [32, 24, 18, 14][this.difficulty];
        this.input = { left: !mistake && target < pos.x - deadzone, right: !mistake && target > pos.x + deadzone, action: !mistake && action && (w.balls.some(b => b.holder === this.side) || w.elapsed > this.actionRelease) };
        if (this.input.action)
            this.actionRelease = w.elapsed + 350;
        return this.input;
    }
}
