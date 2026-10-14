export const WIDTH = 1120, HEIGHT = 630, FLOOR = 530;
export type SportId = 'basketball' | 'soccer' | 'volleyball' | 'knockout';
export type Side = 0 | 1;
export type Mode = 'quick' | 'two' | 'cup';
export type Input = {
    left: boolean;
    right: boolean;
    action: boolean;
};
export const EMPTY_INPUT: Input = { left: false, right: false, action: false };
export const SPORTS: SportId[] = ['basketball', 'soccer', 'volleyball', 'knockout'];
export const SPORT_META: Record<SportId, {
    name: string;
    verb: string;
    icon: string;
}> = {
    basketball: { name: 'Basketball', verb: 'Hold action near the ball to catch. Release to shoot.', icon: '◉' },
    soccer: { name: 'Soccer', verb: 'Kick the ball into the far goal.', icon: '⬡' },
    volleyball: { name: 'Volleyball', verb: 'Land the ball on the other side of the net.', icon: '◒' },
    knockout: { name: 'Knockout', verb: 'Jump and bump your rival off the platform.', icon: '✦' }
};
export const TEAMS = [
    { name: 'Frogs', color: 0xc8ff38, hex: '#c8ff38', face: 'frog' },
    { name: 'Rockets', color: 0xff3d57, hex: '#ff3d57', face: 'rocket' },
    { name: 'Robots', color: 0x26e6ff, hex: '#26e6ff', face: 'robot' },
    { name: 'Yetis', color: 0xf7f7fa, hex: '#f7f7fa', face: 'yeti' },
    { name: 'Ghosts', color: 0x8b5cf6, hex: '#8b5cf6', face: 'ghost' },
    { name: 'Aliens', color: 0xffb638, hex: '#ffb638', face: 'alien' }
];
export const ARENAS = [
    { name: 'Underground', sky: 0x101318, floor: 0x30343b, accent: 0xffb638, dark: true, gravity: 1, friction: 1 },
    { name: 'Meadow', sky: 0x142322, floor: 0x263b2a, accent: 0xc8ff38, dark: true, gravity: 1, friction: 1 },
    { name: 'Mars', sky: 0x201116, floor: 0x62382e, accent: 0xff8162, dark: true, gravity: 1, friction: 1 },
    { name: 'Neon City', sky: 0x090f1d, floor: 0x222c3d, accent: 0x26e6ff, dark: true, gravity: 1, friction: 1 },
    { name: 'Reactor', sky: 0x101a1b, floor: 0x293234, accent: 0x51e9b4, dark: true, gravity: 1, friction: 1 }
];
