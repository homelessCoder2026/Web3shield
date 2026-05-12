/**
 * Popup UI Logic
 * Handles tab navigation, alerts display, settings, and whitelist management
 */

// Constants
const ALERT_TYPES = {
  WALLET_POISONING: { icon: '🚨', color: '#ff3b30' },
  SUSPICIOUS_AIRDROP: { icon: '⚠️', color: '#ff9500' },
  DUSTING_ATTACK: { icon: '🚨', color: '#ff3b30' },
  SUSPICIOUS_DOMAIN: { icon: '⚠️', color: '#ff9500' }
};

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const alertsList = document.getElementById('alerts-list');
const clearAlertsBtn = document.getElementById('clear-alerts-btn');
const settingsForm = document.getElementById('settings-form');
const settingsMessage = document.getElementById('settings-message');

// Tab switching
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;
    
    // Update active button
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update active pane
    tabPanes.forEach(pane => pane.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load data when switching tabs
    if (tabName === 'alerts') {
      loadAlerts();
    } else if (tabName === 'settings') {
      loadSettings();
    } else if (tabName === 'whitelist') {
      loadWhitelist();
    }
  });
});

/**
 * Load and display alerts
 */
async function loadAlerts() {
  const alerts = await chrome.runtime.sendMessage({ type: 'getAlerts' });
  
  if (!alerts || alerts.length === 0) {
    alertsList.innerHTML = '<p class="empty-state">🔍 No alerts detected yet</p>';
    return;
  }
  
  // Reverse to show newest first
  const html = alerts.reverse().map((alert, idx) => `
    <div class="alert-item alert-${alert.type.toLowerCase()}">
      <div class="alert-icon">${ALERT_TYPES[alert.type]?.icon || '⚠️'}</div>
      <div class="alert-content">
        <div class="alert-title">${alert.type.replace(/_/g, ' ')}</div>
        <div class="alert-message">${escapeHtml(alert.message)}</div>
        <div class="alert-time">${formatTime(alert.timestamp)}</div>
      </div>
      <button class="alert-close" onclick="removeAlert(${alerts.length - 1 - idx})">×</button>
    </div>
  `).join('');
  
  alertsList.innerHTML = html;
}

/**
 * Format timestamp to readable format
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  
  return date.toLocaleDateString();
}

/**
 * Remove alert from history
 */
async function removeAlert(index) {
  let alerts = await chrome.runtime.sendMessage({ type: 'getAlerts' });
  alerts = alerts.reverse();
  alerts.splice(index, 1);
  alerts = alerts.reverse();
  
  await chrome.runtime.sendMessage({ type: 'setAlerts', alerts });
  loadAlerts();
}

/**
 * Clear all alerts
 */
clearAlertsBtn.addEventListener('click', async () => {
  if (confirm('Clear all alerts? This cannot be undone.')) {
    await chrome.runtime.sendMessage({ type: 'clearAlerts' });
    loadAlerts();
  }
});

/**
 * Load settings form
 */
async function loadSettings() {
  const config = await chrome.runtime.sendMessage({ type: 'getConfig' });
  
  document.getElementById('dust-threshold').value = config.dustThreshold || 0.0000001;
  document.getElementById('address-similarity').value = config.addressSimilarityThreshold || 0.9;
  document.getElementById('enable-logging').checked = config.enableLogging !== false;
}

/**
 * Save settings
 */
settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const dustThreshold = parseFloat(document.getElementById('dust-threshold').value);
  const addressSimilarity = parseFloat(document.getElementById('address-similarity').value);
  const enableLogging = document.getElementById('enable-logging').checked;
  
  // Validation
  if (isNaN(dustThreshold) || dustThreshold < 0) {
    showMessage('Invalid dust threshold', 'error');
    return;
  }
  
  if (isNaN(addressSimilarity) || addressSimilarity < 0 || addressSimilarity > 1) {
    showMessage('Address similarity must be between 0 and 1', 'error');
    return;
  }
  
  const config = await chrome.runtime.sendMessage({ type: 'getConfig' });
  config.dustThreshold = dustThreshold;
  config.addressSimilarityThreshold = addressSimilarity;
  config.enableLogging = enableLogging;
  
  await chrome.runtime.sendMessage({ type: 'setConfig', config });
  showMessage('✅ Settings saved successfully!', 'success');
});

/**
 * Load whitelist items
 */
async function loadWhitelist() {
  const config = await chrome.runtime.sendMessage({ type: 'getConfig' });
  
  // Domains
  renderList('domains-list', config.legitDomains || [], 'domain');
  
  // Addresses
  renderList('addresses-list', config.knownAddresses || [], 'address');
  
  // Senders
  renderList('senders-list', config.trustedSenders || [], 'sender');
}

/**
 * Render list of items
 */
function renderList(containerId, items, type) {
  const container = document.getElementById(containerId);
  
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="empty-state">No items added</p>';
    return;
  }
  
  const html = items.map((item, idx) => `
    <div class="list-item">
      <span class="item-text">${escapeHtml(item)}</span>
      <button class="btn-remove" onclick="removeItem('${type}', ${idx})">Remove</button>
    </div>
  `).join('');
  
  container.innerHTML = html;
}

/**
 * Add new item to whitelist
 */
document.getElementById('add-domain-btn').addEventListener('click', () => {
  addItem('domain');
});

document.getElementById('add-address-btn').addEventListener('click', () => {
  addItem('address');
});

document.getElementById('add-sender-btn').addEventListener('click', () => {
  addItem('sender');
});

/**
 * Add item to list
 */
async function addItem(type) {
  const inputId = `${type}-input`;
  const input = document.getElementById(inputId);
  const value = input.value.trim();
  
  if (!value) {
    showMessage('Please enter a value', 'error');
    return;
  }
  
  // Validation
  if (type === 'domain') {
    if (!value.includes('.')) {
      showMessage('Invalid domain format', 'error');
      return;
    }
  } else if (type === 'address' || type === 'sender') {
    if (!value.match(/^0x[a-fA-F0-9]{40}$/)) {
      showMessage('Invalid Ethereum address (must be 0x...)', 'error');
      return;
    }
  }
  
  const config = await chrome.runtime.sendMessage({ type: 'getConfig' });
  
  let list;
  if (type === 'domain') {
    list = config.legitDomains;
  } else if (type === 'address') {
    list = config.knownAddresses;
  } else {
    list = config.trustedSenders;
  }
  
  if (list.includes(value)) {
    showMessage('Item already exists', 'error');
    return;
  }
  
  list.push(value);
  await chrome.runtime.sendMessage({ type: 'setConfig', config });
  
  input.value = '';
  loadWhitelist();
  showMessage('✅ Item added!', 'success');
}

/**
 * Remove item from list
 */
async function removeItem(type, index) {
  const config = await chrome.runtime.sendMessage({ type: 'getConfig' });
  
  let list;
  if (type === 'domain') {
    list = config.legitDomains;
  } else if (type === 'address') {
    list = config.knownAddresses;
  } else {
    list = config.trustedSenders;
  }
  
  list.splice(index, 1);
  await chrome.runtime.sendMessage({ type: 'setConfig', config });
  
  loadWhitelist();
  showMessage('✅ Item removed!', 'success');
}

/**
 * Show message
 */
function showMessage(text, type = 'info') {
  settingsMessage.textContent = text;
  settingsMessage.className = `settings-message message-${type}`;
  
  setTimeout(() => {
    settingsMessage.textContent = '';
    settingsMessage.className = 'settings-message';
  }, 3000);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Auto-refresh alerts every 2 seconds when on alerts tab
 */
setInterval(() => {
  if (document.querySelector('.tab-btn.active').dataset.tab === 'alerts') {
    loadAlerts();
  }
}, 2000);

// Load initial data
loadAlerts();
