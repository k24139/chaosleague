import type { Input, Side } from '../config/game';

const CODES = new Set(['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
const fallback: Record<string, string> = { a: 'KeyA', d: 'KeyD', w: 'KeyW', s: 'KeyS', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight', arrowup: 'ArrowUp' };
export class InputManager {
    readonly keys = new Set<string>();
    readonly touches = new Map<number, { side: Side; key: keyof Input }>();
    private listening = new AbortController();
    private active = false;
    private blocked = new Set<string>();
    private blockedTouches = new Set<number>();
    twoPlayer = false;
    inMatch = false;
    private taps = new Set<string>();
    private touchTaps = new Map<number, { side: Side; key: keyof Input }>();
    constructor() {
        const options = { capture: true, signal: this.listening.signal };
        window.addEventListener('keydown', this.keydown, options);
        window.addEventListener('keyup', this.keyup, options);
        window.addEventListener('blur', this.clear, options);
        document.addEventListener('visibilitychange', this.visibility, options);
        document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach(button => {
            button.addEventListener('pointerdown', e => {
                if (!this.inMatch && !this.enabled) return;
                e.preventDefault();
                button.setPointerCapture(e.pointerId);
                const touch = { side: Number(button.dataset.side) as Side, key: button.dataset.control as keyof Input };
                this.touches.set(e.pointerId, touch);
                if (this.enabled) this.touchTaps.set(e.pointerId, touch);
                button.classList.add('held');
            }, { signal: this.listening.signal });
            const release = (e: PointerEvent) => {
                const wasHeld = this.touches.has(e.pointerId);
                this.touches.delete(e.pointerId);
                this.blockedTouches.delete(e.pointerId);
                if (e.type === 'pointercancel' || (e.type === 'lostpointercapture' && wasHeld)) this.touchTaps.delete(e.pointerId);
                if (![...this.touches.values()].some(t => t.side === Number(button.dataset.side) && t.key === button.dataset.control)) button.classList.remove('held');
            };
            for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, release as EventListener, { signal: this.listening.signal });
        });
    }
    get enabled() { return this.active; }
    // A phase gate never deletes the physical half of a key press.
    set enabled(value: boolean) {
        this.active = value;
        if (!value) { this.taps.clear(); this.touchTaps.clear(); }
        for (const code of this.keys) if (['KeyS', 'ArrowDown', 'KeyW', 'ArrowUp'].includes(code)) this.blocked.add(code);
        for (const [id, t] of this.touches) if (t.key === 'action' || t.key === 'jump') this.blockedTouches.add(id);
    }
    private code(e: KeyboardEvent) { return e.code || fallback[e.key.toLowerCase()]; }
    private keydown = (e: KeyboardEvent) => {
        const code = this.code(e), target = e.target as HTMLElement | null;
        if (e.ctrlKey || e.metaKey || e.altKey || !CODES.has(code) || target?.matches?.('input, select, textarea, [contenteditable="true"]')) return;
        if (this.active || this.inMatch) e.preventDefault();
        if (!this.keys.has(code) && this.active) this.taps.add(code);
        this.keys.add(code);
    };
    private keyup = (e: KeyboardEvent) => { this.keys.delete(this.code(e)); this.blocked.delete(this.code(e)); };
    private visibility = () => { if (document.hidden) this.clear(); };
    get(side: Side): Input {
        const input: Input = { left: false, right: false, action: false };
        if (!this.active || (side === 1 && !this.twoPlayer)) return input;
        const codes = side === 1 ? ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] : this.twoPlayer ? ['KeyA', 'KeyD', 'KeyW', 'KeyS'] : ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        const pressed = (code: string) => !this.blocked.has(code) && (this.keys.has(code) || this.taps.has(code));
        for (let i = 0; i < codes.length; i++) {
            const control = (['left', 'right', 'jump', 'action'] as const)[i % 4];
            if (pressed(codes[i])) input[control] = true;
            this.taps.delete(codes[i]);
        }
        for (const [id, t] of this.touches) if (t.side === side && !this.blockedTouches.has(id)) input[t.key] = true;
        for (const [id, tap] of this.touchTaps) if (tap.side === side) { input[tap.key] = true; this.touchTaps.delete(id); }
        if (input.left && input.right) input.left = input.right = false;
        return input;
    }
    clear = () => {
        this.keys.clear();
        this.blocked.clear(); this.blockedTouches.clear();
        this.taps.clear();
        this.touchTaps.clear();
        this.touches.clear();
        document.querySelectorAll('.held').forEach(e => e.classList.remove('held'));
    };
    destroy() { this.enabled = false; this.clear(); this.listening.abort(); }
}
