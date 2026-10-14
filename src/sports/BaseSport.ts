import type Matter from 'matter-js';
import type { SportId, Side } from '../config/game';
import type { PhysicsWorld } from '../systems/PhysicsWorld';
export interface Sport {
    id: SportId;
    setup(world: PhysicsWorld): void;
    update(world: PhysicsWorld): void;
    check(world: PhysicsWorld): Side | null;
}
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function staticRect(w: PhysicsWorld, x: number, y: number, width: number, height: number, label = 'wall'): Matter.Body { return w.addStatic(x, y, width, height, label); }
