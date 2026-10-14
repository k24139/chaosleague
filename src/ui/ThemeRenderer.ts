import type Phaser from 'phaser';
import type { ArenaTheme } from '../config/themes';
import { FLOOR, WIDTH } from '../config/game';

// Static scene layers are assembled once per arena. Only a small ambient pass
// changes during play; themes never create or modify physics bodies.
export class ThemeRenderer {
    private ridge(g: Phaser.GameObjects.Graphics, color: number, y: number, height: number, seed = 0) {
        g.fillStyle(color).beginPath().moveTo(-1200, FLOOR);
        for (let i = -5; i < 11; i++) {
            const x = i * 240;
            g.lineTo(x, y).lineTo(x + 110, y - height * (.65 + Math.sin(i * 2 + seed) * .28)).lineTo(x + 240, y + 15);
        }
        g.lineTo(2600, FLOOR).closePath().fillPath();
    }
    private pine(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number) {
        g.fillStyle(color).fillRect(x - size * .04, y - size, size * .08, size);
        for (let i = 0; i < 3; i++) g.fillTriangle(x - size * (.2 + i * .07), y - size * (.45 - i * .14), x + size * (.2 + i * .07), y - size * (.45 - i * .14), x, y - size * (1.25 - i * .2));
    }
    private stars(g: Phaser.GameObjects.Graphics) {
        for (let i = 0; i < 64; i++) g.fillStyle(0xd5e3eb,.25 + i % 3 * .15).fillRect((i * 197) % WIDTH, 125 + (i * 83) % 220, i % 7 ? 1 : 2, i % 7 ? 1 : 2);
    }
    private habitat(g: Phaser.GameObjects.Graphics, x: number, y: number, a: ArenaTheme) {
        g.fillStyle(a.near).fillRect(x,y,190,95);
        g.fillStyle(a.mid).fillTriangle(x-8,y,x+198,y,x+145,y-28);
        g.fillStyle(a.accent,.5).fillRect(x+14,y+17,160,24);
        for(let i=0;i<5;i++) g.fillStyle(a.near).fillRect(x+39+i*30,y+17,5,24);
        g.lineStyle(3,a.near).lineBetween(x+140,y-28,x+140,y-63);
        g.fillStyle(a.accent,.8).fillCircle(x+140,y-63,3);
    }
    build(g: Phaser.GameObjects.Graphics, a: ArenaTheme) {
        switch(a.id) {
            case 'desert': {
                g.fillStyle(0xefdfb2,.65).fillCircle(875,185,42);
                this.ridge(g,a.far,390,100,3);
                for(let i=0;i<4;i++) g.fillStyle(i%2?a.mid:0x9b8f78).fillEllipse(i*360-100,495+i%2*14,950,190);
                for(const x of [100,890]) { g.fillStyle(a.near).fillTriangle(x,505,x+65,505,x+28,434); g.fillRect(x+52,472,35,33); }
                g.lineStyle(3,0x6b7155);
                for(const x of [205,935,1010]) g.lineBetween(x,518,x-5,484).lineBetween(x-4,502,x-16,491).lineBetween(x-3,497,x+10,487);
                break;
            }
            case 'snow': case 'arctic': {
                this.ridge(g,a.far,445,160,2); this.ridge(g,a.mid,490,115,5);
                for(let i=0;i<7;i++) { const x=i*215-80; g.fillStyle(0xc6d7db,.7).fillTriangle(x+62,377,x+96,398,x+120,390); }
                if(a.id==='snow') for(let i=-1;i<10;i++) this.pine(g,i*140+30,510,70+i%3*35,a.near);
                else { this.habitat(g,145,406,a); this.habitat(g,765,410,a); g.lineStyle(8,a.near).lineBetween(940,360,940,280); g.lineStyle(3,a.accent,.8).strokeEllipse(940,280,85,28); }
                g.fillStyle(0xd4e2e5,.6).fillRect(-1600,516,4320,14);
                break;
            }
            case 'forest': {
                for(let layer=0;layer<3;layer++) {
                    const c=[a.far,a.mid,a.near][layer];
                    for(let i=-1;i<12;i++) { const x=i*(130+layer*13)+layer*50; g.fillStyle(c).fillRect(x,155+layer*20,12+layer*7,375); g.fillEllipse(x+8,195+layer*12,145,200); }
                    if(layer<2) g.fillStyle(0xaac4b2,.055).fillRect(-1200,365+layer*60,3520,75);
                }
                for(const x of [190,520,910]) g.fillStyle(a.accent,.06).fillTriangle(x,180,x+35,180,x+210,505);
                break;
            }
            case 'mountain': {
                this.ridge(g,a.far,445,230,1); this.ridge(g,a.mid,495,180,4); this.ridge(g,a.near,560,100,8);
                for(let i=0;i<7;i++) { const x=i*240; g.fillStyle(0xc7d9df,.4).fillTriangle(x+58,345,x+110,301,x+137,350); }
                g.lineStyle(2,a.accent,.35).lineBetween(120,477,900,399);
                g.fillStyle(a.near).fillRect(705,420,28,35); g.fillStyle(a.accent,.6).fillRect(710,425,18,13);
                break;
            }
            case 'beach': {
                g.fillStyle(0xe3d7b1,.55).fillCircle(854,202,39);
                g.fillStyle(a.mid).fillRect(-1800,355,4720,175);
                g.lineStyle(2,0xb8d6d6,.6).lineBetween(-1200,355,2320,355);
                g.fillStyle(a.far).fillEllipse(760,365,320,58);
                g.fillStyle(a.near).fillTriangle(638,355,840,355,740,300);
                g.fillStyle(a.floor).fillEllipse(540,580,2000,180);
                for(const x of [100,1010]) {
                    g.lineStyle(10,a.near).lineBetween(x,520,x+23,330);
                    for(let i=0;i<5;i++) g.lineStyle(8,a.near).lineBetween(x+23,330,x+23+Math.cos(i*.75+3.3)*75,330+Math.sin(i*.75+3.3)*42);
                }
                break;
            }
            case 'neighborhood': {
                for(let i=-1;i<8;i++) { const x=i*190, y=360+i%2*35; g.fillStyle(a.far).fillRect(x,y,165,135); g.fillTriangle(x-12,y,x+177,y,x+82,y-68); }
                for(const x of [115,750]) {
                    g.fillStyle(a.mid).fillRect(x,370,215,135); g.fillStyle(0x3e4247).fillTriangle(x-18,370,x+233,370,x+108,290);
                    g.fillStyle(a.accent,.42).fillRect(x+25,392,40,44).fillRect(x+140,392,45,44);
                    g.fillStyle(a.near).fillRect(x+85,432,46,73);
                }
                this.pine(g,495,495,135,a.near); this.pine(g,1000,515,120,a.near);
                for(let x=-100;x<1250;x+=18) g.fillStyle(0x7a8175).fillRect(x,480,5,50);
                g.lineStyle(3,0x7a8175).lineBetween(-100,485,1250,485).lineBetween(-100,510,1250,510);
                for(const x of [70,1050]) { g.lineStyle(5,a.near).lineBetween(x,525,x,280).lineBetween(x,280,x+40,280); g.fillStyle(a.accent,.8).fillRect(x+25,278,20,5); }
                break;
            }
            case 'underwater': {
                this.ridge(g,a.far,520,90,4);
                for(let i=0;i<6;i++) g.fillStyle(a.accent,.035).fillTriangle(i*230,135,i*230+60,135,i*230+180,525);
                for(let x=-100;x<1300;x+=210) { g.lineStyle(12,a.near).lineBetween(x,126,x,530); g.lineStyle(2,a.accent,.3).lineBetween(x+8,126,x+8,530); }
                g.lineStyle(12,a.near).lineBetween(-1200,160,2320,160).lineBetween(-1200,510,2320,510);
                for(const x of [75,990]) { g.fillStyle(a.mid).fillRect(x,475,60,40); g.fillStyle(a.accent,.35).fillRect(x+10,485,40,7); }
                break;
            }
            case 'sky': {
                for(let i=0;i<6;i++) g.fillStyle(i%2?a.far:a.mid,.7).fillEllipse(i*270-150,310+i%3*60,480,75);
                g.fillStyle(a.near).fillTriangle(735,450,895,450,820,482).fillRect(735,438,160,12);
                g.fillStyle(a.accent,.5).fillRect(765,451,16,7).fillRect(850,451,16,7);
                g.lineStyle(6,a.near).lineBetween(150,530,150,400).lineBetween(970,530,970,400);
                g.fillStyle(a.accent,.4).fillRect(137,401,26,7).fillRect(957,401,26,7);
                break;
            }
            case 'moon': {
                this.stars(g);
                g.fillStyle(0x518ca7).fillCircle(810,228,76); g.fillStyle(0x9ebaae,.8).fillEllipse(786,212,47,60).fillEllipse(841,242,35,43);
                g.lineStyle(5,0xdae7e8,.45).strokeCircle(810,228,77);
                this.ridge(g,a.far,500,55,8);
                g.fillStyle(a.mid).fillEllipse(550,562,1800,150);
                for(let i=0;i<9;i++) g.fillStyle(a.near,.55).fillEllipse(i*130,507+i%2*13,70,14);
                this.habitat(g,95,411,a); this.habitat(g,875,428,a);
                break;
            }
            case 'sun': {
                for(let r=180;r>=150;r-=10) g.fillStyle(0xffb75b,.07).fillCircle(680,283,r);
                g.fillStyle(0xdc9252).fillCircle(680,283,150); g.fillStyle(0xffcf73,.7).fillCircle(662,267,136);
                g.lineStyle(5,0xe18341,.6).strokeEllipse(684,288,250,180);
                for(const x of [165,860]) { g.fillStyle(a.near).fillRect(x,200,100,330); g.lineStyle(4,a.mid).strokeRect(x,200,100,330); for(let i=0;i<5;i++) g.fillStyle(a.accent,.3).fillRect(x+12,222+i*58,76,4); }
                g.fillStyle(a.near).fillRect(-1200,475,3520,55);
                g.lineStyle(4,a.accent,.5).lineBetween(-1200,480,2320,480);
                break;
            }
            case 'dystopia': case 'cyber': {
                for(let i=-2;i<16;i++) {
                    const x=i*105,h=90+Math.abs(i*79)%200;
                    g.fillStyle(i%2?a.far:a.mid).fillRect(x,510-h,80,h);
                    if(a.id==='dystopia') { g.fillStyle(a.sky).fillTriangle(x,510-h,x+80,510-h,x+33,548-h); g.fillRect(x+21,470-h,24,31); }
                    for(let j=0;j<5;j++) g.fillStyle(a.accent,.18).fillRect(x+12+j%2*35,530-h+j*34,9,12);
                }
                if(a.id==='cyber') { g.lineStyle(9,a.near).lineBetween(-200,440,1300,365); for(const x of [160,840]) { g.fillStyle(a.near).fillRect(x,230,65,145); g.fillStyle(a.accent,.4).fillRect(x+14,250,37,85); } }
                else { for(const x of [110,990]) { g.lineStyle(6,a.near).lineBetween(x,520,x,265); g.fillStyle(a.accent,.7).fillRect(x-10,259,30,10); } g.fillStyle(a.near).fillRect(400,455,215,60); g.fillStyle(a.accent,.25).fillRect(420,465,66,10); }
                break;
            }
            case 'storm': {
                for(let i=0;i<6;i++) g.fillStyle(a.far,.75).fillEllipse(i*250-50,230+i%2*75,440,120);
                this.ridge(g,a.mid,525,120,3);
                for(const x of [160,910]) { g.lineStyle(5,a.near).lineBetween(x,520,x,240); g.lineStyle(3,a.near).lineBetween(x-45,285,x+45,285).lineBetween(x,245,x-65,520).lineBetween(x,245,x+65,520); }
                g.lineStyle(1,a.near).lineBetween(160,280,910,280);
                break;
            }
            case 'volcano': {
                this.ridge(g,a.far,480,125,7);
                g.fillStyle(a.mid).fillTriangle(360,530,845,530,630,238);
                g.fillStyle(a.accent,.75).fillEllipse(630,243,57,12);
                g.lineStyle(4,a.accent,.45).lineBetween(639,251,659,300).lineBetween(659,300,650,355).lineBetween(650,355,690,408);
                this.ridge(g,a.near,552,55,9);
                break;
            }
            case 'ruins': {
                this.ridge(g,a.far,485,80,6);
                for(let i=-1;i<7;i++) this.pine(g,i*225,520,90,a.mid);
                for(const x of [150,420,725,960]) { g.fillStyle(a.near).fillRect(x,310,46,215).fillRect(x-9,307,64,13).fillRect(x-5,510,56,15); g.fillStyle(a.mid).fillRect(x+7,333,5,158).fillRect(x+30,333,5,158); }
                g.fillStyle(a.near).fillRect(137,292,330,17).fillTriangle(137,292,210,245,467,292);
                g.lineStyle(3,0x84966c,.6).lineBetween(166,325,181,397).lineBetween(181,397,162,462);
                break;
            }
            case 'orbital': {
                this.stars(g); g.fillStyle(0x417787).fillCircle(725,555,230); g.lineStyle(12,0x8ec5c8,.45).strokeCircle(725,555,232);
                for(const x of [95,990]) { g.fillStyle(a.near).fillRect(x,120,35,410); g.lineStyle(5,a.mid).lineBetween(x,160,x+95,220).lineBetween(x,450,x+95,390); }
                g.fillStyle(a.near).fillRect(-1200,130,3520,35).fillRect(-1200,485,3520,45);
                for(let x=130;x<1000;x+=110) g.fillStyle(a.accent,.4).fillRect(x,145,55,4);
                g.fillStyle(a.mid).fillRect(270,330,170,45); g.fillStyle(a.accent,.7).fillRect(280,343,12,18);
                g.lineStyle(3,a.mid).lineBetween(440,353,495,353);
                break;
            }
        }
    }
    ambient(g: Phaser.GameObjects.Graphics, a: ArenaTheme, t: number) {
        const particle = a.particles;
        const count = particle === 'snow' || particle === 'rain' ? 24 : 10;
        for(let i=0;i<count;i++) {
            const x=((i*137+t*(particle==='rain'?-.025:.012))%1200+1200)%1200-40;
            const y=145+((i*79+t*(particle==='bubbles'?-.018:.035))%365+365)%365;
            if(particle==='rain') g.lineStyle(1,a.accent,.18).lineBetween(x,y,x-4,y+13);
            else if(particle==='bubbles') g.lineStyle(1,a.accent,.2).strokeCircle(x,y,2+i%3);
            else if(particle==='cloud') { if(i<4) g.fillStyle(a.far,.13).fillEllipse(x,280+i*42,250,24); }
            else g.fillStyle(particle==='leaves'?a.accent:0xe6ecea,particle==='snow'?.4:.16).fillRect(x,y,particle==='snow'?2:3,particle==='leaves'?2:1);
        }
        if(a.id==='beach') for(let i=0;i<4;i++) g.lineStyle(2,0xc7e1dc,.2).lineBetween(180+i*240,400+Math.sin(t*.001+i)*6,290+i*240,400+Math.sin(t*.001+i)*6);
        if(a.id==='underwater') for(let i=0;i<3;i++) {
            const x=(t*.025+i*415)%1360-120,y=240+i*70;
            g.fillStyle(0x071c2b,.6).fillEllipse(x,y,62,16).fillTriangle(x-30,y,x-48,y-12,x-48,y+12);
            g.lineStyle(2,a.accent,.08).strokeEllipse(560+Math.sin(t*.0008)*100,330+i*50,700,65);
        }
        if(a.id==='dystopia') for(const x of [110,990]) {
            const target=x+Math.sin(t*.0003+x)*300;
            g.fillStyle(a.accent,.05).fillTriangle(x,265,target-60,500,target+60,500);
        }
        if(a.id==='sun') g.lineStyle(5,0xffd48b,.25).strokeEllipse(680+Math.sin(t*.0004)*30,290,320,170+Math.sin(t*.0005)*35);
        if(a.id==='storm') g.fillStyle(0xdce8f0,Math.pow(Math.max(0,Math.sin(t*.0007)),30)*.08).fillRect(-1200,125,3520,405);
    }
}
