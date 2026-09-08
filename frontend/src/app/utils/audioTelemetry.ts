// Web Speech API & Web Audio API telemetry engine for hands-free paramedic navigation and emergency vitals alerts

class AudioTelemetryEngine {
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = typeof window !== 'undefined' && localStorage.getItem('ierbms_audio_muted') === 'true';
  private lastSpokenText: string = '';
  private lastSpokenTimestamp: number = 0;
  private readonly DEDUPLICATION_WINDOW_MS: number = 8000; // Do not repeat identical phrase within 8 seconds

  private getAudioContext(): AudioContext {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    return this.audioCtx!;
  }

  public speak(text: string, priority: 'normal' | 'high' = 'normal') {
    if (this.isMuted || !this.synth) return;

    const trimmed = (text || '').trim();
    if (!trimmed) return;

    const now = Date.now();

    // Deduplication check: prevent identical speech from looping
    if (priority !== 'high' && trimmed === this.lastSpokenText && (now - this.lastSpokenTimestamp) < this.DEDUPLICATION_WINDOW_MS) {
      return;
    }

    this.lastSpokenText = trimmed;
    this.lastSpokenTimestamp = now;

    // Flush any currently queued / playing speech so messages NEVER pile up into a loop
    try {
      this.synth.cancel();
    } catch {
      // Safe fallback
    }

    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.lang = 'en-US';

    // Pick crisp natural English voice if available
    try {
      const voices = this.synth.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    } catch {
      // fallback
    }

    utterance.onerror = () => {
      // Cleanly ignore canceled/interrupted events from queue flushing
    };

    try {
      this.synth.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis playback error:", e);
    }
  }

  public stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
  }

  public playAlertBeep(severity: 'critical' | 'warning' | 'success' = 'warning') {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (severity === 'critical') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (severity === 'warning') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      console.warn("Audio Context playback error:", e);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ierbms_audio_muted', String(this.isMuted));
      } catch {}
    }
    if (this.isMuted && this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const audioTelemetry = new AudioTelemetryEngine();

