if (!chrome.runtime) {
  // Chrome 20-21
  chrome.runtime = chrome.extension;
} else if(!chrome.runtime.onMessage) {
  // Chrome 22-25
  chrome.runtime.onMessage = chrome.extension.onMessage;
  chrome.runtime.sendMessage = chrome.extension.sendMessage;
  chrome.runtime.onConnect = chrome.extension.onConnect;
  chrome.runtime.connect = chrome.extension.connect;
}

var TOCAT_TOOLS = (function() {
  var counterRequest = 0;
  var counterResponse = 0;
  var tocatToken = '';
  var port = chrome.extension.connect({name: "connection with background"});

  var urlTocat = 'https://tocat.opsway.com';

  // show and hide spinner
  function checkCounters() {
    setTimeout(function() {
      var spinner = document.getElementById('spinner');
      if ((counterRequest == counterResponse) && spinner) {
        spinner.innerHTML = '';
      }

      if ((counterRequest != counterResponse) && spinner) {
        spinner.innerHTML =
          '<div class="sk-circle">' +
          '<div class="sk-circle1 sk-child"></div>' +
          '<div class="sk-circle2 sk-child"></div>' +
          '<div class="sk-circle3 sk-child"></div>' +
          '<div class="sk-circle4 sk-child"></div>' +
          '<div class="sk-circle5 sk-child"></div>' +
          '<div class="sk-circle6 sk-child"></div>' +
          '<div class="sk-circle7 sk-child"></div>' +
          '<div class="sk-circle8 sk-child"></div>' +
          '<div class="sk-circle9 sk-child"></div>' +
          '<div class="sk-circle10 sk-child"></div>' +
          '<div class="sk-circle11 sk-child"></div>' +
          '<div class="sk-circle12 sk-child"></div>' +
          '</div>';
      }
    }, 50);
  }

  function getJSONRequest(url) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      counterRequest += 1;
      checkCounters();
      xhr.open('get', url, true);
      if (localStorage.tocatToken) {
        xhr.setRequestHeader('Authorization', localStorage.tocatToken);
      }
      xhr.responseType = 'json';
      xhr.onload = function() {
        var status = xhr.status;
        if (status >= 200 && status < 400) {
          resolve(xhr.response);
        } else {
          reject(xhr.response);
        }
        counterResponse += 1;
        checkCounters();
      };
      xhr.send();
    });
  }

  function deleteJSONRequest(url) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      counterRequest += 1;
      checkCounters();
      xhr.open('delete', url, true);
      if (tocatToken) {
        xhr.setRequestHeader('Authorization', tocatToken);
      }
      xhr.responseType = 'json';
      xhr.onload = function() {
        var status = xhr.status;
        if (status == 200) {
          resolve(xhr.response);
        } else {
          reject(xhr.response);
        }
        counterResponse += 1;
        checkCounters();
      };
      xhr.send();
    });
  }

  function postJSONRequest(url, obj) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      counterRequest += 1;
      checkCounters();
      xhr.open('post', url, true);
      if (tocatToken) {
        xhr.setRequestHeader('Authorization', tocatToken);
      }
      xhr.responseType = 'json';
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.onload = function() {
        var status = xhr.status;
        if (status >= 200 && status < 400) {
          resolve(xhr.response);
        } else {
          reject(xhr.response);
        }
        counterResponse += 1;
        checkCounters();
      };
      xhr.send(JSON.stringify(obj));
    });
  }

  /**
   *
   * @param obj
   * @returns {boolean}
   */
  function isEmptyObject(obj) {
    for(var prop in obj) {
      if(obj.hasOwnProperty(prop))
        return false;
    }

    return true;
  }

  /**
   *
   * @param url
   */
  function updateIcon(url) {
    TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/tasks/?search=external_id=' + url.split('?')[0]).then(function(data) {
      var orders = [];
      var totalBudget = null;
      if (data.length) {
        orders = data[0].orders
        totalBudget = 0;
        for (var i = 0 ; i < orders.length ; i++) {
          totalBudget += parseInt(orders[i].budget, 10);
        }
      }

      if (totalBudget === 0) {
        chrome.browserAction.setBadgeText({text: '—'});
        chrome.browserAction.setBadgeBackgroundColor({color: '#991e17'});
        return;
      }

      if (totalBudget && totalBudget <= 9999) {
        chrome.browserAction.setBadgeText({text: totalBudget.toString()});
        chrome.browserAction.setBadgeBackgroundColor({color: '#1d9c19'});
      } else {
        chrome.browserAction.setBadgeText({text: '—'});
        chrome.browserAction.setBadgeBackgroundColor({color: '#991e17'});
      }
    }, function(err) {
      console.log('error in updateIcon ', err);
      chrome.browserAction.setBadgeText({text: ''});
    });
  }

  /**
   *
   * @returns {string}
   */
  function guidGenerator() {
    var S4 = function() {
      return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
  }

  function setTokenHeader(token) {
    tocatToken = token;
  }

  return {
    getJSON: getJSONRequest,
    postJSON: postJSONRequest,
    urlTocat: urlTocat,
    deleteJSON: deleteJSONRequest,
    isEmptyObject: isEmptyObject,
    updateIcon: updateIcon,
    guidGenerator: guidGenerator,
    setTokenHeader: setTokenHeader
  }

})();