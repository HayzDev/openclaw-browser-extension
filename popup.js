// Popup JavaScript v2.0 - Agentic Browser Control

// Get DOM elements
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');

// Tab elements
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Navigation
const navUrl = document.getElementById('navUrl');
const navBtn = document.getElementById('navBtn');
const clickSelector = document.getElementById('clickSelector');
const clickBtn = document.getElementById('clickBtn');
const typeSelector = document.getElementById('typeSelector');
const typeText = document.getElementById('typeText');
const typeBtn = document.getElementById('typeBtn');

// Semantic
const semanticClickDesc = document.getElementById('semanticClickDesc');
const semanticClickBtn = document.getElementById('semanticClickBtn');
const semanticTypeDesc = document.getElementById('semanticTypeDesc');
const semanticTypeText = document.getElementById('semanticTypeText');
const semanticTypeBtn = document.getElementById('semanticTypeBtn');
const visionScreenshotBtn = document.getElementById('visionScreenshotBtn');

// Extract
const extractPageBtn = document.getElementById('extractPageBtn');
const extractReadableBtn = document.getElementById('extractReadableBtn');
const extractSemanticBtn = document.getElementById('extractSemanticBtn');
const extractMarkdownBtn = document.getElementById('extractMarkdownBtn');

// Memory
const memoryNotes = document.getElementById('memoryNotes');
const memoryTags = document.getElementById('memoryTags');
const rememberPageBtn = document.getElementById('rememberPageBtn');
const memorySearchQuery = document.getElementById('memorySearchQuery');
const memorySearchBtn = document.getElementById('memorySearchBtn');
const recentMemoriesBtn = document.getElementById('recentMemoriesBtn');

// Quick actions
const screenshotBtn = document.getElementById('screenshotBtn');
const getUrlBtn = document.getElementById('getUrlBtn');
const getTitleBtn = document.getElementById('getTitleBtn');
const scrollBtn = document.getElementById('scrollBtn');
const openTabBtn = document.getElementById('openTabBtn');

// Settings
const settingsBtn = document.getElementById('settingsBtn');

// === Tab Switching ===
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// === Utility Functions ===

function updateStatus(response) {
  if (!response) {
    statusEl.textContent = "Extension loading...";
    statusEl.className = "status disconnected";
    return;
  }
  
  statusEl.textContent = response.connected ? "🟢 Connected" : "🔴 Disconnected";
  statusEl.className = "status " + (response.connected ? "connected" : "disconnected");
}

function showResult(data, isError = false) {
  resultEl.classList.add('show');
  resultEl.className = "result " + (isError ? 'error' : 'success');
  
  if (typeof data === 'object') {
    // Truncate long outputs
    const str = JSON.stringify(data, null, 2);
    resultEl.textContent = str.length > 2000 
      ? str.substring(0, 2000) + '\n... (truncated)'
      : str;
  } else {
    resultEl.textContent = data;
  }
}

function clearResult() {
  resultEl.classList.remove('show');
}

function sendCommand(command, params = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: "command",
      command,
      params
    }, (response) => {
      resolve(response?.result || response);
    });
  });
}

function handleEnterKey(event, action) {
  if (event.key === 'Enter') {
    action();
  }
}

// === Navigate Tab ===

function navigate() {
  const url = navUrl.value.trim();
  if (!url) return;
  
  sendCommand('navigate', { url }).then(result => {
    showResult(result);
  });
}

function clickElement() {
  const selector = clickSelector.value.trim();
  if (!selector) return;
  
  sendCommand('click', { selector }).then(result => {
    showResult(result);
  });
}

function typeTextFn() {
  const selector = typeSelector.value.trim();
  const text = typeText.value;
  if (!selector) return;
  
  sendCommand('type', { selector, text }).then(result => {
    showResult(result);
  });
}

function doScreenshot() {
  clearResult();
  sendCommand('screenshot').then(result => {
    if (result?.image) {
      const blob = dataURLtoBlob(result.image);
      const url = URL.createObjectURL(blob);
      chrome.tabs.create({ url });
    } else {
      showResult('No image captured');
    }
  });
}

function getUrlFn() {
  sendCommand('get_url').then(result => {
    showResult(result);
  });
}

function getTitleFn() {
  sendCommand('get_title').then(result => {
    showResult(result);
  });
}

function scrollDown() {
  sendCommand('scroll', { x: 0, y: 500 }).then(result => {
    showResult('Scrolled down');
  });
}

function openNewTab() {
  const url = navUrl.value.trim() || 'https://google.com';
  sendCommand('open_tab', { url }).then(result => {
    showResult(result);
  });
}

// === Semantic Tab (NEW) ===

function semanticClick() {
  const desc = semanticClickDesc.value.trim();
  if (!desc) return;
  
  sendCommand('semantic_click', { description: desc }).then(result => {
    showResult(result);
  });
}

function semanticType() {
  const desc = semanticTypeDesc.value.trim();
  const text = semanticTypeText.value;
  if (!desc) return;
  
  sendCommand('semantic_type', { description: desc, text }).then(result => {
    showResult(result);
  });
}

function visionScreenshot() {
  clearResult();
  showResult('Capturing with vision context...');
  
  sendCommand('screenshot_vision').then(result => {
    if (result?.success) {
      showResult({
        message: 'Vision screenshot captured',
        hasImage: !!result.image,
        hasContext: !!result.context,
        visionPrompt: result.visionPrompt
      });
    } else {
      showResult(result);
    }
  });
}

// === Extract Tab (Manus-style) ===

function extractPage() {
  clearResult();
  showResult('Extracting page with semantic structure...');
  
  sendCommand('extract_page').then(result => {
    if (result?.success) {
      showResult({
        title: result.data?.title,
        tokenEstimate: result.data?.tokenEstimate,
        hasForms: (result.data?.semantic?.forms?.length || 0) > 0,
        hasActions: (result.data?.semantic?.actions?.length || 0) > 0,
        contentPreview: result.data?.content?.substring(0, 300) + '...'
      });
    } else {
      showResult(result);
    }
  });
}

function extractReadable() {
  sendCommand('extract_readable').then(result => {
    if (result?.success) {
      showResult({
        title: result.data?.title,
        excerpt: result.data?.excerpt,
        textPreview: result.data?.textContent?.substring(0, 500) + '...'
      });
    } else {
      showResult(result);
    }
  });
}

function extractSemantic() {
  sendCommand('extract_semantic').then(result => {
    if (result?.success) {
      showResult({
        formCount: result.data?.forms?.length || 0,
        navCount: result.data?.navigation?.length || 0,
        actionCount: result.data?.actions?.length || 0,
        tableCount: result.data?.tables?.length || 0,
        forms: result.data?.forms,
        actions: result.data?.actions?.slice(0, 5)
      });
    } else {
      showResult(result);
    }
  });
}

function extractMarkdown() {
  sendCommand('extract_markdown').then(result => {
    if (result?.success) {
      showResult({
        fullLength: result.fullLength,
        truncatedLength: result.truncatedLength,
        content: result.content?.substring(0, 500) + '...'
      });
    } else {
      showResult(result);
    }
  });
}

// === Memory Tab (NEW) ===

function rememberPage() {
  const notes = memoryNotes.value.trim();
  const tags = memoryTags.value.split(',').map(t => t.trim()).filter(t => t);
  
  sendCommand('remember_page', { notes, tags }).then(result => {
    showResult(result);
  });
}

function searchMemory() {
  const query = memorySearchQuery.value.trim();
  if (!query) return;
  
  sendCommand('search_memory', { query, limit: 5 }).then(result => {
    if (result?.success) {
      showResult({
        resultCount: result.results?.length || 0,
        memories: result.results?.map(m => ({
          title: m.title,
          url: m.url,
          similarity: m.similarity?.toFixed(2)
        }))
      });
    } else {
      showResult(result);
    }
  });
}

function recentMemories() {
  sendCommand('recent_memories', { limit: 10 }).then(result => {
    if (result?.success) {
      showResult({
        count: result.memories?.length || 0,
        memories: result.memories?.map(m => ({
          title: m.title,
          url: m.url?.substring(0, 50),
          timestamp: m.timestamp
        }))
      });
    } else {
      showResult(result);
    }
  });
}

// === Event Listeners ===

// Navigate
navBtn.addEventListener('click', navigate);
navUrl.addEventListener('keypress', (e) => handleEnterKey(e, navigate));

clickBtn.addEventListener('click', clickElement);
clickSelector.addEventListener('keypress', (e) => handleEnterKey(e, clickElement));

typeBtn.addEventListener('click', typeTextFn);
typeText.addEventListener('keypress', (e) => handleEnterKey(e, typeTextFn));

// Semantic
semanticClickBtn.addEventListener('click', semanticClick);
semanticClickDesc.addEventListener('keypress', (e) => handleEnterKey(e, semanticClick));

semanticTypeBtn.addEventListener('click', semanticType);
semanticTypeText.addEventListener('keypress', (e) => handleEnterKey(e, semanticType));

visionScreenshotBtn.addEventListener('click', visionScreenshot);

// Extract
extractPageBtn.addEventListener('click', extractPage);
extractReadableBtn.addEventListener('click', extractReadable);
extractSemanticBtn.addEventListener('click', extractSemantic);
extractMarkdownBtn.addEventListener('click', extractMarkdown);

// Memory
rememberPageBtn.addEventListener('click', rememberPage);
memorySearchBtn.addEventListener('click', searchMemory);
memorySearchQuery.addEventListener('keypress', (e) => handleEnterKey(e, searchMemory));
recentMemoriesBtn.addEventListener('click', recentMemories);

// Quick actions
screenshotBtn.addEventListener('click', doScreenshot);
getUrlBtn.addEventListener('click', getUrlFn);
getTitleBtn.addEventListener('click', getTitleFn);
scrollBtn.addEventListener('click', scrollDown);
openTabBtn.addEventListener('click', openNewTab);

// Settings
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage ? chrome.runtime.openOptionsPage() : alert("Settings page not configured");
});

// === Utility ===

function dataURLtoBlob(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// === Message Listeners ===

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "statusUpdate") {
    updateStatus(message);
  }
});

// Initial status check
chrome.runtime.sendMessage({ type: "getStatus" }, (response) => {
  updateStatus(response);
});
