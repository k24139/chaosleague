import { THEMES } from './themes';
export const WIDTH = 1120, HEIGHT = 630, FLOOR = 530;
export type SportId = 'basketball' | 'soccer' | 'volleyball' | 'knockout';
export type Side = 0 | 1;
export type Mode = 'quick' | 'two' | 'cup';
export type Input = {
    left: boolean;
    right: boolean;
    action: boolean;
    jump?: boolean;
};
export const EMPTY_INPUT: Input = { left: false, right: false, action: false };
export const SPORTS: SportId[] = ['basketball', 'soccer', 'volleyball', 'knockout'];
export const SPORT_META: Record<SportId, {
    name: string;
    verb: string;
    icon: string;
}> = {
    basketball: { name: 'Basketball', verb: 'Touch to collect. Hold S to shoot; S without a ball blocks.', icon: '◉' },
    soccer: { name: 'Soccer', verb: 'S: Slide Tackle. Kick into the far goal.', icon: '⬡' },
    volleyball: { name: 'Volleyball', verb: 'S: Double Jump. Land the ball across the net.', icon: '◒' },
    knockout: { name: 'Knockout', verb: 'S: Dash. Push your rival off the platform.', icon: '✦' }
};
export const TEAMS = [
    { name: 'Frogs', color: 0xc8ff38, hex: '#c8ff38', face: 'frog' },
    { name: 'Rockets', color: 0xff3d57, hex: '#ff3d57', face: 'rocket' },
    { name: 'Robots', color: 0x26e6ff, hex: '#26e6ff', face: 'robot' },
    { name: 'Yetis', color: 0xf7f7fa, hex: '#f7f7fa', face: 'yeti' },
    { name: 'Ghosts', color: 0x8b5cf6, hex: '#8b5cf6', face: 'ghost' },
    { name: 'Aliens', color: 0xffb638, hex: '#ffb638', face: 'alien' }
];
export const ARENAS = THEMES;
