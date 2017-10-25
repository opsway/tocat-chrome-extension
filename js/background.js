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

chrome.extension.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
    switch (msg.name) {
      case 'setToken':
        localStorage.tocatToken = msg.token;
        localStorage.tokenUpdatedAt = Date.now();
        break;
      case 'initAuth':
        console.log('initAuth from BG');
        initAuth(msg.url);
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

    if (localStorage.tocatToken && TOCAT_TOOLS.isDomainStored(full)) {
      TOCAT_TOOLS.updateIcon(url);
    } else {
      chrome.browserAction.setBadgeText({text: ''});
    }
  });
});


// Get auth token using chrome.tabs

function initAuth(url) {
  var manifest = chrome.runtime.getManifest(),
    clientId = encodeURIComponent(manifest.oauth2.client_id),
    scopes = encodeURIComponent(manifest.oauth2.scopes.join(' ')),
    redirectUri = encodeURIComponent('https://tocat.opsway.com/authenticate'),
    /*url = 'https://accounts.google.com/o/oauth2/auth' +
      '?client_id=' + clientId +
      '&response_type=code' +
      '&access_type=offline' +
      '&redirect_uri=' + redirectUri +
      '&scope=' + scopes,*/
    RESULT_PREFIX = ['Success', 'Denied', 'Error'];

    console.log('initAuth url: ', url);

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
            chrome.tabs.onUpdated.removeListener(googleAuthorizationHook);
            chrome.tabs.remove(tabId);
          }
        }

        /*if (titleParts.length == 2 && RESULT_PREFIX.indexOf(result) >= 0) {
          chrome.tabs.onUpdated.removeListener(googleAuthorizationHook);
          chrome.tabs.remove(tabId);

          var response = titleParts[1];
          switch (result) {
            case 'Success':
              // Example: id_token=<YOUR_BELOVED_ID_TOKEN>&authuser=0&hd=<SOME.DOMAIN.PL>&session_state=<SESSION_SATE>&prompt=<PROMPT>
              console.log('Success: ', response);
              break;
            case 'Denied':
              // Example: error_subtype=access_denied&error=immediate_failed
              console.log('Denied: ',response);
              break;
            case 'Error':
              // Example: 400 (OAuth2 Error)!!1
              console.log('Error: ', response);
              break;
          }
        }*/
      }
    });

    // chrome.tabs.update(authenticationTab.id, {'url': url});
  });
}
