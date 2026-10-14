import Phaser from 'phaser';
import { ARENAS, FLOOR, HEIGHT, WIDTH } from '../config/game';
import { ThemeRenderer } from './ThemeRenderer';
import { GoalRenderer } from './GoalRenderer';
import { LAYERS } from '../config/geometry';
import { PALETTE as P } from '../config/theme';
import type { PhysicsWorld } from '../systems/PhysicsWorld';
export class ArenaRenderer {
    bg: Phaser.GameObjects.Graphics;
    court: Phaser.GameObjects.Graphics;
    details: Phaser.GameObjects.Graphics;
    private goals: GoalRenderer;
    private themes = new ThemeRenderer();
    constructor(public scene: Phaser.Scene) {
        this.bg = scene.add.graphics(); this.details = scene.add.graphics(); this.court = scene.add.graphics(); this.goals = new GoalRenderer(scene);
    }
    build(arenaIndex: number) {
        const g = this.bg.clear(), d = this.details.clear(), a = ARENAS[arenaIndex];
        // Overscan fills the camera frustum at every aspect ratio, without letterbox borders.
        g.fillStyle(a.sky).fillRect(-2400, -1600, 5920, 4200);
        if (arenaIndex === 0) {
            g.fillStyle(0x1a2027).fillRect(-1200, 170, 3520, 350);
            for (let x = -200; x < 1400; x += 220) {
                g.lineStyle(22, 0x272e37).lineBetween(x, 0, x, 520);
                g.lineStyle(4, 0x59606b, .5).lineBetween(x - 14, 0, x - 14, 520);
                g.lineStyle(18, 0x35404c).lineBetween(x, 215, x + 160, 215);
                g.lineStyle(3, 0x8793a3, .45).lineBetween(x, 208, x + 160, 208);
                g.fillStyle(0x080b10).fillRoundedRect(x + 40, 295, 118, 208, 48);
                g.lineStyle(3, 0x46515d).strokeRoundedRect(x + 40, 295, 118, 208, 48);
                g.fillStyle(a.accent, .6).fillRect(x + 65, 289, 64, 5);
                g.fillStyle(0x313b44).fillRect(x + 25, 128, 82, 40);
                for (let k = 0; k < 6; k++) g.lineStyle(2, 0x10161e).lineBetween(x + 33 + k * 12, 133, x + 33 + k * 12, 163);
            }
            g.lineStyle(5, 0x454a52).lineBetween(-400, 82, 1600, 82);
        } else if (arenaIndex === 1) {
            g.fillStyle(0x8da8a0, .6).fillCircle(854, 176, 34);
            for (let i = 0; i < 5; i++) g.fillStyle(i % 2 ? 0x23372f : 0x1c302a).fillEllipse(i * 320 - 120, 417 + i % 2 * 45, 830, 260);
            for (let x = -100; x < 1250; x += 90) {
                const y = 395 + (x * 13 % 41);
                g.fillStyle(0x11271f).fillRect(x, y - 100, 7, 112).fillTriangle(x - 29, y - 15, x + 36, y - 15, x + 3, y - 133);
            }
            g.fillStyle(0x293d2f).fillRect(-1500, 480, 4120, 45);
            g.lineStyle(3, 0x43564c).lineBetween(-100, 457, 1250, 457);
            for (let x = 0; x < WIDTH; x += 120) g.fillStyle(0x506652).fillRect(x, 451, 7, 61);
        } else if (arenaIndex === 2) {
            for (let i = 0; i < 45; i++) g.fillStyle(0xeeeeff, .4).fillRect((i * 193) % WIDTH, (i * 89) % 300, 2, 2);
            g.fillStyle(0xba6450, .7).fillCircle(894, 171, 28);
            for (let i = 0; i < 8; i++) {
                const x = i * 180 - 140;
                g.fillStyle(0x46262b).fillTriangle(x - 130, 470, x + 130, 470, x, 260 + i % 3 * 34);
                g.fillStyle(0x683a36).fillTriangle(x, 300 + i % 3 * 30, x + 28, 470, x + 135, 470);
            }
            g.fillStyle(0x9b6550).fillRect(-1200, 465, 3520, 65);
            for (const x of [112, 735]) {
                g.fillStyle(0x343442).fillRoundedRect(x, 360, 225, 128, 42);
                g.lineStyle(3, 0xa4978c).strokeRoundedRect(x, 360, 225, 128, 42);
                g.fillStyle(0x071c26).fillRect(x + 40, 386, 143, 40);
                for (let i = 0; i < 4; i++) g.fillStyle(P.cyan, .22).fillRect(x + 48 + i * 33, 394, 22, 23);
                g.lineStyle(4, 0x343442).lineBetween(x + 112, 360, x + 112, 326);
            }
        } else if (arenaIndex === 3) {
            g.fillStyle(0xa8b7cd, .45).fillCircle(870, 174, 34);
            for (let i = -2; i < 18; i++) {
                const h = 80 + (Math.abs(i) * 71) % 180, x = i * 80;
                g.fillStyle(i % 2 ? 0x131825 : 0x1d2434).fillRect(x, 470 - h, 72, h);
                for (let j = 0; j < 3; j++) for (let k = 0; k < 5; k++) if ((j + k + i) % 3) g.fillStyle(k % 2 ? P.cyan : P.red, .27).fillRect(x + 12 + j * 18, 480 - h + k * 30, 5, 10);
            }
            g.fillStyle(0x253145).fillRect(-1200, 483, 3520, 42);
            for (const x of [135, 945]) { g.lineStyle(5, 0x414c63).lineBetween(x, 483, x, 226); g.fillStyle(P.cyan, .28).fillRect(x - 45, 229, 90, 36); }
        } else if (arenaIndex === 4) {
            g.fillStyle(0x1a292b).fillRect(-1200, 200, 3520, 315);
            for (const x of [140, 560, 980]) {
                g.fillStyle(0x080e13).fillCircle(x, 340, 98);
                g.lineStyle(13, 0x36484a).strokeCircle(x, 340, 97);
                g.lineStyle(3, a.accent, .3).strokeCircle(x, 340, 81);
                g.fillStyle(0x31484a).fillRect(x - 12, 430, 24, 75);
            }
            for (let x = -100; x < 1300; x += 130) { g.lineStyle(12, 0x35484b).lineBetween(x, 190, x, 0); g.fillStyle(a.accent, .26).fillRect(x - 8, 80, 16, 80); }
            g.lineStyle(7, 0x576962).lineBetween(-100, 489, 1300, 489);
            g.fillStyle(0x121d1e).fillRect(-1200, 502, 3520, 28);
        }
        if (arenaIndex >= 5) this.themes.build(g, a);
        // A quiet perimeter line anchors the upper edge of the arena.
        d.fillStyle(P.void, .5).fillRect(0, 0, WIDTH, 116);
        d.lineStyle(2, a.accent, .45).lineBetween(0, 120, WIDTH, 120);
        // Put static background geometry behind the label and all gameplay objects.
        this.bg.setDepth(LAYERS.background); this.details.setDepth(LAYERS.rearStructure); this.court.setDepth(LAYERS.court);
    }
    draw(w: PhysicsWorld, t: number) {
        const g = this.court.clear(), a = ARENAS[w.arenaIndex], knockout = w.sportId === 'knockout';
        const floorX = knockout ? 560 - w.platformHalf : 0, floorW = knockout ? w.platformHalf * 2 : WIDTH;
        if (knockout) {
            // The suspended slab separates the full environment above from the chasm below.
            g.fillStyle(0x060b10).fillRect(-2000, FLOOR + 3, 5120, 2300);
            for (let band = 0; band < 32; band++) {
                const y = FLOOR + 3 + band * 10;
                g.fillStyle(a.near, Math.max(0, .45 - band * .013)).fillRect(0, y, WIDTH, 10);
            }
            for (let i = 0; i < 16; i++) {
                const x = (i * 179 + 49) % WIDTH, y = FLOOR + 15 + ((t * .035 + i * 47) % 330);
                g.lineStyle(1, a.accent, .12).lineBetween(x, y, x, y + 8);
            }
            for (let i = 0; i < 3; i++) {
                g.fillStyle(a.accent, .022).fillEllipse(560 + Math.sin(t * .00025 + i) * 170, FLOOR + 70 + i * 35, 800 - i * 100, 35);
            }
            g.fillStyle(P.cyan, .1).fillRect(530, 615, 60, 1);
            g.fillStyle(a.floor).fillRect(floorX, FLOOR, floorW, 35);
            g.fillStyle(P.void, .5).fillRect(floorX, FLOOR + 23, floorW, 12);
            g.fillStyle(P.red).fillRect(floorX, FLOOR, 20, 6).fillRect(floorX + floorW - 20, FLOOR, 20, 6);
            g.lineStyle(2, P.red, .25).lineBetween(floorX, FLOOR + 6, floorX, FLOOR + 28).lineBetween(floorX + floorW, FLOOR + 6, floorX + floorW, FLOOR + 28);
            g.fillStyle(P.acid, .75);
            for (const x of [floorX + 25, floorX + floorW - 80]) for (let i = 0; i < 4; i++) g.fillTriangle(x + i * 14, FLOOR + 8, x + i * 14 + 8, FLOOR + 8, x + i * 14, FLOOR + 20);
        } else {
            g.fillStyle(a.floor).fillRect(-2000, FLOOR, 5120, 2200);
            g.fillStyle(P.void, .25).fillRect(0, FLOOR + 7, WIDTH, 10);
            g.lineStyle(1, P.text, .09);
            for (let x = 40; x < WIDTH; x += 110) g.lineBetween(x, FLOOR + 15, x - 32, HEIGHT);
            g.lineBetween(0, FLOOR + 65, WIDTH, FLOOR + 65);
        }
        // Shared material treatment belongs to the theme, independent of the sport.
        if (a.groundStyle === 'snow') {
            g.fillStyle(0xe4edf0, .55).fillRect(floorX, FLOOR + 3, floorW, 5);
            for(let i=0;i<12;i++) g.fillStyle(0xbed6df,.25).fillEllipse(floorX+i*floorW/12,FLOOR+17,36,5);
        } else if (a.groundStyle === 'sand') {
            for(let i=0;i<18;i++) g.fillStyle(a.accent,.14).fillRect(floorX+(i*73)%floorW,FLOOR+9+i%3*7,3,1);
        } else if (a.groundStyle === 'metal') {
            g.lineStyle(1,a.accent,.18);
            for(let x=floorX+10;x<floorX+floorW;x+=100) g.strokeRect(x,FLOOR+9,80,13);
        } else if (a.groundStyle === 'stone') {
            g.lineStyle(1,0x111920,.28);
            for(let x=floorX+20;x<floorX+floorW;x+=140) g.lineBetween(x,FLOOR+5,x+10,FLOOR+20).lineBetween(x+10,FLOOR+20,x+35,FLOOR+24);
        }
        g.fillStyle(a.accent, .65 + Math.sin(t * .001) * .1).fillRect(floorX + (knockout ? 20 : 0), FLOOR, floorW - (knockout ? 40 : 0), 3);
        // Narrow cones illuminate the play area without masking the ball.
        for (const x of [140, 980]) g.fillStyle(a.lighting, .025).fillTriangle(x - 14, 126, x - 150, FLOOR, x + 150, FLOOR);
        this.goals.draw(w);
        if (w.sportId === 'soccer') g.lineStyle(2, P.text, .25).lineBetween(560, FLOOR + 7, 560, HEIGHT).strokeEllipse(560, FLOOR + 49, 170, 68);
        // Theme-specific motion stays in the environment and never covers the ball.
        if (w.arenaIndex === 0) {
            for (let i = 0; i < 8; i++) g.fillStyle(0xc8ccd5, .12).fillCircle((i * 137 + t * .012) % WIDTH, 210 + ((i * 41 + t * .008) % 110), 1.5);
            g.fillStyle(P.red, .35 + Math.sin(t * .003) * .2).fillRect(104, 287, 8, 6);
        } else if (w.arenaIndex === 1) {
            g.lineStyle(2, 0x678750, .5);
            for (let i = 0; i < 28; i++) { const x = floorX + i * floorW / 28; g.lineBetween(x, FLOOR + 7, x + Math.sin(t * .0017 + i) * 5, FLOOR - 8); }
        } else if (w.arenaIndex === 2) {
            for (let i = 0; i < 14; i++) g.fillStyle(0xf4c799, .11).fillRect((i * 89 + t * .021) % WIDTH, 450 + i % 3 * 15, 2, 2);
            g.lineStyle(3, 0xb18c6b).lineBetween(floorX, FLOOR + 12, floorX + floorW, FLOOR + 12);
        } else if (w.arenaIndex === 3) {
            g.lineStyle(1, P.cyan, .13);
            for (let i = 0; i < 22; i++) { const y = (t * .12 + i * 37) % 490; const x = i * 53; g.lineBetween(x, y, x - 3, y + 12); }
            if (!knockout) g.fillStyle(P.cyan, .07).fillEllipse(820, FLOOR + 35, 230, 15);
        } else if (w.arenaIndex === 4) {
            for (const x of [140, 560, 980]) {
                g.lineStyle(8, 0x426963, .5);
                for (let i = 0; i < 4; i++) { const angle = t * .00035 + i * Math.PI / 2; g.lineBetween(x, 340, x + Math.cos(angle) * 69, 340 + Math.sin(angle) * 69); }
            }
            g.fillStyle(a.accent, .4 + Math.sin(t * .0018) * .15).fillRect(floorX, FLOOR + 16, floorW, 2);
            g.fillStyle(0xffb638, .6);
            for (let x = floorX + 25; x < floorX + floorW - 14; x += 135) g.fillTriangle(x, FLOOR + 5, x + 14, FLOOR + 5, x, FLOOR + 18);
        }
        if (w.arenaIndex >= 5) this.themes.ambient(g, a, t);
        if (w.rules.friction < .02) {
            g.lineStyle(2, P.cyan, .5);
            for (let x = floorX + 20; x < floorX + floorW - 65; x += 120) g.lineBetween(x, FLOOR + 23, x + 63, FLOOR + 23);
        }
        if (w.rules.wind) {
            g.lineStyle(2, P.text, .18);
            for (let i = 0; i < 7; i++) { const x = ((t * .08 + i * 175) % 1320) - 100, y = 240 + i % 3 * 60; g.lineBetween(x, y, x + 65, y).lineBetween(x + 54, y - 5, x + 65, y); }
        }
        g.fillStyle(P.void, .15).fillRect(0, 130, 22, 380).fillRect(WIDTH - 22, 130, 22, 380);
    }
}
