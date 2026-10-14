import Phaser from 'phaser';
import { MatchScene } from './scenes/MatchScene';
import { StageLayout } from './systems/StageLayout';
import './style.css';

const layout = new StageLayout(document.getElementById('game-shell')!, document.getElementById('game-stage')!);
const game = new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: window.innerWidth, height: window.innerHeight, backgroundColor: '#050507', antialias: true, powerPreference: 'high-performance', input: { keyboard: false }, scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight }, scene: [MatchScene], fps: { target: 60, forceSetTimeOut: false }, render: { roundPixels: false } });
window.addEventListener('pagehide', (event) => { if (!event.persisted) { layout.destroy(); game.destroy(true); } });
