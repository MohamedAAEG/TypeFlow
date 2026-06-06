// TypeFlow V1.0 - Web Audio API Mechanical Keyboard Sound Synthesizer
class TypingAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.soundType = 'blue'; // 'blue' | 'brown' | 'red'
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playKeySound(isError = false) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      if (isError) {
        this.playErrorSound();
        return;
      }

      switch (this.soundType) {
        case 'blue':
          this.playBlueSwitch();
          break;
        case 'brown':
          this.playBrownSwitch();
          break;
        case 'red':
          this.playRedSwitch();
          break;
      }
    } catch (e) {
      console.warn("Audio synthesis error:", e);
    }
  }

  playBlueSwitch() {
    const time = this.ctx.currentTime;
    
    // --- Metal Click Leaf (High Pitch Osc) ---
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1500 + Math.random() * 200, time);
    osc.frequency.exponentialRampToValueAtTime(700, time + 0.012);
    
    oscGain.gain.setValueAtTime(0.04, time);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.012);
    
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    
    // --- Key Bottom-Out Clack (Noise) ---
    const bufferSize = this.ctx.sampleRate * 0.03; // 30ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000 + Math.random() * 100, time);
    noiseFilter.Q.setValueAtTime(4, time);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.07, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    
    osc.start(time);
    osc.stop(time + 0.015);
    noise.start(time);
    noise.stop(time + 0.035);
  }

  playBrownSwitch() {
    const time = this.ctx.currentTime;
    
    // Brown Switch: Quieter, mid-tone thud clack
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(450 + Math.random() * 50, time);
    osc.frequency.exponentialRampToValueAtTime(120, time + 0.015);
    
    oscGain.gain.setValueAtTime(0.09, time);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.015);
    
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    // Subtle noise
    const bufferSize = this.ctx.sampleRate * 0.025;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(600, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.04, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.02);
    noise.start(time);
    noise.stop(time + 0.025);
  }

  playRedSwitch() {
    const time = this.ctx.currentTime;
    // Red Switch: Linear thock, deep low pitch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200 + Math.random() * 30, time);
    osc.frequency.exponentialRampToValueAtTime(60, time + 0.035);
    
    oscGain.gain.setValueAtTime(0.12, time);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
    
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    // Deep low-pass noise
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(180, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.04);
    noise.start(time);
    noise.stop(time + 0.045);
  }

  playErrorSound() {
    const time = this.ctx.currentTime;
    // Low muffled buzzer sound
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(110, time);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(112, time);
    
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(250, time);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(lp);
    lp.connect(this.ctx.destination);
    
    osc1.start(time);
    osc2.start(time);
    
    osc1.stop(time + 0.12);
    osc2.stop(time + 0.12);
  }
}

const typingAudio = new TypingAudioEngine();
window.typingAudio = typingAudio; // Expose globally to be used in App
