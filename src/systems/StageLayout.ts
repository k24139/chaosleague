import { WIDTH, HEIGHT } from '../config/game';

export function stageFit(width: number, height: number) {
    const scale = Math.max(0, Math.min(width / WIDTH, height / HEIGHT));
    return { scale, left: (width - WIDTH * scale) / 2, top: (height - HEIGHT * scale) / 2 };
}
export class StageLayout {
    private observer: ResizeObserver;
    private mutations: MutationObserver;
    constructor(shell: HTMLElement, stage: HTMLElement) {
        const resize = () => {
            const rail = shell.classList.contains("playing") && window.matchMedia("(pointer: coarse)").matches ? 70 : 0;
            const { scale, left, top } = stageFit(shell.clientWidth, Math.max(0, shell.clientHeight - rail));
            stage.style.transform = '';
            shell.style.setProperty('--arena-left', `${left}px`);
            shell.style.setProperty('--arena-top', `${top}px`);
            shell.style.setProperty('--stage-scale', String(Math.max(.001, scale)));
        };
        this.observer = new ResizeObserver(resize);
        this.observer.observe(shell);
        this.mutations = new MutationObserver(resize);
        this.mutations.observe(shell, { attributes: true, attributeFilter: ["class"] });
        resize();
    }
    destroy() { this.observer.disconnect(); this.mutations.disconnect(); }
}
