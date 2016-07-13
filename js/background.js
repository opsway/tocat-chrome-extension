bkg = chrome.extension.getBackgroundPage();
localStorage.tocatToken = '';
localStorage.tokenUpdatedAt = '';
localStorage.storedDomains = '{}';

/**
 *
 * @returns {boolean}
 */
function isTokenExpired() {
  return Date.now() - parseInt(localStorage.tokenUpdatedAt, 10) >= 7 * 24 * 60 * 60 * 1000; // 7 days
}

/**
 * Save domain in localStorage
 * @param domain
 * @returns {boolean}
 */
function saveDomain(domain) {
  if (domain) {
    var storedDomain = JSON.parse(localStorage.storedDomains);
    storedDomain[domain] = domain;
    localStorage.storedDomains = JSON.stringify(storedDomain);
    return true;
  }
  return false;
}

/**
 * Check if domain is stored
 * @param domain
 * @returns {boolean}
 */
function isDomainStored(domain) {
  var storedDomain = JSON.parse(localStorage.storedDomains);
  return storedDomain[domain] ? true : false;
}

chrome.extension.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
    switch (msg.name) {
      case 'setToken':
        localStorage.tocatToken = msg.token;
        localStorage.tokenUpdatedAt = Date.now();
        break;
      case 'getToken':
        if (isTokenExpired()) {
          localStorage.tokenUpdatedAt = '';
          localStorage.tocatToken = '';
        }
        port.postMessage({
          name: 'getToken',
          token: localStorage.tocatToken
        });
      default:
        break;
    }
  });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status == 'complete') {
    chrome.browserAction.setBadgeText({text: ''});
  }
});

chrome.tabs.onActivated.addListener(function() {
  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    chrome.browserAction.setBadgeText({text: ''});
  });
});
