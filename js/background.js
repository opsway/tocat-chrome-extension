bkg = chrome.extension.getBackgroundPage();
localStorage.tocatToken = '';
localStorage.tokenUpdatedAt = '';
localStorage.dateOfLastVisit = '';

/**
 *
 * @returns {boolean}
 */
function isTokenExpired() {
  return Date.now() - parseInt(localStorage.tokenUpdatedAt, 10) >= 7 * 24 * 60 * 60 * 1000; // 7 days
}

function isExpiredBadgeDate() {
  return Date.now() - parseInt(localStorage.dateOfLastVisit, 10) >= 0.5 * 60 * 60 * 1000; // 0.5 hour
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
      case 'setDateLastVisit':
        console.log(msg);
        localStorage.dateOfLastVisit = msg.dateOfLastVisit;
        break;
      default:
        break;
    }
  });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  var url = tab.url;
  if (url && changeInfo.status == 'complete') {
    if (localStorage.tocatToken && !isExpiredBadgeDate()) {
      TOCAT_TOOLS.updateIcon(url);
    } else {
      chrome.browserAction.setBadgeText({text: ''});
    }
  }
});

chrome.tabs.onActivated.addListener(function() {
  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    if (localStorage.tocatToken && !isExpiredBadgeDate()) {
      TOCAT_TOOLS.updateIcon(tabs[0].url);
    } else {
      chrome.browserAction.setBadgeText({text: ''});
    }
  });
});
