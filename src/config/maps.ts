import type { SportId } from './game';
import { THEMES } from './themes';
const expanded = THEMES.slice(5).map(t => t.displayName);
export const MAP_NAMES: Record<SportId, readonly string[]> = {
    basketball: ['Underground Court', 'Meadow Arena', 'Mars Dome', 'Neon Rooftop', 'Reactor Gym', ...expanded],
    soccer: ['Underground Pitch', 'Meadow Field', 'Mars Pitch', 'Neon Stadium', 'Reactor Yard', ...expanded],
    volleyball: ['Underground Court', 'Meadow Court', 'Mars Court', 'Neon Roof Court', 'Reactor Court', ...expanded],
    knockout: ['Underground Shaft', 'Meadow Ruins', 'Mars Chasm', 'Neon Skybridge', 'Reactor Core', ...expanded]
};
export const mapName = (sport: SportId, index: number) => MAP_NAMES[sport][index];
export function nextMap(previous: number | readonly number[], random = Math.random) {
    const recent = typeof previous === 'number' ? [previous] : previous;
    let choices = THEMES.map((_, i) => i).filter(i => !recent.includes(i));
    if (!choices.length) choices = THEMES.map((_, i) => i).filter(i => i !== recent.at(-1));
    return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}
