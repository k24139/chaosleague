import test from 'node:test';
import assert from 'node:assert/strict';
import { stageFit } from '../src/systems/StageLayout';
import { WIDTH, HEIGHT } from '../src/config/game';
for (const [width, height] of [[1920,1080], [1440,900], [1280,800], [1024,768], [844,390], [667,375], [375,667]]) {
    for (const rail of [0,70]) test(`stage, canvas, HUD and overlays fit ${width}x${height} with ${rail}px input rail`, () => {
        const available = height - rail, fit = stageFit(width, available);
        assert.ok(fit.scale > 0);
        assert.ok(fit.left >= 0 && fit.top >= 0);
        assert.ok(fit.left + WIDTH * fit.scale <= width + 1e-8);
        assert.ok(fit.top + HEIGHT * fit.scale <= available + 1e-8);
        assert.ok(Math.abs(WIDTH * fit.scale / (HEIGHT * fit.scale) - 16/9) < 1e-8);
        // Logical edge coordinates are shared by the canvas and all DOM overlays.
        assert.equal(fit.left * 2 + WIDTH * fit.scale, width);
        assert.equal(fit.top * 2 + HEIGHT * fit.scale, available);
    });
}
