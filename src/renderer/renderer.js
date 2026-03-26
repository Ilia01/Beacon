window.addEventListener('DOMContentLoaded', () => {
  const ping = new Audio('../../assets/ping.wav');

  const prompt = document.getElementById('prompt-text');
  const coach = document.getElementById('coach');

  window.electronAPI.onStateChange((value) => {
    coach.className = 'coach ' + value.state;

    if (value.state === 'active') {
      prompt.innerText = value.prompt;
      ping.play();
    }
  });

  const beacon = document.getElementById('beacon');

  beacon.addEventListener('mouseenter', () => {
    window.electronAPI.setIgnoreMouseEvents(false);
  });
  beacon.addEventListener('mouseleave', () => {
    window.electronAPI.setIgnoreMouseEvents(true);
  });
});
