import { icon } from '../ui/icons';
export function fullscreenView(active: boolean) { return { label: active ? 'Exit fullscreen' : 'Enter fullscreen', icon: active ? 'exitFullscreen' as const : 'fullscreen' as const }; }
export class FullscreenControl {
    private controller = new AbortController();
    constructor(private button: HTMLButtonElement, private target: HTMLElement, private announce: (message: string) => void) {
        document.addEventListener('fullscreenchange', this.sync, { signal: this.controller.signal });
        button.addEventListener('click', () => void this.toggle(), { signal: this.controller.signal });
        button.hidden = !document.fullscreenEnabled; this.sync();
    }
    private sync = () => { const state = fullscreenView(Boolean(document.fullscreenElement)); this.button.innerHTML = icon(state.icon); this.button.setAttribute('aria-label', state.label); this.button.setAttribute('aria-pressed', String(Boolean(document.fullscreenElement))); this.button.title = state.label; };
    private async toggle() {
        try { if (document.fullscreenElement) await document.exitFullscreen(); else await this.target.requestFullscreen(); }
        catch { this.announce('Fullscreen is unavailable in this browser.'); }
        this.sync();
    }
    destroy() { this.controller.abort(); }
}
