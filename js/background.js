bkg = chrome.extension.getBackgroundPage();

localStorage.selectedTask = '';
localStorage.selectedOrder = '';

chrome.extension.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
    switch (msg.message) {
      case 'getSelectedTask':
        port.postMessage({
          message: 'getSelectedTask',
          selectedTask: localStorage.selectedTask
        });
        break;
      case 'setSelectedTask':
        localStorage.selectedTask = msg.selectedTask;
        port.postMessage({
          message: 'setSelectedTask',
          selectedTask: localStorage.selectedTask
        });
        break;
      case 'setSelectedOrder':
        localStorage.selectedOrder = msg.selectedOrder;
        port.postMessage({
          message: 'setSelectedOrder',
          selectedOrder: localStorage.selectedOrder
        });
        break;
      case 'getSelectedOrder':
        port.postMessage({
          message: 'getSelectedOrder',
          selectedOrder: localStorage.selectedOrder
        });
        break;
      default:
        break;
    }
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
