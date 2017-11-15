var isAuth = false,
  isExecutingScripts = false,
  contentUrl = 'https://people.zoho.com/hr#attendance/report/hoursreport';

bkg = chrome.extension.getBackgroundPage();
localStorage.tocatToken = '';
localStorage.tokenUpdatedAt = '';
localStorage.storedDomains = '{}';

function injectResources(files) {
  var getFileExtension = /(?:\.([^.]+))?$/, loadFunctionForExtension;

  loadFunctionForExtension = function(ext) {
    switch(ext) {
      case 'js' : return chrome.tabs.executeScript;
      case 'css' : return chrome.tabs.insertCSS;
      default: throw new Error('Unsupported resource type')
    }
  };

  return Promise.all(files.map(function (resource) {
    return new Promise(function(resolve, reject) {
      var ext = getFileExtension.exec(resource)[1],
        loadFunction = loadFunctionForExtension(ext);

      loadFunction(null, {file: resource}, function() {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }));
}

function sendDataToContent() {
  var data = {
    isAuth: isAuth,
    token: localStorage.tocatToken,
    tokenUpdatedAt: localStorage.tokenUpdatedAt
  };

  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, data, function (response) {
      if (tabs[0].url === contentUrl && response !== 'ok' && !isExecutingScripts) {
        isExecutingScripts = true;
        injectResources(['build/css/assets.css', 'build/css/content/people-zoho.css', 'build/js/content/people-zoho-libs.js', 'build/js/tools.js', 'build/js/content/people-zoho.js']).then(function () {
          sendDataToContent();
        });
      }
    });
  });
}

/**
 * Get server token
 * @param {String} url
 */

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

            chrome.storage.sync.set({token: localStorage.tocatToken, tokenUpdatedAt: localStorage.tokenUpdatedAt, isAuth: isAuth}, function () {
              chrome.tabs.update(initialTab.id, {active: true}, function () {
                chrome.tabs.remove(tabId);
              });
            });
          }
        }
      });
    });
  });
}

/**
 * Long term connection port
 */

chrome.extension.onConnect.addListener(function(port) {
  var syncData = function () {
    port.postMessage({
      name: 'getToken',
      token: localStorage.tocatToken,
      tokenUpdatedAt: localStorage.tokenUpdatedAt,
      isAuth: isAuth
    });

    chrome.storage.sync.set({token: localStorage.tocatToken, tokenUpdatedAt: localStorage.tokenUpdatedAt, isAuth: isAuth}, function() {
      sendDataToContent();
    });
  };

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

        syncData();
        break;
      case 'getToken':
        if (!TOCAT_TOOLS.isTokenValid(localStorage.tokenUpdatedAt)) {
          isAuth = false;
          localStorage.tokenUpdatedAt = '';
          localStorage.tocatToken = '';
        }

        syncData();
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

    chrome.storage.sync.get(['isAuth', 'token', 'tokenUpdatedAt'], function(storage) {
      localStorage.tocatToken = storage.token;
      localStorage.tokenUpdatedAt = storage.tokenUpdatedAt;
      isAuth = storage.isAuth;

      if (url === contentUrl) {
        sendDataToContent();
      }
    });
  }
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

    if (localStorage.tocatToken && TOCAT_TOOLS.isDomainStored(full)) {
      TOCAT_TOOLS.updateIcon(url);
    } else {
      chrome.browserAction.setBadgeText({text: ''});
    }

    chrome.storage.sync.get(['isAuth', 'token', 'tokenUpdatedAt'], function(storage) {
      localStorage.tocatToken = storage.token;
      localStorage.tokenUpdatedAt = storage.tokenUpdatedAt;
      isAuth = storage.isAuth;

      if (url === contentUrl) {
        sendDataToContent();
      }
    });
  });
});
