import Matter from 'matter-js';
import { RECATCH_MS, STEAL_SPEED, shotVelocity } from './BasketballPossession';
import { BASKET } from '../config/geometry';
import { Player } from '../entities/Player';
import { Ball } from '../entities/Ball';
import { Basketball } from '../sports/Basketball';
import { Soccer } from '../sports/Soccer';
import { Volleyball } from '../sports/Volleyball';
import { Knockout } from '../sports/Knockout';
import type { Sport } from '../sports/BaseSport';
import { clamp } from '../sports/BaseSport';
import { makeRules, compatible, type Rules } from './ModifierManager';
import { ARENAS, FLOOR, type Input, type Side, type SportId } from '../config/game';
export interface WorldEvent {
    type: 'jump' | 'hit' | 'score' | 'reset' | 'catch' | 'throw';
    x: number;
    y: number;
    side?: Side;
    strength?: number;
}
export class PhysicsWorld {
    engine = Matter.Engine.create({ enableSleeping: false });
    players: Player[] = [];
    balls: Ball[] = [];
    statics: Matter.Body[] = [];
    hoops: Matter.Body[] = [];
    events: WorldEvent[] = [];
    rules: Rules;
    sport: Sport;
    elapsed = 0;
    goalY = 315;
    platformHalf = 390;
    winner: Side | null = null;
    lastHit = 0;
    lastTouch: Side = 0;
    recoveryCount = 0;
    private actionPrevious = [false, false];
    constructor(public sportId: SportId, public modifierIds: string[], public arenaIndex = 0, teams = [0, 1]) {
        if (!compatible(modifierIds, sportId))
            throw new Error('Incompatible modifiers');
        this.rules = makeRules(modifierIds);
        this.rules.gravity *= ARENAS[arenaIndex].gravity;
        this.rules.friction *= ARENAS[arenaIndex].friction;
        this.engine.gravity.y = this.rules.gravity;
        this.sport = ({ basketball: () => new Basketball(), soccer: () => new Soccer(), volleyball: () => new Volleyball(), knockout: () => new Knockout() })[sportId]();
        this.sport.setup(this);
        this.players = [new Player(0, teams[0], this.rules, 310), new Player(1, teams[1], this.rules, 810)];
        Matter.Composite.add(this.engine.world, this.players.map(p => p.body));
        if (sportId !== 'knockout')
            for (let i = 0; i < (this.rules.doubleBall ? 2 : 1); i++) {
                const b = new Ball(this.rules, sportId === 'volleyball' ? (i === 0 ? 340 : 780) : 560 + i * 70, 200 - i * 60);
                Matter.Composite.add(this.engine.world, b.body);
                this.balls.push(b);
            }
        Matter.Events.on(this.engine, 'collisionStart', (event: Matter.IEventCollision<Matter.Engine>) => this.collisions(event.pairs));
    }
    addStatic(x: number, y: number, width: number, height: number, label = 'wall') { const b = Matter.Bodies.rectangle(x, y, width, height, { isStatic: true, label, friction: this.rules.friction, restitution: .06 }); this.statics.push(b); Matter.Composite.add(this.engine.world, b); return b; }
    floor(left: number, right: number) { this.addStatic((left + right) / 2, FLOOR + 25, right - left, 50, 'floor'); }
    setPosition(b: Matter.Body, x: number, y: number) { Matter.Body.setPosition(b, { x, y }); }
    setBodyHeight(b: Matter.Body, height: number) { const old = b.bounds.max.y - b.bounds.min.y; if (Math.abs(old - height) > .01)
        Matter.Body.scale(b, 1, height / old); }
    setPlatformWidth(b: Matter.Body, width: number) { const old = b.bounds.max.x - b.bounds.min.x; Matter.Body.scale(b, width / old, 1); }
    resetPlayers() { for (const b of this.balls) this.clearPossession(b); this.actionPrevious = [false, false]; for (const [i, p] of this.players.entries()) {
        Matter.Body.setPosition(p.body, { x: i === 0 ? 310 : 810, y: 430 });
        Matter.Body.setVelocity(p.body, { x: 0, y: 0 });
        Matter.Body.setAngle(p.body, 0);
    } this.recoveryCount++; }
    resetBall(b: Ball, index = 0) { this.clearPossession(b); Matter.Body.setPosition(b.body, { x: this.sportId === 'volleyball' ? (this.lastTouch === 0 ? 780 : 340) : 560 + index * 65, y: 180 }); Matter.Body.setVelocity(b.body, { x: index === 0 ? 1 : -1, y: 0 }); b.previous = { ...b.body.position }; b.idle = 0; this.events.push({ type: 'reset', x: b.body.position.x, y: 180 }); this.recoveryCount++; }
    collisions(pairs: Matter.Pair[]) {
        if (this.winner !== null) return;
        for (const pair of pairs) {
            if (this.sportId === 'basketball' && this.players.every(p => pair.bodyA === p.body || pair.bodyB === p.body)) {
                const speed = Math.hypot(pair.bodyA.velocity.x - pair.bodyB.velocity.x, pair.bodyA.velocity.y - pair.bodyB.velocity.y);
                if (speed >= STEAL_SPEED) for (const b of this.balls) if (b.holder !== null) this.releaseBall(b, false);
            }
            for (const ball of this.balls) {
                if (ball.holder !== null || this.elapsed < ball.noStrikeUntil) continue;
                if (pair.bodyA === ball.body || pair.bodyB === ball.body) {
                    const other = pair.bodyA === ball.body ? pair.bodyB : pair.bodyA;
                    const p = this.players.find(p => p.body === other);
                    if (p) {
                        ball.lastTouch = p.side;
                        this.lastTouch = p.side;
                        this.strike(p, ball, false);
                    }
                    if (this.elapsed - this.lastHit > 85) {
                        this.lastHit = this.elapsed;
                        this.events.push({ type: 'hit', x: ball.body.position.x, y: ball.body.position.y, strength: Math.min(1, Math.hypot(pair.bodyA.velocity.x - pair.bodyB.velocity.x, pair.bodyA.velocity.y - pair.bodyB.velocity.y) / 16) });
                    }
                }
            }
            if (this.sportId === 'knockout' && this.players.every(p => pair.bodyA === p.body || pair.bodyB === p.body)) {
                const [a, b] = this.players;
                const dx = b.body.position.x - a.body.position.x;
                const power = 8 + Math.min(6, Math.abs(a.body.velocity.x - b.body.velocity.x) * .45);
                for (const p of [a, b]) {
                    p.stun = 200;
                    Matter.Body.setVelocity(p.body, { x: p.body.velocity.x + (p === a ? -1 : 1) * Math.sign(dx) * power, y: Math.min(p.body.velocity.y, -2.5) });
                }
                this.events.push({ type: 'hit', x: (a.body.position.x + b.body.position.x) / 2, y: a.body.position.y, strength: Math.min(1, power / 14) });
            }
        }
    }
    opponentBasket(side: Side) {
        const rim = this.hoops.slice(side === 0 ? 3 : 0, side === 0 ? 5 : 2);
        return { x: rim.length === 2 ? (rim[0].position.x + rim[1].position.x) / 2 : BASKET.centers[1 - side], y: this.goalY };
    }
    heldPosition(b: Ball) {
        const p = this.players[b.holder!], r = b.radius, offset = 32 * p.scale + r + 6;
        // The carrying hand stays on the attacking side, independent of facing changes.
        const dir = Math.sign(this.opponentBasket(p.side).x - p.body.position.x) || (p.side === 0 ? 1 : -1);
        return { x: clamp(p.body.position.x + dir * offset, r + 20, 1100 - r), y: p.body.position.y - 12 * p.scale };
    }
    clearPossession(b: Ball) {
        b.possession = { kind: 'free' }; b.body.isSensor = false; b.body.collisionFilter.mask = 1;
    }
    grabBall(p: Player, b: Ball) {
        const state = b.possession;
        if (this.sportId !== 'basketball' || b.holder !== null || p.stun > 0 ||
            (state.kind === 'released' && state.owner === p.side && state.until > this.elapsed) ||
            this.balls.some(ball => ball.holder === p.side)) return false;
        const distance = Math.hypot(b.body.position.x - p.body.position.x, b.body.position.y - p.body.position.y);
        const relativeSpeed = Math.hypot(b.body.velocity.x - p.body.velocity.x, b.body.velocity.y - p.body.velocity.y);
        if (distance > p.radius + b.radius + (relativeSpeed > 12 ? 4 : 18)) return false;
        b.possession = { kind: 'held', owner: p.side, caughtAt: this.elapsed }; b.lastTouch = p.side; this.lastTouch = p.side; b.idle = 0;
        b.body.isSensor = true; b.body.collisionFilter.mask = 0;
        Matter.Body.setPosition(b.body, this.heldPosition(b)); Matter.Body.setVelocity(b.body, { x: 0, y: 0 });
        this.events.push({ type: 'catch', x: b.body.position.x, y: b.body.position.y, side: p.side }); return true;
    }
    releaseBall(b: Ball, shoot = true) {
        if (b.holder === null) return;
        const p = this.players[b.holder], charge = b.charge(this.elapsed), anchor = this.heldPosition(b);
        b.possession = { kind: 'released', owner: p.side, until: this.elapsed + RECATCH_MS, strikeUntil: this.elapsed + 100 };
        b.body.isSensor = false; b.body.collisionFilter.mask = 1;
        Matter.Body.setPosition(b.body, anchor);
        if (shoot) {
            Matter.Body.setVelocity(b.body, shotVelocity(anchor, this.opponentBasket(p.side), charge, this.rules.gravity, p.body.velocity));
        } else {
            if (this.winner === null) p.stun = 180;
            const dir = p.side === 0 ? 1 : -1;
            Matter.Body.setVelocity(b.body, { x: dir * 4 + p.body.velocity.x * .2, y: -5 });
        }
        b.previous = { ...b.body.position };
        this.events.push({ type: 'throw', x: b.body.position.x, y: b.body.position.y, side: p.side, strength: charge });
    }
    strike(p: Player, b: Ball, action: boolean) {
        if (b.holder !== null || this.elapsed < b.noStrikeUntil) return;
        const dir = p.side === 0 ? 1 : -1;
        if (this.sportId === 'basketball') {
            // Body contact deflects loose balls. Controlled shots require possession.
            Matter.Body.setVelocity(b.body, { x: dir * 4 + p.body.velocity.x * .3, y: -4 });
        }
        else if (this.sportId === 'soccer') {
            Matter.Body.setVelocity(b.body, { x: dir * (action ? 13 : 8) + p.body.velocity.x * .32, y: action ? -5.2 : -3.2 });
        }
        else if (this.sportId === 'volleyball') {
            Matter.Body.setVelocity(b.body, { x: dir * (action ? 7.5 : 5.5), y: -(action ? 13.8 : 11.5) * Math.sqrt(this.rules.gravity) });
        }
        b.lastTouch = p.side;
        this.lastTouch = p.side;
    }
    step(inputs: [
        Input,
        Input
    ], dt = 1000 / 60): Side | null {
        if (this.winner !== null)
            return this.winner;
        this.elapsed += dt;
        this.sport.update(this);
        for (const p of this.players) {
            const foot = p.body.bounds.max.y;
            const x = p.body.position.x;
            p.grounded = this.statics.some(b => Math.abs(foot - b.bounds.min.y) < 9 && x > b.bounds.min.x - 10 && x < b.bounds.max.x + 10 && p.body.velocity.y >= -1 && b.label !== 'wall');
            if (this.sportId === 'basketball') {
                let held = this.balls.find(b => b.holder === p.side);
                const action = inputs[p.side].action;
                if (held?.possession.kind === 'charging' && !action) this.releaseBall(held);
                if (!held && action) {
                    const nearest = this.balls.filter(b => b.holder === null).sort((a, b) => Math.hypot(a.body.position.x - x, a.body.position.y - p.body.position.y) - Math.hypot(b.body.position.x - x, b.body.position.y - p.body.position.y));
                    for (const b of nearest) if (this.grabBall(p, b)) { held = b; break; }
                }
                if (held?.possession.kind === 'held' && action) {
                    held.possession = { ...held.possession, kind: 'charging', startedAt: this.elapsed };
                }
                if (action && !this.actionPrevious[p.side] && p.stun <= 0) for (const b of this.balls) {
                    if (b.holder !== null && b.holder !== p.side && Math.hypot(b.body.position.x - x, b.body.position.y - p.body.position.y) < p.radius + b.radius + 12) this.releaseBall(b, false);
                }
            }
            this.actionPrevious[p.side] = inputs[p.side].action;
            if (p.move(inputs[p.side], this.rules, dt, this.elapsed)) {
                this.events.push({ type: 'jump', x, y: p.body.position.y, side: p.side });
                for (const b of this.balls)
                    if (this.sportId !== 'basketball' && Math.hypot(b.body.position.x - x, b.body.position.y - p.body.position.y) < p.radius + b.radius + 75)
                        this.strike(p, b, true);
                if (this.sportId === 'knockout') {
                    const other = this.players[1 - p.side];
                    if (Math.hypot(other.body.position.x - x, other.body.position.y - p.body.position.y) < 120) {
                        const d = Math.sign(other.body.position.x - x) || p.facing;
                        other.stun = 300;
                        Matter.Body.setVelocity(other.body, { x: d * 17, y: -5 });
                    }
                }
            }
            if (this.sportId === 'volleyball') {
                const left = p.side === 0 ? 25 : 585, right = p.side === 0 ? 535 : 1095;
                if (x < left || x > right) {
                    Matter.Body.setPosition(p.body, { x: clamp(x, left, right), y: p.body.position.y });
                    Matter.Body.setVelocity(p.body, { x: 0, y: p.body.velocity.y });
                }
            }
            if (this.sportId !== 'knockout' && (p.body.position.y > 650 || p.body.position.y < -140 || x < -75 || x > 1195))
                this.resetPlayers();
        }
        for (const b of this.balls)
            b.previous = { ...b.body.position };
        if (this.rules.wind) {
            const gust = Math.sin(this.elapsed * .00065);
            for (const b of [...this.players.map(p => p.body), ...this.balls.map(b => b.body)])
                Matter.Body.applyForce(b, b.position, { x: this.rules.wind * b.mass * gust, y: 0 });
        }
        Matter.Engine.update(this.engine, dt);
        for (const b of this.balls) if (b.holder !== null) {
            Matter.Body.setPosition(b.body, this.heldPosition(b)); Matter.Body.setVelocity(b.body, { x: 0, y: 0 }); b.previous = { ...b.body.position }; b.idle = 0;
        }
        const winner = this.sport.check(this);
        if (winner !== null) {
            this.winner = winner;
            for (const b of this.balls) this.clearPossession(b);
            this.events.push({ type: 'score', x: this.players[winner].body.position.x, y: 360, side: winner });
            return winner;
        }
        for (const [i, b] of this.balls.entries()) {
            if (b.holder !== null) continue;
            if (b.possession.kind === 'released' && this.elapsed >= b.possession.until) b.possession = { kind: 'free' };
            const v = b.body.velocity;
            if (Math.hypot(v.x, v.y) > 23)
                Matter.Body.setVelocity(b.body, { x: clamp(v.x, -19, 19), y: clamp(v.y, -22, 22) });
            b.idle = Math.hypot(v.x, v.y) < .6 ? b.idle + dt : 0;
            const pos = b.body.position;
            if (pos.x < -65 || pos.x > 1185 || pos.y < -100 || pos.y > 610 || b.idle > 3500)
                this.resetBall(b, i);
        }
        return null;
    }
    // Continue the scored ball through the net after hit-stop, without awarding another point.
    settle(dt = 1000 / 60) { Matter.Engine.update(this.engine, dt); }
    destroy() { for (const b of this.balls) this.clearPossession(b); Matter.Events.off(this.engine, 'collisionStart'); Matter.Composite.clear(this.engine.world, false); Matter.Engine.clear(this.engine); }
}
