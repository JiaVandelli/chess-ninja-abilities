const AudioManager = {
  ctx: null,
  volume: 0.3,
  unlocked: false,

  init() {
    // Crea contesto audio (con fallback per browser meno recenti)
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.volume = 0.3;

    // Sblocca audio al primo tap
    const unlock = () => {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.unlocked = true;
      // Suono silenzioso per sbloccare completamente
      const buf = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(0);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('touchstart', unlock, {once: true});
    document.addEventListener('click', unlock, {once: true});
  },

  play(name) {
    if (!this.ctx) this.init();
    if (!this.unlocked) return; // Aspetta interazione utente

    switch(name) {
      case 'move':
        this._tone(200, 0.08, 'sine', 0.3);
        break;
      case 'capture':
        this._noise(0.15, 0.6); // effetto impatto
        this._tone(120, 0.1, 'square', 0.2);
        break;
      case 'evolve':
        this._toneSweep(300, 800, 0.2, 'sine', 0.3);
        break;
      case 'ability':
        this._toneSweep(400, 1000, 0.15, 'triangle', 0.25);
        setTimeout(() => this._toneSweep(600, 1200, 0.15, 'triangle', 0.25), 150);
        break;
      case 'error':
        this._tone(150, 0.15, 'sawtooth', 0.15);
        break;
      default:
        console.error('Suono non trovato:', name);
    }
  },

  // Genera un tono semplice
  _tone(freq, dur, type, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + dur);
  },

  // Sweep di frequenza (effetto evoluzione)
  _toneSweep(startFreq, endFreq, dur, type, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(endFreq, this.ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + dur);
  },

  // Rumore bianco per impatti/catture
  _noise(dur, vol) {
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(this.ctx.currentTime);
  }
};

AudioManager.init();