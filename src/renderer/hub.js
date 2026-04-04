window.addEventListener('DOMContentLoaded', () => {
  const hub = document.querySelector('.hub');
  const statusText = document.getElementById('status-text');

  window.electronAPI.onAppStatus((value) => {
    if (value.status === 'connected') {
      hub.classList.add('connected');
      statusText.textContent = 'Game detected';
    } else {
      hub.classList.remove('connected');
      statusText.textContent = 'Searching for game';
    }
  });
});
