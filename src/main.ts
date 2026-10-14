import Phaser from 'phaser';
import { MatchScene } from './scenes/MatchScene';
import { StageLayout } from './systems/StageLayout';
import { PALETTE } from './config/theme';
import './style.css';

const layout = new StageLayout(document.getElementById('game-shell')!, document.getElementById('game-stage')!);
const game = new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: window.innerWidth, height: window.innerHeight, backgroundColor: PALETTE.void, antialias: true, powerPreference: 'high-performance', input: { keyboard: false }, scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight }, scene: [MatchScene], fps: { target: 60, forceSetTimeOut: false }, render: { roundPixels: false } });
// Local browser audits can reproduce rare score/arena states through the real scene.
// Vite removes this branch from the production bundle.
if ((import.meta as ImportMeta & { env: { DEV: boolean } }).env.DEV) Object.defineProperty(window, '__chaos', { configurable: true, get: () => game.scene.getScene('Match') });
window.addEventListener('pagehide', (event) => { if (!event.persisted) { layout.destroy(); game.destroy(true); } });
