import { defineConfig } from 'vite';
export default defineConfig({build:{rollupOptions:{output:{manualChunks:{phaser:['phaser'],physics:['matter-js']}}},chunkSizeWarningLimit:1400},server:{host:'0.0.0.0'}});
