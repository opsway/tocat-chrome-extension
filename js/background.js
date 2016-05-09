localStorage.selectedTask = '';
localStorage.selectedResolver = '';

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
      case 'setSelectedResolver':
        localStorage.selectedResolver = msg.selectedResolver;
        port.postMessage({
          message: 'setSelectedResolver',
          selectedResolver: localStorage.selectedResolver
        });
        break;
      case 'getSelectedResolver':
        port.postMessage({
          message: 'getSelectedResolver',
          selectedResolver: localStorage.selectedResolver
        });
        break;
      default:
        break;
    }
  });
});
