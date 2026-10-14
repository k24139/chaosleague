import type { SportId } from './game';
export const MAP_NAMES: Record<SportId, readonly string[]> = {
    basketball: ['Underground Court', 'Meadow Arena', 'Mars Dome', 'Neon Rooftop', 'Reactor Gym'],
    soccer: ['Underground Pitch', 'Meadow Field', 'Mars Pitch', 'Neon Stadium', 'Reactor Yard'],
    volleyball: ['Underground Court', 'Meadow Court', 'Mars Court', 'Neon Roof Court', 'Reactor Court'],
    knockout: ['Underground Shaft', 'Meadow Ruins', 'Mars Chasm', 'Neon Skybridge', 'Reactor Core']
};
export const mapName = (sport: SportId, index: number) => MAP_NAMES[sport][index];
export function nextMap(previous: number, random = Math.random) {
    const choices = [0, 1, 2, 3, 4].filter(i => i !== previous);
    return choices[Math.floor(random() * choices.length)];
}
