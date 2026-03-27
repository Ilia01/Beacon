window.addEventListener('DOMContentLoaded', () => {
  const ping = new Audio('../../assets/ping.wav');

  const prompt = document.getElementById('prompt-text');
  const coach = document.getElementById('coach');

  const VALID_STATES = new Set(['active', 'cooldown', 'idle']);

  window.electronAPI.onStateChange((value) => {
    const state = VALID_STATES.has(value.state) ? value.state : 'idle';
    coach.className = 'coach ' + state;

    if (value.state === 'active') {
      prompt.innerText = value.prompt;
      ping.play();
    }
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
