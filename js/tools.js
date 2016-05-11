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

  var urlTocat = 'http://test.tocat.opsway.com';

  function goTo(file) {
    window.location.href = file;
  }

  function getJSONRequest(url) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('get', url, true);
      xhr.responseType = 'json';
      xhr.onload = function() {
        var status = xhr.status;
        if (status == 200) {
          resolve(xhr.response);
        } else {
          reject(status);
        }
      };
      xhr.send();
    });
  }

  function deleteJSONRequest(url) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('delete', url, true);
      xhr.responseType = 'json';
      xhr.onload = function() {
        var status = xhr.status;
        if (status == 200) {
          resolve(xhr.response);
        } else {
          reject(status);
        }
      };
      xhr.send();
    });
  }

  function postJSONRequest(url, obj) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('post', url, true);
      xhr.responseType = 'json';
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.onload = function() {
        var status = xhr.status;
        if (status == 200 || status == 201) {
          resolve(xhr.response);
        } else {
          reject(status);
        }
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
      var totalBudget = 0;
      if (data.length) {
        orders = data[0].orders
      }

      for (var i = 0 ; i < orders.length ; i++) {
        totalBudget += parseInt(orders[i].budget, 10);
      }

      if (totalBudget && totalBudget <= 9000) {
        chrome.browserAction.setBadgeText({text: totalBudget.toString()});
      } else {
        chrome.browserAction.setBadgeText({text: '—'});
      }
    });
  }

  return {
    goTo: goTo,
    getJSON: getJSONRequest,
    postJSON: postJSONRequest,
    urlTocat: urlTocat,
    deleteJSON: deleteJSONRequest,
    isEmptyObject: isEmptyObject,
    updateIcon: updateIcon
  }

})();