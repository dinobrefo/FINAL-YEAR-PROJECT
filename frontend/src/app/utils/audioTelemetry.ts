// Web Speech API & Web Audio API telemetry engine for hands-free paramedic navigation and emergency vitals alerts

class AudioTelemetryEngine {
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    return this.audioCtx!;
  }

  public speak(text: string, priority: 'normal' | 'high' = 'normal') {
    if (this.isMuted || !this.synth) return;

    if (priority === 'high') {
      this.synth.cancel(); // Cancel ongoing speech for high-priority emergency alerts
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.lang = 'en-US';

    // Pick crisp natural English voice if available
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel')));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    this.synth.speak(utterance);
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
    if (this.isMuted && this.synth) {
      this.synth.cancel();
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const audioTelemetry = new AudioTelemetryEngine();
