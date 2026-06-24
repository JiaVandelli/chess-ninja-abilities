const AudioManager = {
  sounds: {},
  volume: 0.5,
  init() {
    // Precarica ma non riproduce
    ['move','capture','evolve','ability','error'].forEach(name => {
      const audio = new Audio(`sounds/${name}.mp3`);
      audio.volume = this.volume;
      audio.preload = 'auto';
      this.sounds[name] = audio;
    });
    // Sblocca audio al primo tap
    document.addEventListener('touchstart', () => {
      Object.values(this.sounds).forEach(a => a.play().then(() => a.pause()).catch(()=>{}));
    }, {once: true});
  },
  play(name) {
    const s = this.sounds[name];
    if (!s) return console.error('Suono non trovato:', name);
    s.currentTime = 0;
    s.play().catch(e => {});
  }
};
AudioManager.init();