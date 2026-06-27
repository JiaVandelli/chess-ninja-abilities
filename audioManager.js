const AudioManager = {
  ctx: null,
  volume: 0.3,
  unlocked: false,

  init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.volume = 0.3;

    const unlock = () => {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.unlocked = true;
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
    if (!this.unlocked) return;

    switch(name) {
      case 'move':
        // Click morbido e preciso: due note brevi
        this._tone(380, 0.03, 'triangle', 0.18);
        setTimeout(() => this._tone(520, 0.04, 'triangle', 0.14), 25);
        break;

      case 'capture':
        // Colpo deciso e pesante: rumore + impatto grave
        this._noise(0.08, 0.35);
        this._tone(180, 0.10, 'square', 0.18);
        setTimeout(() => this._tone(120, 0.06, 'square', 0.10), 40);
        break;

      case 'check':
        // Allarme breve e teso: due note discendenti
        this._tone(720, 0.08, 'sawtooth', 0.18);
        setTimeout(() => this._tone(520, 0.10, 'sawtooth', 0.16), 70);
        break;

      case 'evolve':
        // Suono epico in salita: sweep + fanfara
        this._toneSweep(250, 900, 0.18, 'triangle', 0.18);
        setTimeout(() => this._tone(1000, 0.12, 'sine', 0.18), 180);
        setTimeout(() => this._tone(1400, 0.10, 'sine', 0.14), 280);
        break;

      case 'ability':
        // Effetto magico/energetico: tre note rapide ascendenti
        this._tone(550, 0.05, 'triangle', 0.15);
        setTimeout(() => this._tone(780, 0.05, 'triangle', 0.15), 50);
        setTimeout(() => this._tone(1100, 0.06, 'triangle', 0.13), 100);
        break;

      case 'victory':
        // Fanfara di vittoria: C5 E5 G5 C6 (frequenze in Hz)
        this._tone(523.25, 0.15, 'sine', 0.25);
        setTimeout(() => this._tone(659.25, 0.15, 'sine', 0.25), 150);
        setTimeout(() => this._tone(783.99, 0.15, 'sine', 0.25), 300);
        setTimeout(() => this._tone(1046.50, 0.3, 'sine', 0.3), 450);
        break;

      case 'defeat':
        // Sconfitta: due note discendenti lente
        this._tone(500, 0.2, 'triangle', 0.2);
        setTimeout(() => this._tone(320, 0.25, 'triangle', 0.18), 200);
        setTimeout(() => this._tone(180, 0.3, 'triangle', 0.15), 450);
        break;

      case 'error':
        // Tre beep velocissimi di errore
        this._tone(200, 0.05, 'square', 0.12);
        setTimeout(() => this._tone(200, 0.05, 'square', 0.12), 70);
        setTimeout(() => this._tone(200, 0.05, 'square', 0.12), 140);
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