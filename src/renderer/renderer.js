window.addEventListener('DOMContentLoaded', () => {
  const prompt = document.getElementById('prompt-text');
  const coach = document.getElementById('coach');

  window.electronAPI.onStateChange((value) => {
    coach.className = 'coach ' + value.state;

    if (value.state === 'active') {
      prompt.innerText = value.prompt;
    }
  });
});
