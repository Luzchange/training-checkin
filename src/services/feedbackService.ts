/**
 * Audio and Haptic Feedback Helper
 * Operates purely client-side without external dependencies.
 */

// Simple Web Audio API beep synthesizer so no external audio files are required
class SoundFeedbackManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playSuccess(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Ignore audio synthesis errors on locked browsers
    }
  }

  playWarning(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.08); // E4
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Ignore
    }
  }
}

export const soundManager = new SoundFeedbackManager();

export function triggerScanFeedback(
  type: 'success' | 'warning',
  options: { soundEnabled: boolean; vibrationEnabled: boolean }
): void {
  if (options.soundEnabled) {
    if (type === 'success') {
      soundManager.playSuccess();
    } else {
      soundManager.playWarning();
    }
  }

  if (options.vibrationEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'success') {
        navigator.vibrate(60);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
    } catch {
      // Vibrate might be blocked by permission policies
    }
  }
}

