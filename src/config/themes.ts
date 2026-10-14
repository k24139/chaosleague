// Environment identity only. Sport geometry and chaos physics have separate owners.
export interface ArenaTheme {
    id: string;
    name: string;
    displayName: string;
    sky: number;
    far: number;
    mid: number;
    near: number;
    floor: number;
    groundStyle: 'stone' | 'grass' | 'sand' | 'snow' | 'metal';
    accent: number;
    lighting: number;
    particles: 'dust' | 'snow' | 'leaves' | 'rain' | 'bubbles' | 'cloud' | 'sparks';
    dark: boolean;
    gravity: number;
    friction: number;
}
function theme(id: string, name: string, displayName: string, colors: number[], groundStyle: ArenaTheme['groundStyle'], particles: ArenaTheme['particles']): ArenaTheme {
    const [sky, far, mid, near, floor, accent] = colors;
    return { id, name, displayName, sky, far, mid, near, floor, accent, lighting: accent, groundStyle, particles, dark: true, gravity: 1, friction: 1 };
}
export const THEMES: ArenaTheme[] = [
    theme('underground', 'Underground', 'Underground', [0x101318,0x182129,0x303740,0x46515d,0x30343b,0xffb638], 'metal','dust'),
    theme('meadow', 'Meadow', 'Meadow', [0x142322,0x203b35,0x304d3b,0x435b44,0x263b2a,0xc8ff38], 'grass','leaves'),
    theme('mars', 'Mars', 'Mars', [0x201116,0x46262b,0x683a36,0x9b6550,0x62382e,0xff8162], 'sand','dust'),
    theme('neon', 'Neon City', 'Neon City', [0x090f1d,0x131825,0x1d2434,0x414c63,0x222c3d,0x26e6ff], 'metal','rain'),
    theme('reactor', 'Reactor', 'Reactor', [0x101a1b,0x1a292b,0x36484a,0x576962,0x293234,0x51e9b4], 'metal','sparks'),
    theme('desert', 'Desert', 'Dust Basin', [0x648187,0x7c837b,0xb69b74,0x786c51,0x9b8463,0xffd38a], 'sand','dust'),
    theme('snow', 'Snow', 'Whiteout Court', [0x617d94,0x8ea5b2,0x536e80,0x284652,0x91a8b5,0xd7efff], 'snow','snow'),
    theme('forest', 'Forest', 'Timberline', [0x1e3835,0x3b5650,0x294539,0x162d27,0x344536,0xb9d49a], 'grass','leaves'),
    theme('mountain', 'Mountain', 'Summit Arena', [0x547787,0x88a0aa,0x5b7682,0x334752,0x56616a,0xc2d9de], 'stone','cloud'),
    theme('beach', 'Beach', 'Breakwater', [0x749fa5,0x567f88,0x2c626e,0x284f4a,0xa5926a,0xffdea5], 'sand','cloud'),
    theme('neighborhood', 'Neighborhood', 'Backyard League', [0x607589,0x4b5964,0x635f5a,0x35463d,0x57585b,0xffcf89], 'stone','leaves'),
    theme('underwater', 'Underwater', 'Abyss Dome', [0x0d273b,0x163e50,0x245568,0x1a3442,0x354954,0x87dce8], 'metal','bubbles'),
    theme('sky', 'Atmosphere / Sky', 'Cloudline', [0x547f9b,0xb2c1c6,0x8ba9b9,0x506c82,0x526577,0xe2eff3], 'metal','cloud'),
    theme('moon', 'Moon', 'Lunar Yard', [0x0a1424,0x37404d,0x626977,0x444b56,0x656b74,0xb1c4e3], 'stone','dust'),
    theme('sun', 'Sun', 'Helios Array', [0x231b25,0x6d3b32,0xa66a43,0x3c3d47,0x41414c,0xffbd62], 'metal','sparks'),
    theme('dystopia', 'Dystopia', 'Sector Zero', [0x323d40,0x485350,0x293738,0x1b292c,0x394342,0xb8c695], 'stone','dust'),
    theme('storm', 'Storm', 'Storm Drain', [0x253644,0x4b5b66,0x344d57,0x263841,0x3f515b,0xb4d4e7], 'stone','rain'),
    theme('volcano', 'Volcano', 'Cinder Ridge', [0x342b32,0x5c4548,0x382e37,0x453731,0x454044,0xff9951], 'stone','sparks'),
    theme('ruins', 'Ancient Ruins', 'Old Quarry', [0x6a8482,0x85958a,0x596f61,0x48574b,0x687268,0xe0d3a4], 'stone','leaves'),
    theme('cyber', 'Cyber City', 'Circuit District', [0x15283b,0x2b4354,0x203342,0x375d6c,0x344855,0x85d5d5], 'metal','rain'),
    theme('arctic', 'Arctic Station', 'Polar Outpost', [0x456980,0x7292a2,0xabc2ca,0x445b6b,0x758e9c,0xcce7e8], 'snow','snow'),
    theme('orbital', 'Orbital Station', 'Dock Nine', [0x081420,0x244150,0x416674,0x293e4d,0x3a505e,0x93d4ce], 'metal','dust')
];
