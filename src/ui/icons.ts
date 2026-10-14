// Original beveled arena icon set. All glyphs use the same 32px grid and 2px stroke.
const paths = {
    quick: '<path d="M4 26v-6l4-3h7l4 3v6M8 11V6h7v5l-3 3h-1zM22 5h6v10h-6zM23 9h4M24 3v4M24 13v4M4 28h24"/>',
    two: '<path d="M3 25v-5l4-3h5l3 3v5M17 25v-5l4-3h5l3 3v5M6 11V6h7v5l-3 3H9zM19 11V6h7v5l-3 3h-1zM15 9h2M4 28h24"/>',
    cup: '<path d="M10 4h12v10l-4 5h-4l-4-5zM10 7H5v6l5 4M22 7h5v6l-5 4M16 19v6M10 28h12M14 25h4M17 6l-4 6h4l-2 5 6-7h-4z"/>',
    settings: '<path d="M12 4h8l1 5 5 1 3 6-3 6-5 1-1 5h-8l-1-5-5-1-3-6 3-6 5-1z"/><circle cx="16" cy="16" r="5"/>',
    rules: '<path d="M6 4h15l5 5v19H6zM21 4v6h5M11 14h10M11 19h10M11 24h6"/>',
    audio: '<path d="M4 12h5l7-6v20l-7-6H4zM21 11c4 2 4 8 0 10M25 7c7 5 7 13 0 18"/>',
    muted: '<path d="M4 12h5l7-6v20l-7-6H4zM22 12l7 8M29 12l-7 8"/>',
    fullscreen: '<path d="M4 12V4h8M20 4h8v8M28 20v8h-8M12 28H4v-8"/>',
    exitFullscreen: '<path d="M4 12h8V4M20 4v8h8M28 20h-8v8M12 28v-8H4"/>',
    pause: '<path d="M10 7h3v18h-3zM19 7h3v18h-3z"/>',
    left: '<path d="M23 5 10 16l13 11M11 16h17"/>',
    right: '<path d="m9 5 13 11L9 27M21 16H4"/>',
    action: '<path d="m6 17 10-12 10 12M16 6v22M7 25h18"/>',
    arrow: '<path d="M8 24 24 8M9 8h15v15"/>',
    rotate: '<path d="M6 12a11 11 0 0 1 18-5l4 4M28 4v7h-7M26 20a11 11 0 0 1-18 5l-4-4M4 28v-7h7"/>',
    chaos: '<path d="M18 3 7 18h9l-2 11 12-16h-9z"/>'
};
export type IconName = keyof typeof paths;
export function icon(name: IconName) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="bevel" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}
export const iconNames = Object.keys(paths) as IconName[];
