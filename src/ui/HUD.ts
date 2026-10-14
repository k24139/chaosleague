import { mapName } from '../config/maps';
import { CUP_ROUNDS } from '../systems/CupTournament';
import { introCue, ScorePresentation } from '../systems/PresentationTimeline';
import { TEAMS, SPORT_META, type Side } from '../config/game';
import { MODIFIERS, modifierNames } from '../systems/ModifierManager';
import type { PhysicsWorld } from '../systems/PhysicsWorld';
import type { MatchManager } from '../systems/MatchManager';
export function el<T extends HTMLElement = HTMLElement>(id: string): T { return document.getElementById(id) as T; }
export class HUD {
    private revealStep = '';
    private scores = new ScorePresentation();
    modal(active: boolean) {
        el('hud').inert = active; el('touch').inert = active;
        document.querySelector<HTMLElement>('.game-utility')!.inert = active;
    }
    announce(text: string) { el('announcer').textContent = text; }
    show(active: boolean, two = false) {
        this.modal(false);
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
            el(`name-${i}`).textContent = m.mode === 'cup' && i === 1 ? m.cup?.opponent?.name ?? team.name : team.name;
            el(`player-${i}`).textContent = i === 0 ? (m.mode === 'two' ? 'P1' : 'YOU') : (m.mode === 'two' ? 'P2' : 'CPU');
            el(`wins-${i}`).textContent = String(m.wins[i]);
            el(`name-${i}`).parentElement!.style.setProperty('--team', team.hex);
            el(`score-${i}`).textContent = String(m.points[i]);
            el(`dots-${i}`).innerHTML = [0, 1, 2].map(n => `<i class="${n < m.wins[i] ? 'won' : ''}"></i>`).join('');
        }
        el('sport-name').textContent = SPORT_META[w.sportId].name;
        el('map-name').textContent = mapName(w.sportId, w.arenaIndex);
        el('modifiers').replaceChildren();
        for (const id of w.modifierIds) {
            const label = document.createElement('span'); label.className = 'modifier-tag';
            label.textContent = MODIFIERS.find(m => m.id === id)!.name; el('modifiers').append(label);
        }
        el('objective').textContent = m.roundPoint ? 'ROUND POINT · NEXT POINT WINS' : SPORT_META[w.sportId].verb;
        el('objective').classList.toggle('round-point', m.roundPoint);
        el('match-progress').textContent = `ROUNDS ${m.wins[0]}–${m.wins[1]} · FIRST TO 3`;
        el('scoreboard').setAttribute('aria-label', `Points ${m.points[0]} to ${m.points[1]}. Rounds ${m.wins[0]} to ${m.wins[1]}.`);
        el('round-tag').textContent = `${m.mode === 'cup' ? `Cup ${m.cupStage + 1}/3 · ` : ''}Round ${m.round} · ${mapName(w.sportId, w.arenaIndex)} · First to 3`;
    }
    timer(seconds: number) { el('timer').textContent = seconds >= 0 ? String(Math.ceil(seconds)) : 'OT'; el('timer').style.color = seconds < 10 ? 'var(--cl-danger)' : ''; }
    intro(w: PhysicsWorld, m: MatchManager, time: number) {
        const cue = introCue(time), step = cue.kind;
        if (cue.key === this.revealStep || step === 'live') return false;
        this.revealStep = cue.key;
        el('round-overlay').hidden = false;
        el('round-overlay').dataset.step = step;
        el('round-eyebrow').textContent = '';
        el('round-title').textContent = step === 'arena' ? SPORT_META[w.sportId].name : step === 'chaos' ? 'Chaos event' : step === 'fight' ? 'Fight!' : '';
        el('round-subtitle').textContent = step === 'arena' ? mapName(w.sportId, w.arenaIndex) : step === 'chaos' ? modifierNames(w.modifierIds).replaceAll(' + ', ' · ') : '';
        el('countdown').textContent = step === 'count' ? cue.label : '';
        el('countdown').dataset.count = cue.label;
        this.announce(step === 'arena' ? `Round ${m.round}. ${SPORT_META[w.sportId].name}. ${mapName(w.sportId, w.arenaIndex)}.` : step === 'chaos' ? `Chaos event: ${modifierNames(w.modifierIds)}.` : cue.label);
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
        const team = TEAMS[w.players[winner].team], matchWin = m.matchComplete;
        const event = this.scores.event(w.sportId), line = this.scores.line(m.mode, winner);
        this.overlay(false);
        el('game-stage').style.setProperty('--score-accent', team.hex);
        el('score-overlay').classList.remove('exiting');
        el('score-overlay').hidden = false;
        el('score-eyebrow').textContent = matchWin ? (m.mode !== 'two' && winner === 1 ? 'Rival takes the match' : 'Match secured') : m.roundComplete ? 'Round secured' : `Round ${m.round} · Player ${winner + 1}`;
        el('score-title').textContent = event;
        el('score-message').textContent = line;
        el('score-caption').textContent = `${team.name} / ${m.points[0]}–${m.points[1]}`;
        el(`score-${winner}`).classList.add('score-slam');
        this.announce(`${team.name}. ${event} Score ${m.points[0]} to ${m.points[1]}. ${line}${matchWin ? ' Match won.' : ''}`);
    }
    scoreExit(exiting: boolean) { el('score-overlay').classList.toggle('exiting', exiting); }
    transition(show: boolean, progress = 0) {
        const wipe = el('arena-wipe'); wipe.hidden = !show;
        // A wide diagonal shutter fully covers both edges at the midpoint.
        const reduced = document.documentElement.classList.contains('effects-off');
        wipe.style.transform = reduced ? (progress >= .25 && progress <= .75 ? 'skewX(-12deg)' : 'translateX(-120%)') : `translateX(${(progress * 2 - 1) * 110}%) skewX(-12deg)`;
    }
    hideScore() { el('score-overlay').hidden = true; for (const i of [0, 1]) el(`score-${i}`).classList.remove('score-slam'); }
    bracket(m: MatchManager) {
        const cup = m.cup!;
        el('bracket-overlay').hidden = false;
        el('bracket-overlay').classList.toggle('cup-victory', Boolean(cup.champion?.human));
        el('bracket-overlay').classList.remove('launching');
        el('bracket-title').textContent = cup.champion?.human ? 'Cup secured' : cup.eliminated ? 'Eliminated' : cup.round === 0 ? 'Chaos Cup' : 'Advance secured';
        el('bracket-summary').textContent = cup.eliminated ? `${cup.champion!.name} wins the Cup. Your completed bracket is below.` : cup.champion?.human ? 'Three matches won. You own the bracket.' : 'First to three points per round. Three rounds takes the match.';
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
        el('cup-enter').textContent = cup.active ? (cup.round === 0 ? 'Start Cup' : 'Continue Cup') : 'New Cup';
        el('cup-enter').focus({ preventScroll: true });
        this.announce(`${el('bracket-title').textContent}. ${el('matchup').textContent}`);
    }
    result(w: PhysicsWorld, m: MatchManager, winner: Side) {
        this.modal(true);
        el('touch').hidden = true;
        el('hud').hidden = true;
        el('results').hidden = false;
        el('result-eyebrow').textContent = 'Final result';
        el('result-title').textContent = m.mode === 'two' ? `P${winner + 1} wins` : winner === 0 ? 'Victory' : 'Defeat';
        el('result-description').textContent = `${TEAMS[w.players[winner].team].name} defeat ${TEAMS[w.players[1 - winner].team].name}`;
        el('result-title').style.color = TEAMS[w.players[winner].team].hex;
        el('result-score').textContent = `${m.wins[0]}–${m.wins[1]}`;
        el('rematch-button').textContent = 'Rematch';
        el('rematch-button').focus({ preventScroll: true });
    }
}
