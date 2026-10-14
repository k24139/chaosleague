import { TEAMS } from '../config/game';
export interface Competitor { id: number; name: string; team: number; human: boolean; }
export interface CupMatch { left: Competitor; right: Competitor; winner: Competitor | null; }
const NAMES = ['Vex', 'Nova', 'Rift', 'Axiom', 'Knox', 'Zero', 'Volt', 'Rook', 'Drift', 'Echo', 'Flux', 'Jinx', 'Hex', 'Blaze', 'Onyx', 'Kilo'];
export const CUP_ROUNDS = ['Quarterfinals', 'Semifinals', 'Final'];
export class CupTournament {
    rounds: CupMatch[][] = [];
    round = 0;
    eliminated = false;
    champion: Competitor | null = null;
    constructor(team: number, private random = Math.random) {
        const names = NAMES.slice();
        for (let i = names.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [names[i], names[j]] = [names[j], names[i]]; }
        const players: Competitor[] = [{ id: 0, name: 'You', team, human: true }, ...names.slice(0, 7).map((name, i) => ({ id: i + 1, name, team: (team + 1 + i % (TEAMS.length - 1)) % TEAMS.length, human: false }))];
        this.rounds.push(this.pair(players));
    }
    private pair(players: Competitor[]): CupMatch[] { return Array.from({ length: players.length / 2 }, (_, i) => ({ left: players[i * 2], right: players[i * 2 + 1], winner: null })); }
    get active() { return !this.eliminated && !this.champion; }
    get opponent() { const match = this.rounds[this.round].find(m => m.left.human || m.right.human); return match ? (match.left.human ? match.right : match.left) : null; }
    resolveHuman(won: boolean) {
        if (!this.active) return;
        for (const m of this.rounds[this.round]) m.winner = m.left.human || m.right.human ? (won ? (m.left.human ? m.left : m.right) : (m.left.human ? m.right : m.left)) : this.random() < .5 ? m.left : m.right;
        this.eliminated = !won;
        this.advance();
        if (this.eliminated) {
            while (!this.champion) { for (const m of this.rounds[this.round]) m.winner = this.random() < .5 ? m.left : m.right; this.advance(); }
        }
    }
    private advance() {
        const winners = this.rounds[this.round].map(m => m.winner!);
        if (winners.length === 1) { this.champion = winners[0]; return; }
        this.round++; this.rounds.push(this.pair(winners));
    }
}
