bkg = chrome.extension.getBackgroundPage();
localStorage.tocatToken = '';
localStorage.tokenUpdatedAt = '';

/**
 *
 * @returns {boolean}
 */
function isTokenExpired() {
  return Date.now() - parseInt(localStorage.tokenUpdatedAt, 10) >= 7 * 24 * 60 * 60 * 1000;
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
  var url = tab.url;
  if (url && changeInfo.status == 'complete') {
    TOCAT_TOOLS.updateIcon(url.split('#')[0]);
  }
});

chrome.tabs.onActivated.addListener(function() {
  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    TOCAT_TOOLS.updateIcon(tabs[0].url.split('#')[0]);
  });
});
