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

  const hasKey = await window.electronAPI.hasApiKey();
  if (hasKey) {
    apiKeyInput.placeholder = KEY_SAVED_PLACEHOLDER;
    keyBadge.textContent = 'active';
    keyBadge.className = 'key-badge active';
  }

  settingsBtn.addEventListener('click', () => {
    hub.classList.toggle('settings-open');
  });

  saveKeyBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();

    try {
      await window.electronAPI.setApiKey(key);
      apiKeyInput.value = '';
      if (key) {
        apiKeyInput.placeholder = KEY_SAVED_PLACEHOLDER;
        keyBadge.textContent = 'active';
        keyBadge.className = 'key-badge active';
        keyStatus.textContent = 'Key saved';
        keyStatus.className = 'key-status success';
      } else {
        apiKeyInput.placeholder = 'gsk_...';
        keyBadge.textContent = 'inactive';
        keyBadge.className = 'key-badge inactive';
        keyStatus.textContent = 'Key cleared';
        keyStatus.className = 'key-status success';
      }
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
    hub.classList.remove('connected', 'error');

    if (value.status === 'connected') {
      hub.classList.add('connected');
      statusText.textContent = 'Game detected';
    } else if (value.status === 'error') {
      hub.classList.add('error');
      statusText.textContent = value.reason;
    } else {
      statusText.textContent = 'Searching for game';
    }
  });
});
