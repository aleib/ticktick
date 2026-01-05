import type { TimerStore } from "../timer/timerStore.js";

export type IdleWatcherInput = {
  timerStore: TimerStore;
  idlePauseSeconds: number;
};

/**
 * Basic idle detection.
 *
 * Intent: auto-stop the running timer when the user is idle long enough to avoid inflated time.
 * We use activity events + visibility as a pragmatic MVP approach.
 */
export class IdleWatcher {
  private timerStore: TimerStore;
  private idlePauseSeconds: number;

  private lastActivityMs: number = Date.now();
  private poll: number | null = null;
  private unsubs: Array<() => void> = [];

  constructor({ timerStore, idlePauseSeconds }: IdleWatcherInput) {
    this.timerStore = timerStore;
    this.idlePauseSeconds = idlePauseSeconds;
  }

  start(): void {
    const onActivity = () => {
      this.lastActivityMs = Date.now();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        onActivity();
      }
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "mousedown",
      "touchstart",
      "scroll",
    ];
    for (const e of events) {
      window.addEventListener(e, onActivity, { passive: true });
      this.unsubs.push(() => window.removeEventListener(e, onActivity));
    }

    document.addEventListener("visibilitychange", onVisibility);
    this.unsubs.push(() =>
      document.removeEventListener("visibilitychange", onVisibility)
    );

    this.poll = window.setInterval(() => {
      void this.checkIdle();
    }, 1_000);
  }

  stop(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];

    if (this.poll != null) {
      window.clearInterval(this.poll);
      this.poll = null;
    }
  }

  private async checkIdle(): Promise<void> {
    const state = await this.timerStore.getState();
    if (state == null || !state.isRunning) return;

    const idleSeconds = (Date.now() - this.lastActivityMs) / 1000;
    if (idleSeconds < this.idlePauseSeconds) return;

    // We stop the timer (recording a session) at the last-known active instant.
    // This aligns with the product intent: avoid counting idle time.
    const endAtIso = new Date(this.lastActivityMs).toISOString();
    await this.timerStore.splitAndPauseAt(endAtIso);
  }
}
