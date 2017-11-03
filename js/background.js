var isAuth = false;

bkg = chrome.extension.getBackgroundPage();
localStorage.tocatToken = '';
localStorage.tokenUpdatedAt = '';
localStorage.storedDomains = '{}';

/**
 *
 * @returns {boolean}
 */
function isTokenExpired() {
  var timeToLive = 7 * 24 * 60 * 60 * 1000; // 7 days

  if (localStorage.tokenUpdatedAt && localStorage.tokenUpdatedAt !== '') {
    return Date.now() - parseInt(localStorage.tokenUpdatedAt, 10) >= timeToLive;
  }

  return true;
}

function sendDataToContent() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {isAuth: isAuth, token: localStorage.tocatToken});
  });
}

chrome.extension.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
    switch (msg.name) {
      case 'setToken':
        localStorage.tocatToken = msg.token;
        localStorage.tokenUpdatedAt = Date.now();
        break;
      case 'initAuth':
        initAuth(msg.url);
        break;
      case 'logout':
        isAuth = false;
        localStorage.tocatToken = '';
        sendDataToContent();
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
  var url = tab.url,
    domain,
    protocol,
    full;

  domain = TOCAT_TOOLS.getDomainFromUrl(url);
  protocol = TOCAT_TOOLS.getProtocolFromUrl(url);
  full = protocol + '://' + domain;

  console.log('onUpdated');
  console.log('changeInfo: ', changeInfo);

  sendDataToContent();

  if (domain && changeInfo.status == 'complete') {
    if (localStorage.tocatToken && TOCAT_TOOLS.isDomainStored(full)) {
      TOCAT_TOOLS.updateIcon(url);
    } else {
      chrome.browserAction.setBadgeText({text: ''});
    }
  }
});

chrome.tabs.onActivated.addListener(function() {
  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    var url = tabs[0].url,
      domain,
      protocol,
      full;

    domain = TOCAT_TOOLS.getDomainFromUrl(url);
    protocol = TOCAT_TOOLS.getProtocolFromUrl(url);
    full = protocol + '://' + domain;

    sendDataToContent();

    if (localStorage.tocatToken && TOCAT_TOOLS.isDomainStored(full)) {
      TOCAT_TOOLS.updateIcon(url);
    } else {
      chrome.browserAction.setBadgeText({text: ''});
    }
  });
});

// Get auth token using chrome.tabs

function initAuth(url) {
  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    var initialTab = tabs[0];

    chrome.tabs.create({'url': url}, function(authenticationTab) {
      chrome.tabs.onUpdated.addListener(function googleAuthorizationHook(tabId, changeInfo, tab) {
        if (tabId === authenticationTab.id) {
          var urlParts = tab.url.split('#authToken='),
            result = urlParts[1];

          if (tab.status === 'complete' && urlParts.length === 2) {
            if (localStorage.tocatToken && isTokenExpired()) {
              localStorage.tocatToken = '';
              localStorage.tokenUpdatedAt = '';
            } else {
              localStorage.tocatToken = result;
              localStorage.tokenUpdatedAt = Date.now();
              isAuth = true;

              chrome.storage.sync.set({token: localStorage.tocatToken, isAuth: isAuth}, function() {
                sendDataToContent();
              });

              chrome.tabs.onUpdated.removeListener(googleAuthorizationHook);
              chrome.tabs.remove(tabId, function () {
                chrome.tabs.update(initialTab.id, {active: true});
              });
            }
          }
        }
      });
    });
  });
}
