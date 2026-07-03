export const soundEngine = {
  ctx: null as AudioContext | null,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  playActivate() {
    this.init();
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.3);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.start(t);
    osc.stop(t + 0.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(400, t + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1200, t + 0.4);
    gain2.gain.setValueAtTime(0.15, t + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc2.start(t + 0.1);
    osc2.stop(t + 0.5);
  },

  playPing(delay = 0) {
    this.init();
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.2);
  },

  playSuccess() {
    this.init();
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.3);
    });
  },

  playClose() {
    this.init();
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.2);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.2);
  },

  playTick() {
    this.init();
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.value = 400;
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.start(t);
    osc.stop(t + 0.05);
  },

  playPremiumActivate() {
    this.init();
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, t);
    sub.frequency.exponentialRampToValueAtTime(220, t + 0.3);
    subGain.gain.setValueAtTime(0.25, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    sub.start(t);
    sub.stop(t + 0.5);

    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, t + 0.05 + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05 + i * 0.08 + 0.35);
      osc.start(t + 0.05 + i * 0.08);
      osc.stop(t + 0.05 + i * 0.08 + 0.35);
    });

    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(1200, t);
    shimmer.frequency.exponentialRampToValueAtTime(2400, t + 0.4);
    shimmerGain.gain.setValueAtTime(0.06, t);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    shimmer.start(t);
    shimmer.stop(t + 0.45);
  },
};
