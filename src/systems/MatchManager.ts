import { CupTournament } from './CupTournament';
import { SPORTS, type Mode, type Side, type SportId } from '../config/game';
export class MatchManager {
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
    nextSport(): SportId { if (!this.deck.length) {
        this.deck = SPORTS.slice();
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        if (this.deck[0] === this.lastSport)
            this.deck.push(this.deck.shift()!);
    } const sport = this.deck.shift()!; this.lastSport = sport; this.round++; return sport; }
    score(side: Side) { this.wins[side]++; return this.wins[side] === 3; }
    nextCup() { this.cupStage++; this.wins = [0, 0]; this.round = 0; this.difficulty = Math.min(3, this.cupStage + 1); }
}
