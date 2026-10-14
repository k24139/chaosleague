import Phaser from 'phaser';
import { TEAMS, FLOOR, type Side } from '../config/game';
import { LAYERS } from '../config/geometry';
import { PALETTE } from '../config/theme';
import type { PhysicsWorld } from '../systems/PhysicsWorld';
export class EntityRenderer {
    graphics: Phaser.GameObjects.Graphics;
    constructor(scene: Phaser.Scene) { this.graphics = scene.add.graphics().setDepth(LAYERS.entities); }
    draw(w: PhysicsWorld, time: number, winner: Side | null = null) {
        const g = this.graphics.clear(), ink = PALETTE.void;
        for (const p of w.players) {
            const pos = p.body.position, team = TEAMS[p.team];
            const fade = w.sportId === 'knockout' ? Math.max(0, 1 - Math.max(0, pos.y - FLOOR - 8) / 110) : 1;
            if (!fade) continue;
            const celebrate = winner === p.side;
            if (pos.y < FLOOR + 20 && (w.sportId !== 'knockout' || Math.abs(pos.x - 560) < w.platformHalf)) g.fillStyle(ink, .5).fillEllipse(pos.x, FLOOR - 2, 66 * p.scale, 10);
            g.save(); g.translateCanvas(pos.x, pos.y); g.rotateCanvas(p.body.angle);
            const squash = Math.min(.11, p.stun / 230 * .11), stretch = Math.min(.07, Math.abs(p.body.velocity.y) * .005);
            g.scaleCanvas(p.scale * (1 + squash - stretch), p.scale * (1 - squash + stretch));
            const run = Math.sin(time * .018) * Math.min(8, Math.abs(p.body.velocity.x) * 1.7), jump = p.body.velocity.y < -2;
            // Heavy boots and clenched fists give the silhouette a competitive stance.
            g.lineStyle(9, PALETTE.border, fade).lineBetween(-12, 22, -18 + run, 40).lineBetween(12, 22, 18 - run, 40);
            g.fillStyle(PALETTE.text, fade).fillRoundedRect(-27 + run, 35, 20, 8, 2).fillRoundedRect(7 - run, 35, 20, 8, 2);
            const holding = w.balls.some(b => b.holder === p.side);
            const fistY = celebrate ? -38 : holding ? -12 : jump ? -24 : p.stun ? 18 : 7;
            g.lineStyle(10, PALETTE.border, fade).lineBetween(-20, 0, -34, fistY).lineBetween(20, 0, 34, fistY);
            g.fillStyle(team.color, fade).fillRoundedRect(-40, fistY - 5, 13, 13, 3).fillRoundedRect(27, fistY - 5, 13, 13, 3);
            g.fillStyle(team.color, fade).fillRoundedRect(-24, -9, 48, 40, 5);
            g.lineStyle(3, ink, fade).strokeRoundedRect(-24, -9, 48, 40, 5);
            g.fillStyle(ink, fade).fillTriangle(-20, -6, 0, 9, 20, -6).fillRoundedRect(-9, 11, 18, 15, 2);
            g.fillStyle(PALETTE.text, fade).fillRect(p.side === 0 ? -2 : -5, 14, 4, 9);
            if (p.side === 1) g.fillRect(2, 14, 4, 9);
            g.fillStyle(team.color, fade).fillRoundedRect(-30, -46, 60, 49, 9);
            g.lineStyle(3.5, ink, fade).strokeRoundedRect(-30, -46, 60, 49, 9);
            if (team.face === 'frog') {
                for (const x of [-18, 18]) { g.fillStyle(team.color, fade).fillCircle(x, -42, 12); g.lineStyle(3, ink, fade).strokeCircle(x, -42, 12); }
            }
            if (team.face === 'rocket') g.fillStyle(team.color, fade).fillTriangle(-26, -43, -17, -62, -5, -43).fillTriangle(5, -43, 17, -62, 26, -43);
            if (team.face === 'yeti') g.fillStyle(PALETTE.text, fade).fillTriangle(-28, -42, -35, -58, -15, -45).fillTriangle(15, -45, 35, -58, 28, -42);
            if (team.face === 'alien') { g.lineStyle(3, ink, fade).lineBetween(-17, -46, -25, -56).lineBetween(17, -46, 25, -56); g.fillStyle(team.color, fade).fillCircle(-26, -57, 4).fillCircle(26, -57, 4); }
            if (team.face === 'robot') { g.lineStyle(3, PALETTE.text, fade).lineBetween(0, -46, 0, -57); g.fillStyle(PALETTE.red, fade).fillRect(-3, -61, 6, 6); g.fillStyle(ink, fade).fillRect(-23, -36, 46, 17); }
            const eyeY = team.face === 'frog' ? -43 : -29;
            if (p.stun > 0) {
                g.lineStyle(3, ink, fade);
                for (const x of [-13, 13]) g.lineBetween(x - 4, eyeY - 4, x + 4, eyeY + 4).lineBetween(x - 4, eyeY + 4, x + 4, eyeY - 4);
            } else {
                g.fillStyle(PALETTE.text, fade).fillRoundedRect(-22, eyeY - 5, 17, 11, 2).fillRoundedRect(5, eyeY - 5, 17, 11, 2);
                g.fillStyle(ink, fade).fillRect(-14 + p.facing * 2, eyeY - 4, 4, 9).fillRect(10 + p.facing * 2, eyeY - 4, 4, 9);
                g.lineStyle(4, ink, fade).lineBetween(-24, eyeY - 8, -5, eyeY - 3).lineBetween(5, eyeY - 3, 24, eyeY - 8);
            }
            g.lineStyle(3, ink, fade).lineBetween(-7, -13, 7, -13);
            if (celebrate) { g.fillStyle(PALETTE.text, fade).fillRect(-7, -16, 14, 5); }
            if (p.stun > 0 && time) {
                g.fillStyle(PALETTE.acid, fade);
                for (let i = 0; i < 3; i++) g.fillRect(Math.cos(time * .012 + i * 2.1) * 24 - 2, -67 + Math.sin(time * .012 + i * 2.1) * 5, 4, 4);
            }
            g.restore();
        }
        for (const ball of w.balls) {
            const p = ball.body.position, r = ball.radius;
            g.fillStyle(ink, .35).fillEllipse(p.x, FLOOR - 2, r * 1.7, 7);
            g.save(); g.translateCanvas(p.x, p.y); g.rotateCanvas(ball.body.angle);
            g.fillStyle(w.sportId === 'basketball' ? 0xffb638 : PALETTE.text).fillCircle(0, 0, r);
            g.lineStyle(3, ink).strokeCircle(0, 0, r);
            if (w.sportId === 'basketball') { g.lineStyle(2, ink, .8).lineBetween(-r, 0, r, 0).lineBetween(0, -r, 0, r); g.strokeEllipse(0, 0, r * .9, r * 2); }
            else if (w.sportId === 'soccer') { g.fillStyle(ink).fillTriangle(-r * .5, -r * .4, r * .5, -r * .4, 0, r * .55); g.lineStyle(2, ink).lineBetween(0, r * .55, 0, r).lineBetween(-r * .5, -r * .4, -r * .8, -r * .7).lineBetween(r * .5, -r * .4, r * .8, -r * .7); }
            else { g.lineStyle(4, PALETTE.cyan).beginPath(); g.arc(0, 0, r * .7, -1.5, 1.5); g.strokePath(); g.lineStyle(3, PALETTE.violet).lineBetween(-r * .6, -r * .65, -r * .1, r * .85); }
            if (ball.holder !== null) {
                g.lineStyle(2, TEAMS[w.players[ball.holder].team].color, .8).beginPath();
                g.arc(0, 0, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(.025, ball.charge(w.elapsed))); g.strokePath();
            }
            g.restore();
        }
    }
}
