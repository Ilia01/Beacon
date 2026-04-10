window.addEventListener('DOMContentLoaded', () => {
  const ping = new Audio('../../assets/ping.wav');

  const prompt = document.getElementById('prompt-text');
  const coach = document.getElementById('coach');

  const VALID_STATES = new Set(['active', 'cooldown', 'idle']);

  // Defense-in-depth: strip HTML so prompt text stays safe even if
  // innerText is ever replaced with innerHTML for formatting support.
  function sanitizeText(str) {
    if (typeof str !== 'string') return '';
    const doc = new DOMParser().parseFromString(str, 'text/html');
    return doc.body.textContent || '';
  }

  window.electronAPI.onStateChange((value) => {
    const state = VALID_STATES.has(value.state) ? value.state : 'idle';
    coach.className = 'coach ' + state;

    if (value.state === 'active') {
      prompt.innerText = sanitizeText(value.prompt);
      ping.play();
    }
  });

  window.electronAPI.onSpeakPrompt((text) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    speechSynthesis.speak(utterance);
  });

  const beacon = document.getElementById('beacon');

  let dragging = false;
  const position = {};

  beacon.addEventListener('mousedown', (ev) => {
    position.x = ev.screenX;
    position.y = ev.screenY;
    dragging = true;
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
  });
  document.addEventListener('mousemove', (ev) => {
    if (!dragging) return;

    const dx = ev.screenX - position.x;
    const dy = ev.screenY - position.y;
    window.electronAPI.setPosition({ dx, dy });
    position.x = ev.screenX;
    position.y = ev.screenY;
  });
});
