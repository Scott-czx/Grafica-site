// Audio is created only after the operator explicitly enables it.
(() => {
  let audio;
  globalThis.InkFlowAudio = Object.freeze({
    async enable() {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Este navegador não oferece áudio para alertas.');
      audio ||= new Audio();
      await audio.resume();
    },
    play() {
      if (!audio || audio.state !== 'running') return;
      const gain = audio.createGain(),
        oscillator = audio.createOscillator();
      const now = audio.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(650, now);
      oscillator.frequency.linearRampToValueAtTime(1100, now + 0.4);
      oscillator.frequency.linearRampToValueAtTime(650, now + 0.8);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 1);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    },
  });
})();
