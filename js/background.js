bkg = chrome.extension.getBackgroundPage();
localStorage.tocatToken = '';

chrome.extension.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
    switch (msg.name) {
      case 'setToken':
        localStorage.tocatToken = msg.token;
        break;
      case 'getToken':
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
  // todo: check token
  if (url && changeInfo.status == 'complete') {
    TOCAT_TOOLS.updateIcon(url.split('?')[0]);
  }
});

chrome.tabs.onActivated.addListener(function() {
  // todo: check token
  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    TOCAT_TOOLS.updateIcon(tabs[0].url.split('?')[0]);
  });
});
