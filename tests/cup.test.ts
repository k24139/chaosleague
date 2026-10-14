import test from 'node:test';
import assert from 'node:assert/strict';
import { CupTournament } from '../src/systems/CupTournament';
const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
test('Cup draws eight unique competitors and the player keeps the chosen team', () => {
    const a = new CupTournament(3, rng(10)), b = new CupTournament(3, rng(99));
    const entrants = a.rounds[0].flatMap(m => [m.left, m.right]);
    assert.equal(entrants.length, 8); assert.equal(new Set(entrants.map(p => p.name)).size, 8);
    assert.equal(entrants.filter(p => p.human).length, 1); assert.equal(entrants[0].team, 3);
    assert.notDeepEqual(a.rounds[0].map(m => m.right.name), b.rounds[0].map(m => m.right.name));
});
test('three player wins resolve every match and award the Cup once', () => {
    const cup = new CupTournament(0, rng(55));
    for (let i = 0; i < 3; i++) { assert.equal(cup.active, true); assert.ok(cup.opponent && !cup.opponent.human); cup.resolveHuman(true); }
    assert.deepEqual(cup.rounds.map(r => r.length), [4, 2, 1]);
    assert.ok(cup.rounds.flat().every(m => m.winner)); assert.equal(cup.champion?.human, true);
    assert.equal(cup.active, false); const champ = cup.champion; cup.resolveHuman(false); assert.equal(cup.champion, champ);
});
for (const lossAt of [0, 1, 2]) test(`loss in round ${lossAt} completes the CPU bracket without reviving the player`, () => {
    const cup = new CupTournament(0, rng(71)); for (let i = 0; i < lossAt; i++) cup.resolveHuman(true);
    cup.resolveHuman(false); assert.equal(cup.eliminated, true); assert.equal(cup.active, false);
    assert.equal(cup.champion?.human, false); assert.deepEqual(cup.rounds.map(r => r.length), [4, 2, 1]);
    assert.ok(cup.rounds.flat().every(m => m.winner));
    assert.equal(cup.rounds.flat().filter(m => m.winner?.human).length, lossAt);
});
