bkg = chrome.extension.getBackgroundPage();

chrome.extension.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {

  });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  var url = tab.url;
  if (url && changeInfo.status == 'complete') {
    TOCAT_TOOLS.updateIcon(url.split('?')[0]);
  }
});

chrome.tabs.onActivated.addListener(function() {
  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    TOCAT_TOOLS.updateIcon(tabs[0].url.split('?')[0]);
  });
});
