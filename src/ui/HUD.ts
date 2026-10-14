import { mapName } from '../config/maps';
import { CUP_ROUNDS } from '../systems/CupTournament';
import { introCue, ScorePresentation } from '../systems/PresentationTimeline';
import { icon } from './icons';
import { TEAMS, SPORT_META, type Side } from '../config/game';
import { MODIFIERS, modifierNames } from '../systems/ModifierManager';
import type { PhysicsWorld } from '../systems/PhysicsWorld';
import type { MatchManager } from '../systems/MatchManager';
export function el<T extends HTMLElement = HTMLElement>(id: string): T { return document.getElementById(id) as T; }
export class HUD {
    private revealStep = '';
    private scores = new ScorePresentation();
    announce(text: string) { el('announcer').textContent = text; }
    show(active: boolean, two = false) {
        el('menu').hidden = active;
        el('hud').hidden = !active;
        el('touch').hidden = !active;
        el('game-shell').classList.toggle('playing', active);
        el('game-shell').classList.toggle('single', !two);
        if (!active) { this.overlay(false); this.hideScore(); el('results').hidden = true; el('pause-overlay').hidden = true; el('bracket-overlay').hidden = true; }
    }
    update(w: PhysicsWorld, m: MatchManager) {
        for (const i of [0, 1] as Side[]) {
            const team = TEAMS[w.players[i].team];
            el(`name-${i}`).textContent = m.mode === 'cup' ? (i === 0 ? 'You' : m.cup?.opponent?.name ?? team.name) : m.mode === 'two' ? `P${i + 1} / ${team.name}` : team.name;
            el(`name-${i}`).parentElement!.style.setProperty('--team', team.hex);
            el(`score-${i}`).textContent = String(m.wins[i]);
            el(`dots-${i}`).innerHTML = [0, 1, 2].map(n => `<i class="${n < m.wins[i] ? 'won' : ''}"></i>`).join('');
        }
        el('sport-name').textContent = SPORT_META[w.sportId].name;
        el('map-name').textContent = mapName(w.sportId, w.arenaIndex);
        el('modifiers').replaceChildren();
        for (const id of w.modifierIds) {
            const label = document.createElement('span'); label.className = 'modifier-tag';
            label.textContent = MODIFIERS.find(m => m.id === id)!.name; el('modifiers').append(label);
        }
        el('objective').textContent = SPORT_META[w.sportId].verb;
        el('round-tag').textContent = `${m.mode === 'cup' ? `Cup ${m.cupStage + 1}/3 · ` : ''}Round ${m.round} · ${mapName(w.sportId, w.arenaIndex)} · First to 3`;
    }
    timer(seconds: number) { el('timer').textContent = seconds >= 0 ? String(Math.ceil(seconds)) : 'OT'; el('timer').style.color = seconds < 10 ? 'var(--red)' : ''; }
    intro(w: PhysicsWorld, m: MatchManager, time: number) {
        const cue = introCue(time), step = cue.kind;
        if (cue.key === this.revealStep || step === 'live') return false;
        this.revealStep = cue.key;
        el('round-overlay').hidden = false;
        el('round-overlay').dataset.step = step;
        el('round-eyebrow').textContent = step === 'sport' ? `Round ${m.round} / ${mapName(w.sportId, w.arenaIndex)}` : step === 'map' ? 'Map / Arena location' : step === 'chaos' ? 'Rules mutated' : step === 'count' ? `${SPORT_META[w.sportId].name} / Round ${m.round}` : 'Enter the arena';
        el('round-title').textContent = step === 'sport' ? SPORT_META[w.sportId].name : step === 'map' ? mapName(w.sportId, w.arenaIndex) : step === 'chaos' ? 'Chaos event' : step === 'count' ? 'Get ready' : 'Fight!';
        const subtitle = el('round-subtitle');
        subtitle.replaceChildren();
        if (step === 'chaos' || step === 'count') {
            w.modifierIds.forEach((id, i) => {
                if (i) { const plus = document.createElement('span'); plus.className = 'plus'; plus.textContent = '+'; subtitle.append(plus); }
                const title = document.createElement('span');
                title.className = `modifier ${id}`;
                title.textContent = MODIFIERS.find(m => m.id === id)!.name;
                subtitle.append(title);
            });
        }
        el('countdown').textContent = step === 'count' ? cue.label : '';
        el('countdown').dataset.count = cue.label;
        this.announce(step === 'sport' ? `Round ${m.round}. ${SPORT_META[w.sportId].name}.` : step === 'map' ? `Map: ${mapName(w.sportId, w.arenaIndex)}.` : step === 'chaos' ? `Chaos event: ${modifierNames(w.modifierIds)}.` : cue.label);
        return true;
    }
    resetIntro() { this.revealStep = ''; this.hideScore(); }
    overlay(show: boolean, title = '', subtitle = '', eyebrow = '', count = '') {
        el('round-overlay').hidden = !show;
        if (show) {
            el('round-overlay').dataset.step = 'draw';
            el('round-title').textContent = title;
            el('round-subtitle').textContent = subtitle;
            el('round-eyebrow').textContent = eyebrow;
            el('countdown').textContent = count;
        }
    }
    celebrate(w: PhysicsWorld, m: MatchManager, winner: Side) {
        const team = TEAMS[w.players[winner].team], matchWin = m.wins[winner] === 3;
        const event = this.scores.event(w.sportId), line = this.scores.line(m.mode, winner);
        this.overlay(false);
        el('game-stage').style.setProperty('--score-accent', team.hex);
        el('score-overlay').classList.toggle('match-winning', matchWin);
        el('score-overlay').hidden = false;
        el('score-eyebrow').textContent = matchWin ? (m.mode !== 'two' && winner === 1 ? 'Rival takes the match' : 'Match secured') : `Round ${m.round} / Player ${winner + 1}`;
        el('score-title').textContent = event;
        el('score-message').textContent = line;
        el('score-overlay').classList.toggle('rival-score', m.mode !== 'two' && winner === 1);
        el('score-caption').textContent = `${team.name} / ${m.wins[0]} : ${m.wins[1]}`;
        el(`score-${winner}`).classList.add('score-slam');
        this.announce(`${team.name}. ${event} Score ${m.wins[0]} to ${m.wins[1]}. ${line}${matchWin ? ' Match won.' : ''}`);
    }
    hideScore() { el('score-overlay').hidden = true; for (const i of [0, 1]) el(`score-${i}`).classList.remove('score-slam'); }
    bracket(m: MatchManager) {
        const cup = m.cup!;
        el('bracket-overlay').hidden = false;
        el('bracket-overlay').classList.toggle('cup-victory', Boolean(cup.champion?.human));
        el('bracket-overlay').classList.remove('launching');
        el('bracket-title').textContent = cup.champion?.human ? 'Cup secured' : cup.eliminated ? 'Eliminated' : cup.round === 0 ? 'The draw' : 'Advance secured';
        el('bracket-summary').textContent = cup.eliminated ? `${cup.champion!.name} wins the Cup. Your completed bracket is below.` : cup.champion?.human ? 'Three matches won. You own the bracket.' : 'First to three points wins each match. Follow your highlighted path.';
        const grid = el('bracket'); grid.replaceChildren();
        CUP_ROUNDS.forEach((name, round) => {
            const column = document.createElement('section'); column.className = 'bracket-round';
            const title = document.createElement('h3'); title.textContent = name; column.append(title);
            const group = document.createElement('div'); group.className = 'bracket-matches';
            for (let slot = 0; slot < 4 / 2 ** round; slot++) {
                const match = cup.rounds[round]?.[slot];
                const card = document.createElement('article'); card.className = 'bracket-match' + (match ? '' : ' pending');
                if (slot === 0 && !cup.eliminated) card.classList.add('player-path');
                for (const [side, competitor] of [match?.left, match?.right].entries()) {
                    const row = document.createElement('div'); row.className = 'competitor';
                    if (competitor) {
                        row.classList.toggle('human', competitor.human);
                        row.classList.toggle('winner', match?.winner?.id === competitor.id);
                        row.classList.toggle('loser', Boolean(match?.winner && match.winner.id !== competitor.id));
                        row.style.setProperty('--team', TEAMS[competitor.team].hex);
                    }
                    const swatch = document.createElement('i'); swatch.setAttribute('aria-hidden', 'true'); row.append(swatch);
                    const text = document.createElement('span'); text.textContent = competitor?.name ?? `Winner ${round === 1 ? 'QF' : 'SF'} ${slot * 2 + side + 1}`; row.append(text);
                    if (match?.winner?.id === competitor?.id && competitor) { const marker = document.createElement('span'); marker.textContent = ' · Advanced'; marker.className = 'sr-only'; row.append(marker); }
                    card.append(row);
                }
                group.append(card);
            }
            column.append(group); grid.append(column);
        });
        el('matchup').textContent = cup.active ? `You vs ${cup.opponent!.name} / ${CUP_ROUNDS[cup.round]}` : cup.champion?.human ? 'Chaos Cup champion / You' : 'Return for a new draw.';
        el('cup-enter').textContent = cup.active ? `Enter ${cup.round === 0 ? 'quarterfinal' : cup.round === 1 ? 'semifinal' : 'final'}` : 'New Cup';
        el('cup-enter').focus({ preventScroll: true });
        this.announce(`${el('bracket-title').textContent}. ${el('matchup').textContent}`);
    }
    result(m: MatchManager, winner: Side) {
        el('results').hidden = false;
        el('result-eyebrow').textContent = 'Final result';
        el('result-title').textContent = m.mode === 'two' ? `Player ${winner + 1} wins` : winner === 0 ? 'Victory' : 'Defeat';
        el('result-description').textContent = winner === 0 ? 'Three rounds claimed.' : 'Regroup. Return to the arena.';
        el('result-score').textContent = `${m.wins[0]} : ${m.wins[1]}`;
        el('rematch-button').innerHTML = `Rematch ${icon('arrow')}`;
        el('rematch-button').focus({ preventScroll: true });
    }
}
