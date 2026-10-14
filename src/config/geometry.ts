// Collision dimensions and procedural art share these measurements.
export const BASKET = { centers: [94, 1026] as const, rimHalf: 50, rimBodyWidth: 8, rimInner: 46, scoreDepth: 12, netDepth: 58, boardOffset: 58 };
export const GOAL = { halfHeight: 58, depth: 80, scoreInset: 25, topBar: 6 };
export const LAYERS = { background: -3, rearStructure: -2, banner: -1, court: 0, rearGoal: 1, entities: 3, frontGoal: 4, effects: 10 };
