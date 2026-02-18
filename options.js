// Options Page JavaScript - HTTP Long Polling Version

const STORAGE_KEYS = {
  gatewayUrl: 'openclaw_gatewayUrl',
  gatewayToken: 'openclaw_gatewayToken'
};

const gatewayUrlInput = document.getElementById('gatewayUrl');
const gatewayTokenInput = document.getElementById('gatewayToken');
const testBtn = document.getElementById('testBtn');
const testResultEl = document.getElementById('testResult');

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
    
    if (settings[STORAGE_KEYS.gatewayUrl]) {
      gatewayUrlInput.value = settings[STORAGE_KEYS.gatewayUrl];
    }
    
    if (settings[STORAGE_KEYS.gatewayToken]) {
      gatewayTokenInput.value = settings[STORAGE_KEYS.gatewayToken];
    }
    
    if (settings[STORAGE_KEYS.gatewayUrl] && settings[STORAGE_KEYS.gatewayToken]) {
      chrome.runtime.sendMessage({
        type: "settingsUpdated",
        gatewayUrl: settings[STORAGE_KEYS.gatewayUrl],
        gatewayToken: settings[STORAGE_KEYS.gatewayToken]
      });
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
}

async function saveSettings() {
  const url = gatewayUrlInput.value.trim();
  const token = gatewayTokenInput.value.trim();
  
  await chrome.storage.sync.set({
    [STORAGE_KEYS.gatewayUrl]: url,
    [STORAGE_KEYS.gatewayToken]: token
  });
  
  return { url, token };
}

async function testConnection(url, token) {
  try {
    const response = await fetch(`${url}/status`, {
      method: 'GET',
      headers: { 'Authorization': token }
    });
    
    if (response.ok) {
      return { success: true, message: "Server reachable!" };
    }
    return { success: false, message: "Server responded but not authorized" };
  } catch (e) {
    return { success: false, message: "Connection failed. Check URL and token." };
  }
}

async function saveAndTest() {
  testResultEl.innerHTML = "Testing...";
  testResultEl.className = "test-result";
  
  const { url, token } = await saveSettings();
  
  if (!url || !token) {
    testResultEl.innerHTML = "Please fill in both fields";
    testResultEl.className = "test-result error";
    return;
  }
  
  const test = await testConnection(url, token);
  
  testResultEl.innerHTML = test.message;
  testResultEl.className = "test-result " + (test.success ? "success" : "error");
  
  if (test.success) {
    chrome.runtime.sendMessage({
      type: "settingsUpdated",
      gatewayUrl: url,
      gatewayToken: token
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  testBtn.addEventListener('click', saveAndTest);
  
  gatewayUrlInput.addEventListener('change', saveSettings);
  gatewayTokenInput.addEventListener('change', saveSettings);
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  loadSettings();
}
