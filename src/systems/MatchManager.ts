import { CupTournament } from './CupTournament';
import { SPORTS, type Mode, type Side, type SportId } from '../config/game';
export class MatchManager {
    points: [number, number] = [0, 0];
    roundComplete = false;
    wins: [
        number,
        number
    ] = [0, 0];
    round = 0;
    cupStage = 0;
    cup: CupTournament | null = null;
    lastSport: SportId | null = null;
    deck: SportId[] = [];
    constructor(public mode: Mode, public difficulty = 1, public random = Math.random, team = 0) { if (mode === 'cup') this.cup = new CupTournament(team, random); }
    nextSport(): SportId { this.points = [0, 0]; this.roundComplete = false; if (!this.deck.length) {
        this.deck = SPORTS.slice();
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        if (this.deck[0] === this.lastSport)
            this.deck.push(this.deck.shift()!);
    } const sport = this.deck.shift()!; this.lastSport = sport; this.round++; return sport; }
    score(side: Side) {
        if (this.roundComplete || this.wins.some(w => w >= 3)) return false;
        this.points[side]++;
        this.roundComplete = this.points[side] === 3;
        if (this.roundComplete) this.wins[side]++;
        return this.roundComplete;
    }
    get matchComplete() { return this.wins.some(w => w >= 3); }
    get roundPoint() { return this.points[0] === 2 && this.points[1] === 2; }
    nextCup() { this.cupStage++; this.wins = [0, 0]; this.points = [0, 0]; this.roundComplete = false; this.round = 0; this.difficulty = Math.min(3, this.cupStage + 1); }
}
