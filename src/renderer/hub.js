window.addEventListener('DOMContentLoaded', async () => {
  const hub = document.querySelector('.hub');
  const statusText = document.getElementById('status-text');
  const versionEl = document.querySelector('.version');
  const summaryEl = document.getElementById('summary');
  const summaryTotal = document.getElementById('summary-total');
  const summaryList = document.getElementById('summary-list');

  const version = await window.electronAPI.getVersion();
  versionEl.textContent = `v${version}`;

  function hideSummary() {
    summaryEl.classList.add('hidden');
    summaryList.innerHTML = '';
  }

  function showSummary(data) {
    summaryTotal.textContent = `${data.totalPrompts} prompt${data.totalPrompts === 1 ? '' : 's'} fired`;
    summaryList.innerHTML = '';

    for (const entry of data.entries) {
      const row = document.createElement('div');
      row.className = 'summary-row';

      const category = document.createElement('span');
      category.className = 'summary-category';
      category.textContent = entry.category.replace(/_/g, ' ');

      const count = document.createElement('span');
      count.className = 'summary-count';
      count.textContent = `×${entry.count}`;

      const times = document.createElement('span');
      times.className = 'summary-times';
      times.textContent = entry.timestamps.join(', ');

      row.appendChild(category);
      row.appendChild(count);
      row.appendChild(times);
      summaryList.appendChild(row);
    }

    summaryEl.classList.remove('hidden');
  }

  window.electronAPI.onAppStatus((value) => {
    if (value.status === 'connected') {
      hub.classList.add('connected');
      statusText.textContent = 'Game detected';
      hideSummary();
    } else {
      hub.classList.remove('connected');
      statusText.textContent = 'Searching for game';
    }
  });

  window.electronAPI.onGameSummary((data) => {
    showSummary(data);
  });
});
