// OpenClaw Browser Extension v1.3.0

var CONFIG = { gatewayUrl: "http://195.35.36.249:8081", gatewayToken: "0028221d60abf79b49491972e6b7c08355dfd39b8377d372" };
var STORAGE_KEYS = { gatewayUrl: 'openclaw_gatewayUrl', gatewayToken: 'openclaw_gatewayToken' };
var isConnected = false, pollInterval = null;
var controlledTabId = null;
var recentCommands = [];
var cursorPosition = { x: 0, y: 0, visible: false };
var currentVersion = "1.3.0";
var UPDATE_CHECK_INTERVAL = 3600000;

function checkForUpdates() {
  fetch('https://api.github.com/repos/HayzDev/openclaw-browser-extension/releases/latest')
    .then(function(response) { return response.json(); })
    .then(function(data) {
      var latestVersion = data.tag_name ? data.tag_name.replace('v', '') : '1.0.0';
      if (compareVersions(latestVersion, currentVersion) > 0) {
        sendNotification('Update Available', 'v' + latestVersion + ' - Click to update');
      }
    })
    .catch(function() {});
}

function compareVersions(v1, v2) {
  var parts1 = v1.split('.').map(Number);
  var parts2 = v2.split('.').map(Number);
  for (var i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    var p1 = parts1[i] || 0;
    var p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

setTimeout(checkForUpdates, 5000);
setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);

function showOverlay(tabId, status, command) {
  chrome.tabs.get(tabId, function(tab) {
    if (chrome.runtime.lastError) return;
    if (tab && tab.url && tab.url.indexOf('chrome://') === 0) return;
    
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: function(statusText, cmd) {
        var existing = document.getElementById('openclaw-overlay');
        if (existing) existing.remove();
        
        var overlay = document.createElement('div');
        overlay.id = 'openclaw-overlay';
        overlay.innerHTML = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(17,24,39,0.92);z-index:2147483647;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">' +
          '<div style="background:linear-gradient(135deg,#1e1e2e 0%,#2d2d44 100%);border-radius:20px;padding:48px 64px;box-shadow:0 30px 60px -12px rgba(0,0,0,0.7);text-align:center;border:1px solid rgba(139,92,246,0.5);min-width:320px;">' +
          '<div style="font-size:42px;margin-bottom:12px;">🤖</div>' +
          '<div style="color:#a78bfa;font-size:16px;font-weight:700;letter-spacing:3px;margin-bottom:20px;">OPENCLAW</div>' +
          '<div style="width:60px;height:6px;background:rgba(139,92,246,0.4);border-radius:3px;margin:0 auto 24px;overflow:hidden;">' +
          '<div style="width:60%;height:100%;background:linear-gradient(90deg,#8b5cf6,#c4b5fd);border-radius:3px;animation:progress 1.2s ease-in-out infinite;"></div></div>' +
          '<div style="color:#f8fafc;font-size:22px;font-weight:600;margin-bottom:8px;">' + (statusText || 'Processing...') + '</div>' +
          '<div style="color:#94a3b8;font-size:13px;font-family:monospace;margin-top:12px;padding:8px 16px;background:rgba(139,92,246,0.1);border-radius:6px;">' + (cmd || '') + '</div></div></div>' +
          '<style>@keyframes progress{0%{transform:translateX(-100%);}50%{transform:translateX(100%);}100%{transform:translateX(-100%);}}</style>';
        document.body.appendChild(overlay);
      },
      args: [status || 'Processing...', command || '']
    }, function() {});
  });
}

function showIndicator(tabId, commands) {
  chrome.tabs.get(tabId, function(tab) {
    if (chrome.runtime.lastError) return;
    if (tab && tab.url && tab.url.indexOf('chrome://') === 0) return;
    
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: function(cmds, connected) {
        var existing = document.getElementById('openclaw-indicator');
        if (existing) existing.remove();
        
        var indicator = document.createElement('div');
        indicator.id = 'openclaw-indicator';
        var cmdHtml = cmds.map(function(c) { return '<div style="color:#22c55e;font-size:11px;padding:2px 0;">✓ ' + c + '</div>'; }).join('');
        
        indicator.innerHTML = '<div style="position:fixed;bottom:20px;right:20px;background:rgba(15,15,25,0.96);border:1px solid rgba(139,92,246,0.6);border-radius:10px;padding:12px 16px;font-family:sans-serif;z-index:2147483647;box-shadow:0 8px 32px rgba(0,0,0,0.4);min-width:140px;">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:' + (cmds.length ? '10px' : '0') + ';">' +
          '<div style="width:10px;height:10px;background:' + (connected ? '#22c55e' : '#64748b') + ';border-radius:50%;animation:' + (connected ? 'pulse 2s infinite' : 'none') + ';"></div>' +
          '<div style="color:#a78bfa;font-size:12px;font-weight:700;">OPENCLAW</div></div>' +
          cmdHtml + '</div><style>@keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.7;transform:scale(1.1);}}</style>';
        document.body.appendChild(indicator);
      },
      args: [commands.map(function(c) { return c.command; }), isConnected]
    }, function() {});
  });
}

function sendNotification(title, message) {
  try {
    chrome.notifications.create({
      type: 'basic',
      title: String(title || 'OpenClaw'),
      message: String(message || '')
    });
  } catch (e) {}
}

function loadSettings(callback) {
  chrome.storage.sync.get(Object.values(STORAGE_KEYS), function(settings) {
    if (settings[STORAGE_KEYS.gatewayUrl]) CONFIG.gatewayUrl = settings[STORAGE_KEYS.gatewayUrl];
    if (settings[STORAGE_KEYS.gatewayToken]) CONFIG.gatewayToken = settings[STORAGE_KEYS.gatewayToken];
    if (callback) callback();
  });
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  handleMessage(msg, function(response) { sendResponse(response); });
  return true;
});

function handleMessage(message, callback) {
  var type = message.type, command = message.command, params = message.params || {};
  try {
    if (type === 'getStatus') { callback({ connected: isConnected, controlledTab: controlledTabId, cursor: cursorPosition, version: currentVersion }); return; }
    if (type === 'checkUpdate') { checkForUpdates(); callback({ success: true, version: currentVersion }); return; }
    if (type === 'settingsUpdated') { stopPolling(); loadSettings(function() { startPolling(); callback({ success: true }); }); return; }
    if (type === 'command') { handleCommand(command, params, callback); return; }
    callback({ error: 'Unknown type' });
  } catch (e) { callback({ error: e.message }); }
}

function handleCommand(command, params, callback) {
  var targetTab;
  
  function proceedWithTab(target) {
    targetTab = target;
    recentCommands.push({ command: command, timestamp: Date.now() });
    if (recentCommands.length > 10) recentCommands.shift();
    
    executeCommand(command, params, targetTab, function(result) {
      if (command === 'open_tab' && result && result.tabId) {
        controlledTabId = result.tabId;
        chrome.tabs.get(controlledTabId, function(t) { targetTab = t; });
      }
      
      if (controlledTabId) {
        showOverlay(controlledTabId, getStatusMessage(command), command);
        setTimeout(function() {
          hideOverlay(controlledTabId);
          showIndicator(controlledTabId, recentCommands);
        }, 4000);
      }
      
      callback(result);
    });
  }
  
  if (params.tabId) {
    chrome.tabs.get(params.tabId, function(tab) {
      if (chrome.runtime.lastError) { callback({ error: 'Tab not found' }); return; }
      controlledTabId = params.tabId;
      proceedWithTab(tab);
    });
  } else if (command === 'open_tab') {
    proceedWithTab(null);
  } else if (command === 'activate_tab') {
    chrome.tabs.get(params.tabId, function(tab) {
      if (chrome.runtime.lastError) { callback({ error: 'Tab not found' }); return; }
      controlledTabId = params.tabId;
      proceedWithTab(tab);
    });
  } else if (controlledTabId) {
    chrome.tabs.get(controlledTabId, function(tab) {
      if (chrome.runtime.lastError) {
        controlledTabId = null;
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) { proceedWithTab(tabs[0]); });
      } else {
        proceedWithTab(tab);
      }
    });
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      targetTab = tabs[0];
      showIndicator(targetTab.id, []);
      callback({ error: 'Select a tab first', hint: true });
    });
  }
}

function getStatusMessage(command) {
  var messages = {
    'navigate': 'Navigating...', 'click': 'Clicking...', 'type': 'Typing...',
    'press_key': 'Pressing key...', 'screenshot': 'Capturing...', 'get_url': 'Getting URL...',
    'get_title': 'Getting title...', 'get_tabs': 'Listing tabs...',
    'open_tab': 'Opening tab...', 'close_tab': 'Closing tab...',
    'activate_tab': 'Switching tab...', 'extract_page': 'Extracting...',
    'extract_elements': 'Finding elements...', 'list_bookmarks': 'Listing bookmarks...',
    'go_to_bookmark': 'Opening bookmark...'
  };
  return messages[command] || 'Processing...';
}

function executeCommand(command, params, targetTab, callback) {
  switch (command) {
    case 'navigate':
      var url = params.url;
      if (url.indexOf('http') !== 0) url = 'https://' + url;
      chrome.tabs.update(targetTab.id, { url: url }, function() {
        sendNotification('Navigated', url.substring(0, 50));
        setTimeout(function() {
          extractElementsFromTab(targetTab.id, function(elResult) {
            callback({ success: true, url: url, elements: elResult.elements || [], count: elResult.count || 0 });
          });
        }, 2000);
      });
      break;
    case 'click':
      chrome.scripting.executeScript({
        target: { tabId: targetTab.id },
        func: function(id, selector, text) {
          var el = null;
          
          // Try ID first (most reliable)
          if (id) {
            el = document.getElementById(id);
          }
          
          // Try CSS selector
          if (!el && selector) {
            el = document.querySelector(selector);
          }
          
          // Try text content
          if (!el && text) {
            var allElements = document.querySelectorAll('button, a, [role="button"], [role="link"]');
            for (var i = 0; i < allElements.length; i++) {
              var t = (allElements[i].textContent || '').trim();
              if (t.toLowerCase().includes(text.toLowerCase())) {
                el = allElements[i];
                break;
              }
            }
          }
          
          if (!el) {
            return { error: 'Element not found' };
          }
          
          var rect = el.getBoundingClientRect();
          var centerX = rect.left + rect.width / 2 - 12;
          var centerY = rect.top + rect.height / 2 - 12;
          
          var cursor = document.getElementById('openclaw-cursor');
          if (cursor) cursor.remove();
          
          cursor = document.createElement('div');
          cursor.id = 'openclaw-cursor';
          cursor.style.cssText = 'position:fixed;width:28px;height:28px;pointer-events:none;z-index:2147483646;transition:all 0.25s cubic-bezier(0.4,0,0.2,1);left:' + centerX + 'px;top:' + centerY + 'px;';
          cursor.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 3.21V20.79C5.5 21.4 5.9 21.9 6.5 22H10C10.55 22 11 21.55 11 21V12C11 11.45 11.45 11 12 11H13.5L8.5 6C8.1 5.6 8.1 5 8.5 4.5L13.5 0.5C14 0.1 14.5 0.5 14.5 1L18 4.5C18.5 5 18.5 5.6 18.1 6L10.5 13.5C10.45 13.55 10.45 13.55 10.45 13.55C10.45 13.95 10.05 14.05 9.65 13.65L5 9C4.45 8.55 4.45 7.95 5 7.5L5.5 3.21Z" fill="#a78bfa" stroke="#a78bfa" stroke-width="2"/></svg>';
          document.body.appendChild(cursor);
          
          setTimeout(function() {
            var c = document.getElementById('openclaw-cursor');
            if (c) c.style.transform = 'scale(1.3)';
          }, 50);
          
          setTimeout(function() {
            var c = document.getElementById('openclaw-cursor');
            if (c) c.style.transform = 'scale(1)';
          }, 200);
          
          el.click();
          return { success: true, x: centerX, y: centerY, text: (el.textContent || '').trim().substring(0, 30), id: el.id };
        },
        args: [params.id || null, params.selector || null, params.text || null]
      }, function(results) {
        var r = results && results[0] ? results[0].result : null;
        if (r && r.success) {
          cursorPosition = { x: r.x, y: r.y, visible: true };
          var desc = r.id ? '#' + r.id : (params.text || params.selector || '');
          sendNotification('Clicked', desc);
        }
        callback(r || { error: 'Script failed' });
      });
      break;
    case 'type':
      chrome.scripting.executeScript({
        target: { tabId: targetTab.id },
        func: function(sel, txt, submit) {
          var el = document.querySelector(sel);
          if (!el) return { error: 'Not found' };
          el.value = txt;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          
          var rect = el.getBoundingClientRect();
          var centerX = rect.left + rect.width / 2 - 12;
          var centerY = rect.top + rect.height / 2 - 12;
          
          if (submit) {
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
            el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
          }
          
          return { success: true, x: centerX, y: centerY, submitted: submit };
        },
        args: [params.selector, params.text, params.submit || false]
      }, function(results) {
        var tr = results && results[0] ? results[0].result : null;
        if (tr && tr.success) {
          cursorPosition = { x: tr.x, y: tr.y, visible: true };
          sendNotification(tr.submitted ? 'Typed & submitted!' : 'Typed', params.text.substring(0, 30) + '...');
        }
        callback(tr || { error: 'Script failed' });
      });
      break;
    case 'press_key':
      chrome.scripting.executeScript({
        target: { tabId: targetTab.id },
        func: function(keyName, keyCode) {
          var eventOptions = { key: keyName, keyCode: keyCode, bubbles: true };
          document.dispatchEvent(new KeyboardEvent('keydown', eventOptions));
          document.dispatchEvent(new KeyboardEvent('keypress', eventOptions));
          document.dispatchEvent(new KeyboardEvent('keyup', eventOptions));
          return { success: true, key: keyName, keyCode: keyCode };
        },
        args: [params.key || 'Enter', params.keyCode || 13]
      }, function(results) {
        var kr = results && results[0] ? results[0].result : null;
        if (kr && kr.success) sendNotification('Key Pressed', params.key || 'Enter');
        callback(kr || { error: 'Script failed' });
      });
      break;
    case 'screenshot':
      chrome.tabs.captureVisibleTab(targetTab.windowId, { format: "png" }, function(image) {
        sendNotification('Screenshot', 'Captured!');
        callback({ success: true, image: image });
      });
      break;
    case 'get_url': callback({ url: targetTab.url }); break;
    case 'get_title': callback({ title: targetTab.title }); break;
    case 'get_tabs':
      chrome.tabs.query({ currentWindow: true }, function(tabs) {
        callback({ tabs: tabs.map(function(t) { return { id: t.id, url: t.url, title: t.title ? t.title.substring(0, 50) : '', active: t.active }; }) });
      });
      break;
    case 'extract_elements':
      extractElementsFromTab(targetTab.id, function(result) {
        callback(result);
      });
      break;
    case 'list_bookmarks':
      chrome.bookmarks.getTree(function(bookmarkTreeNodes) {
        var allBookmarks = [];
        function extractBookmarks(nodes) {
          for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.url) {
              allBookmarks.push({ id: node.id, title: node.title, url: node.url, parentId: node.parentId });
            }
            if (node.children) extractBookmarks(node.children);
          }
        }
        extractBookmarks(bookmarkTreeNodes);
        var displayBookmarks = allBookmarks.slice(0, 100).map(function(b, idx) {
          return { index: idx + 1, id: b.id, title: b.title || 'Untitled', url: b.url.substring(0, 80) + (b.url.length > 80 ? '...' : '') };
        });
        sendNotification('Bookmarks', allBookmarks.length + ' bookmarks found');
        callback({ success: true, bookmarks: displayBookmarks, total: allBookmarks.length });
      });
      break;
    case 'go_to_bookmark':
      var mode = params.mode || 'foreground';
      function openUrl(url, activate) {
        if (mode === 'current') {
          chrome.tabs.update(targetTab.id, { url: url }, function() {
            sendNotification('Bookmark', 'Opened in current tab');
            callback({ success: true, tabId: targetTab.id, url: url, mode: 'current' });
          });
        } else {
          var newActive = (mode === 'foreground');
          chrome.tabs.create({ url: url, active: newActive }, function(newTab) {
            controlledTabId = newTab.id;
            sendNotification('Bookmark', 'Opened in ' + (newActive ? 'foreground' : 'background') + ' tab');
            callback({ success: true, tabId: newTab.id, url: url, mode: mode });
          });
        }
      }
      if (params.id) {
        chrome.bookmarks.get(params.id, function(bookmarkNodes) {
          if (bookmarkNodes && bookmarkNodes[0] && bookmarkNodes[0].url) {
            openUrl(bookmarkNodes[0].url, params.active);
          } else { callback({ error: 'Bookmark not found' }); }
        });
      } else if (params.url) {
        openUrl(params.url, params.active);
      } else { callback({ error: 'Missing bookmark id or url' }); }
      break;
    case 'open_tab':
      var navUrl = params.url;
      if (navUrl.indexOf('http') !== 0) navUrl = 'https://' + navUrl;
      var isActive = params.active !== false;
      chrome.tabs.create({ url: navUrl, active: isActive, index: 9999 }, function(newTab) {
        controlledTabId = newTab.id;
        sendNotification('New Tab', navUrl.substring(0, 50));
        setTimeout(function() {
          extractElementsFromTab(newTab.id, function(result) {
            result.tabId = newTab.id;
            callback(result);
          });
        }, 2000);
      });
      break;
    case 'close_tab':
      chrome.tabs.remove(params.tabId, function() {
        if (controlledTabId === params.tabId) controlledTabId = null;
        sendNotification('Tab Closed', 'Tab ' + params.tabId);
        callback({ success: true, tabId: params.tabId });
      });
      break;
    case 'activate_tab':
      chrome.tabs.get(params.tabId, function(actTab) {
        chrome.tabs.update(params.tabId, { active: true }, function() {
          chrome.windows.update(actTab.windowId, { focused: true }, function() {
            controlledTabId = params.tabId;
            sendNotification('Switched Tab', actTab.title ? actTab.title.substring(0, 50) : 'Tab ' + params.tabId);
            showIndicator(params.tabId, []);
            callback({ success: true, tabId: actTab.id, url: actTab.url, title: actTab.title });
          });
        });
      });
      break;
    case 'extract_page':
      chrome.scripting.executeScript({
        target: { tabId: targetTab.id },
        func: function() {
          return {
            title: document.title,
            url: window.location.href,
            headings: Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 10).map(function(h) { return { level: h.tagName, text: h.textContent.trim() }; }),
            links: Array.from(document.querySelectorAll('a[href]')).slice(0, 30).map(function(a) { return { text: a.textContent.trim().substring(0, 100), href: a.href }; }),
            text: document.body.innerText.substring(0, 5000)
          };
        }
      }, function(results) {
        callback((results && results[0] ? results[0].result : null) || { error: 'Script failed' });
      });
      break;
    default: callback({ error: 'Unknown command' });
  }
}

function extractElementsFromTab(tabId, callback) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: function() {
      var elements = [];
      var seen = new Set();
      
      // Helper to get aria properties
      function getAriaProps(el) {
        var aria = {};
        if (el.getAttribute('aria-label')) aria.label = el.getAttribute('aria-label');
        if (el.getAttribute('aria-expanded')) aria.expanded = el.getAttribute('aria-expanded');
        if (el.getAttribute('aria-hidden')) aria.hidden = el.getAttribute('aria-hidden');
        if (el.getAttribute('aria-pressed')) aria.pressed = el.getAttribute('aria-pressed');
        if (el.getAttribute('aria-disabled')) aria.disabled = el.getAttribute('aria-disabled');
        if (el.getAttribute('aria-describedby')) aria.describedBy = el.getAttribute('aria-describedby');
        if (el.getAttribute('aria-haspopup')) aria.hasPopup = el.getAttribute('aria-haspopup');
        if (el.getAttribute('aria-current')) aria.current = el.getAttribute('aria-current');
        if (el.getAttribute('role')) aria.role = el.getAttribute('role');
        return Object.keys(aria).length > 0 ? aria : null;
      }
      
      // Find inputs with full details
      var inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea, select');
      for (var i = 0; i < inputs.length; i++) {
        var el = inputs[i];
        var rect = el.getBoundingClientRect();
        if (rect.width > 5 && rect.height > 5) {
          var key = el.tagName + (el.id || el.name || el.placeholder || '');
          if (!seen.has(key)) {
            seen.add(key);
            var selector = el.id ? '#' + el.id : (el.name ? '[name="' + el.name + '"]' : null);
            elements.push({
              type: 'input',
              tag: el.tagName.toLowerCase(),
              id: el.id || null,
              name: el.name || null,
              placeholder: el.placeholder || null,
              type_attr: el.type || null,
              value: el.value || null,
              className: el.className ? el.className.split(' ').slice(0, 3).join(' ') : null,
              selector: selector,
              clickSelector: el.id ? '#' + el.id : selector,
              aria: getAriaProps(el),
              visible: rect.width > 0 && rect.height > 0
            });
          }
        }
      }
      
      // Find buttons and links with full details
      var buttons = document.querySelectorAll('button, a[href], [role="button"]');
      for (var j = 0; j < buttons.length; j++) {
        var btn = buttons[j];
        var r = btn.getBoundingClientRect();
        if (r.width > 5 && r.height > 5) {
          var text = (btn.textContent || '').trim().substring(0, 50);
          if (text) {
            var btnKey = btn.tagName + text + (btn.id || '');
            if (!seen.has(btnKey)) {
              seen.add(btnKey);
              var btnSelector = btn.id ? '#' + btn.id : null;
              elements.push({
                type: btn.tagName.toLowerCase() === 'a' ? 'link' : 'button',
                tag: btn.tagName.toLowerCase(),
                id: btn.id || null,
                href: btn.href || null,
                text: text,
                className: btn.className ? btn.className.split(' ').slice(0, 3).join(' ') : null,
                selector: btnSelector,
                clickSelector: btn.id ? '#' + btn.id : '[text*="' + text + '"]',
                aria: getAriaProps(btn),
                visible: r.width > 0 && r.height > 0
              });
            }
          }
        }
      }
      
      return { elements: elements.slice(0, 50) };
    }
  }, function(results) {
    var r = results && results[0] ? results[0].result : null;
    if (r && r.elements) {
      sendNotification('Elements Found', r.elements.length + ' interactable elements');
      callback({ success: true, elements: r.elements, count: r.elements.length });
    } else {
      callback({ error: 'Failed to extract elements' });
    }
  });
}

function hideOverlay(tabId) {
  chrome.tabs.get(tabId, function() {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: function() {
        var overlay = document.getElementById('openclaw-overlay');
        if (overlay) overlay.remove();
      }
    }, function() {});
  });
}

function poll() {
  if (!CONFIG.gatewayUrl || !CONFIG.gatewayToken) return;
  
  fetch(CONFIG.gatewayUrl + '/poll?clientId=extension', { method: 'GET', headers: { 'Authorization': CONFIG.gatewayToken } })
    .then(function(response) { if (!response.ok) return; return response.json(); })
    .then(function(data) {
      if (!data) return;
      if (data.id) {
        isConnected = true;
        updateBadge("🟢", "Active");
        handleCommand(data.command, data.params || {}, function(result) {
          sendNotification('Done', data.command + ' completed');
          fetch(CONFIG.gatewayUrl + '/result', { method: 'POST', headers: { 'Authorization': CONFIG.gatewayToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ commandId: data.id, result: result }) });
        });
      } else {
        isConnected = true;
        updateBadge("🟢", "Connected");
        if (controlledTabId) showIndicator(controlledTabId, recentCommands);
      }
    })
    .catch(function() { isConnected = false; updateBadge("🔴", "Disconnected"); });
}

function startPolling() { if (pollInterval) return; poll(); pollInterval = setInterval(poll, 2000); }
function stopPolling() { if (pollInterval) { clearInterval(pollInterval); pollInterval = null; } }
function updateBadge(text, color) { chrome.action.setBadgeText({ text: text }); chrome.action.setBadgeBackgroundColor({ color: color === "Connected" ? "#22c55e" : "#ef4444" }); }

chrome.storage.onChanged.addListener(function(changes) {
  if (changes[STORAGE_KEYS.gatewayUrl]) { CONFIG.gatewayUrl = changes[STORAGE_KEYS.gatewayUrl].newValue; stopPolling(); startPolling(); }
  if (changes[STORAGE_KEYS.gatewayToken]) CONFIG.gatewayToken = changes[STORAGE_KEYS.gatewayToken].newValue;
});

loadSettings(function() { startPolling(); });
