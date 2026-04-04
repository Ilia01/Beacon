window.addEventListener('DOMContentLoaded', async () => {
  const hub = document.querySelector('.hub');
  const statusText = document.getElementById('status-text');
  const versionEl = document.querySelector('.version');

  const version = await window.electronAPI.getVersion();
  versionEl.textContent = `v${version}`;

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
