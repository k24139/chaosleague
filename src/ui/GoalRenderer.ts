import Phaser from 'phaser';
import { FLOOR, WIDTH } from '../config/game';
import { BASKET, GOAL, LAYERS } from '../config/geometry';
import { PALETTE as P } from '../config/theme';
import type { PhysicsWorld } from '../systems/PhysicsWorld';

export class GoalRenderer {
    readonly rear: Phaser.GameObjects.Graphics;
    readonly front: Phaser.GameObjects.Graphics;
    constructor(scene: Phaser.Scene) {
        this.rear = scene.add.graphics().setDepth(LAYERS.rearGoal);
        this.front = scene.add.graphics().setDepth(LAYERS.frontGoal);
    }
    private material = 0x64748b;
    draw(w: PhysicsWorld) {
        this.material = [0x7b7e83, 0x6b8865, 0xb39d88, 0x647ba3, 0x5c9285][w.arenaIndex];
        this.rear.clear(); this.front.clear();
        if (w.sportId === 'soccer') for (const side of [0, 1]) this.soccer(side, w.goalY);
        if (w.sportId === 'basketball') for (const x of BASKET.centers) this.basket(x, w.goalY, Math.max(1, w.balls[0]?.radius ?? 20));
        if (w.sportId === 'volleyball') this.volleyball();
    }
    private soccer(side: number, y: number) {
        const back = this.rear, front = this.front;
        const left = side === 0, dir = left ? 1 : -1, origin = left ? 0 : WIDTH;
        const at = (distance: number) => origin + dir * distance;
        const top = y - GOAL.halfHeight, bottom = y + GOAL.halfHeight, accent = left ? P.cyan : P.red;
        // Far frame recedes upward. Near posts and mesh are drawn over the gameplay layer.
        back.fillStyle(P.void, .55).fillTriangle(at(4), top - 12, at(66), top - 12, at(4), bottom - 12);
        back.fillTriangle(at(4), bottom - 12, at(66), top - 12, at(66), bottom - 12);
        back.lineStyle(3, 0x555f72, .85).strokeRect(Math.min(at(4), at(66)), top - 12, 62, GOAL.halfHeight * 2);
        back.lineStyle(1, P.text, .18);
        for (let yy = top - 12; yy <= bottom - 12; yy += 12) back.lineBetween(at(4), yy, at(66), yy);
        for (let xx = 6; xx < 66; xx += 12) back.lineBetween(at(xx), top - 12, at(xx), bottom - 12);
        back.lineStyle(2, 0x69788e).lineBetween(at(4), top - 12, at(18), top).lineBetween(at(66), top - 12, at(80), top).lineBetween(at(4), bottom - 12, at(18), bottom).lineBetween(at(66), bottom - 12, at(80), bottom);
        back.fillStyle(P.void, .4).fillEllipse(at(42), bottom + 5, 88, 12);
        // Near side of the net. Thin strands partially occlude an entering ball.
        front.lineStyle(1, P.text, .32);
        for (let yy = top + 12; yy < bottom; yy += 12) front.lineBetween(at(18), yy, at(80), yy);
        for (let xx = 18; xx < 80; xx += 12) front.lineBetween(at(xx), top, at(xx), bottom);
        front.lineStyle(3, 0x7d8798, .75).lineBetween(at(18), top, at(18), bottom).lineBetween(at(18), bottom, at(80), bottom);
        front.lineStyle(7, 0x252c3c).lineBetween(at(80), top - 3, at(80), bottom + 2).lineBetween(at(17), top - 3, at(80), top - 3);
        front.lineStyle(4, accent).lineBetween(at(80), top, at(80), bottom).lineBetween(at(18), top, at(80), top);
        front.lineStyle(1, P.text, .8).lineBetween(at(78), top + 3, at(78), bottom - 2).lineBetween(at(20), top - 1, at(78), top - 1);
        front.fillStyle(0x454d60).fillRect(Math.min(at(73), at(87)), bottom - 1, 14, 5);
    }
    private basket(x: number, y: number, ballRadius: number) {
        const back = this.rear, front = this.front, dir = x < WIDTH / 2 ? -1 : 1, boardX = x + dir * BASKET.boardOffset;
        const accent = dir === -1 ? P.cyan : P.red;
        // Steel support and the measured 10x106 backboard collider.
        back.lineStyle(9, 0x252c3c).lineBetween(boardX + dir * 10, FLOOR, boardX + dir * 10, y - 96);
        back.lineStyle(2, 0x63708a).lineBetween(boardX + dir * 12, FLOOR - 5, boardX + dir * 12, y - 95);
        back.fillStyle(P.void, .45).fillEllipse(boardX, FLOOR + 4, 50, 9);
        back.fillStyle(this.material).fillRect(boardX - 5, y - 93, 10, 106);
        back.fillStyle(0xd3e3ed).fillRect(boardX - 2, y - 93, 4, 106);
        back.lineStyle(1, P.text, .9).lineBetween(boardX - dir * 4, y - 88, boardX - dir * 4, y + 9);
        back.lineStyle(5, this.material).lineBetween(boardX, y - 4, x + dir * BASKET.rimHalf, y - 4);
        const netBottom = Math.max(29, ballRadius + 3);
        // Net rear half, then the ball, then the near half of the rim and net.
        back.lineStyle(1.4, 0x74829b, .55);
        for (let i = 0; i <= 8; i++) {
            const offset = -46 + i * 11.5;
            back.lineBetween(x + offset, y - 4, x + offset * netBottom / 46, y + BASKET.netDepth);
        }
        for (let row = 1; row <= 4; row++) {
            const h = row * 12, half = 46 - (46 - netBottom) * h / BASKET.netDepth;
            back.strokeEllipse(x, y + h, half * 2, 7);
        }
        // Elliptical rear rim. The endpoints match the physical rim pieces at x +/- 50.
        back.lineStyle(5, this.material).beginPath();
        for (let i = 0; i <= 20; i++) { const a = Math.PI + i * Math.PI / 20, xx = x + Math.cos(a) * BASKET.rimHalf, yy = y + Math.sin(a) * 8; if (!i) back.moveTo(xx, yy); else back.lineTo(xx, yy); }
        back.strokePath();
        front.lineStyle(1.5, P.text, .72);
        for (let i = 0; i < 7; i++) {
            const offset = -42 + i * 14;
            front.lineBetween(x + offset, y + 5, x + offset * netBottom / 46, y + BASKET.netDepth);
            if (i < 6) front.lineBetween(x + offset, y + 17, x + (offset + 14) * .83, y + 30);
        }
        for (let row = 1; row <= 4; row++) { const h = row * 12, half = 46 - (46 - netBottom) * h / BASKET.netDepth; front.lineBetween(x - half, y + h + 3, x + half, y + h + 3); }
        front.lineStyle(6, accent).beginPath();
        for (let i = 0; i <= 20; i++) { const a = i * Math.PI / 20, xx = x + Math.cos(a) * BASKET.rimHalf, yy = y + Math.sin(a) * 8; if (!i) front.moveTo(xx, yy); else front.lineTo(xx, yy); }
        front.strokePath();
        front.lineStyle(1, P.text, .85).lineBetween(x - 39, y + 5, x + 39, y + 5);
    }
    private volleyball() {
        const back = this.rear, front = this.front, top = FLOOR - 176;
        back.fillStyle(P.text, .035).fillRect(550, top, 20, 176);
        back.lineStyle(1, this.material, .4);
        for (let y = top; y <= FLOOR; y += 12) back.lineBetween(550, y, 570, y);
        back.lineBetween(550, top, 550, FLOOR).lineBetween(570, top, 570, FLOOR);
        front.lineStyle(1, P.text, .35);
        for (let y = top + 6; y <= FLOOR; y += 12) front.lineBetween(554, y, 566, y);
        front.lineStyle(5, 0x374154).lineBetween(560, top, 560, FLOOR);
        front.lineStyle(2, P.text).lineBetween(558, top, 558, FLOOR);
        front.lineStyle(5, P.cyan).lineBetween(548, top, 572, top);
        front.lineStyle(1, P.text, .8).lineBetween(548, top - 2, 572, top - 2);
        front.fillStyle(P.border).fillRect(550, FLOOR - 3, 20, 6);
    }
}
