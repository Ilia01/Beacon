window.addEventListener('DOMContentLoaded', async () => {
  const hub = document.querySelector('.hub');
  const statusText = document.getElementById('status-text');
  const versionEl = document.querySelector('.version');
  const settingsBtn = document.getElementById('settings-btn');
  const apiKeyInput = document.getElementById('api-key-input');
  const saveKeyBtn = document.getElementById('save-key-btn');
  const keyStatus = document.getElementById('key-status');
  const keyBadge = document.getElementById('key-badge');

  const KEY_SAVED_PLACEHOLDER = '\u2022'.repeat(12);

  const version = await window.electronAPI.getVersion();
  versionEl.textContent = `v${version}`;

  const existing = await window.electronAPI.getApiKey();
  if (existing) {
    apiKeyInput.placeholder = KEY_SAVED_PLACEHOLDER;
    keyBadge.textContent = 'active';
    keyBadge.className = 'key-badge active';
  }

  settingsBtn.addEventListener('click', () => {
    hub.classList.toggle('settings-open');
  });

  saveKeyBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) return;

    try {
      await window.electronAPI.setApiKey(key);
      apiKeyInput.value = '';
      apiKeyInput.placeholder = KEY_SAVED_PLACEHOLDER;
      keyBadge.textContent = 'active';
      keyBadge.className = 'key-badge active';
      keyStatus.textContent = 'Key saved';
      keyStatus.className = 'key-status success';
      setTimeout(() => {
        keyStatus.textContent = '';
        keyStatus.className = 'key-status';
      }, 2500);
    } catch {
      keyStatus.textContent = 'Failed to save';
      keyStatus.className = 'key-status error';
    }
  });

  apiKeyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveKeyBtn.click();
  });

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
