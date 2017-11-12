var isAuth = false,
  authUrl = '';

bkg = chrome.extension.getBackgroundPage();
localStorage.tocatToken = '';
localStorage.tokenUpdatedAt = '';
localStorage.storedDomains = '{}';

function sendDataToContent(tabId) {
  var data = {
    isAuth: isAuth,
    token: localStorage.tocatToken,
    tokenUpdatedAt: localStorage.tokenUpdatedAt
  };

  if (tabId) {
    chrome.tabs.sendMessage(tabId, data);
  } else {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, data);
    });
  }
}

// Get auth token using chrome.tabs

function initAuth(url) {
  chrome.tabs.query({active: true, lastFocusedWindow: true}, function (tabs) {
    var initialTab = tabs[0];

    chrome.tabs.create({url: url}, function(authenticationTab) {
      chrome.tabs.onUpdated.addListener(function googleAuthorizationHook(tabId, changeInfo, tab) {
        if (tabId === authenticationTab.id) {
          var urlParts = tab.url.split('#authToken='),
            result = urlParts[1];

          if (tab.status === 'complete' && urlParts.length === 2) {
            chrome.tabs.onUpdated.removeListener(googleAuthorizationHook);
            TOCAT_TOOLS.setTokenHeader(result);
            localStorage.tocatToken = result;
            localStorage.tokenUpdatedAt = Date.now();
            isAuth = true;

            chrome.tabs.update(initialTab.id, {active: true}, function () {
              chrome.storage.sync.set({token: localStorage.tocatToken, tokenUpdatedAt: localStorage.tokenUpdatedAt, isAuth: isAuth}, function() {
                sendDataToContent(initialTab.id);
              });

              chrome.tabs.remove(tabId);
            });
          }
        }
      });
    });
  });
}

function logout() {
  isAuth = false;

  chrome.storage.sync.set({token: localStorage.tocatToken, tokenUpdatedAt: localStorage.tokenUpdatedAt, isAuth: isAuth}, function() {
    sendDataToContent();
  });
}

/**
 * Long term connection port
 */

chrome.extension.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
    switch (msg.name) {
      case 'setToken':
        localStorage.tocatToken = msg.token;
        localStorage.tokenUpdatedAt = Date.now();
        break;
      case 'initAuth':
        authUrl = msg.url;

        initAuth(msg.url);
        break;
      case 'logout':
        logout();

        break;
      case 'getToken':

        bkg.console.log('getToken(): ', localStorage, isAuth);

        if (!TOCAT_TOOLS.isTokenValid(localStorage.tokenUpdatedAt)) {
          isAuth = false;
          localStorage.tokenUpdatedAt = '';
          localStorage.tocatToken = '';
        }

        port.postMessage({
          name: 'getToken',
          token: localStorage.tocatToken,
          tokenUpdatedAt: localStorage.tokenUpdatedAt,
          isAuth: isAuth
        });

        chrome.storage.sync.set({token: localStorage.tocatToken, tokenUpdatedAt: localStorage.tokenUpdatedAt, isAuth: isAuth}, function () {
          sendDataToContent();
        });

        break;
      default:
        break;
    }
  });
});

/**
 * Tab updated event handler
 */

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  var url = tab.url,
    domain,
    protocol,
    full;

  domain = TOCAT_TOOLS.getDomainFromUrl(url);
  protocol = TOCAT_TOOLS.getProtocolFromUrl(url);
  full = protocol + '://' + domain;

  if (domain && changeInfo.status === 'complete') {
    if (localStorage.tocatToken && TOCAT_TOOLS.isDomainStored(full)) {
      TOCAT_TOOLS.updateIcon(url);
    } else {
      chrome.browserAction.setBadgeText({text: ''});
    }
  }

  chrome.storage.sync.get(['isAuth', 'token', 'tokenUpdatedAt'], function(storage) {
    localStorage.tocatToken = storage.token;
    localStorage.tokenUpdatedAt = storage.tokenUpdatedAt;
    isAuth = storage.isAuth;

    sendDataToContent(tabId);
  });
});

/**
 * Tab activated event handler
 */

chrome.tabs.onActivated.addListener(function() {
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    var url = tabs[0].url,
      domain,
      protocol,
      full;

    domain = TOCAT_TOOLS.getDomainFromUrl(url);
    protocol = TOCAT_TOOLS.getProtocolFromUrl(url);
    full = protocol + '://' + domain;

    chrome.storage.sync.get(['isAuth', 'token', 'tokenUpdatedAt'], function(storage) {
      localStorage.tocatToken = storage.token;
      localStorage.tokenUpdatedAt = storage.tokenUpdatedAt;
      isAuth = storage.isAuth;

      sendDataToContent(tabs[0].id);
    });

    if (localStorage.tocatToken && TOCAT_TOOLS.isDomainStored(full)) {
      TOCAT_TOOLS.updateIcon(url);
    } else {
      chrome.browserAction.setBadgeText({text: ''});
    }
  });
});
