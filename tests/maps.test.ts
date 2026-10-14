import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_NAMES, nextMap, mapName } from '../src/config/maps';
import { ARENAS, SPORTS } from '../src/config/game';
import { PhysicsWorld } from '../src/systems/PhysicsWorld';
test('all four sports have five distinct playable map variants and neutral base rules', () => {
    for (const sport of SPORTS) {
        assert.equal(MAP_NAMES[sport].length, 5); assert.equal(new Set(MAP_NAMES[sport]).size, 5);
        for (let map = 0; map < 5; map++) {
            const w = new PhysicsWorld(sport, [], map); assert.ok(mapName(sport, map));
            assert.equal(w.rules.gravity, 1); assert.equal(w.rules.friction, .16); w.destroy();
        }
    }
    assert.equal(new Set(ARENAS.map(a => a.sky)).size, 5);
});
test('map rotation cannot immediately repeat the same theme for a sport', () => {
    for (const previous of [0, 1, 2, 3, 4]) for (const random of [0, .2, .5, .8, .999]) {
        const next = nextMap(previous, () => random); assert.notEqual(next, previous); assert.ok(next >= 0 && next < 5);
    }
});
