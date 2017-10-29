'use strict';

var timelog = [], isInitiated = false;

/**
 * Process messages from the background script
 */

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.isAuth)
      addAssets().then(function () {
        if (!isInitiated) {
          isInitiated = true;
          init();
        }
      });
  });

/**
 * Inject resources into the page
 */

function addAssets() {
  return new Promise(function(resolve, reject) {
    var fa = document.createElement('style'),
      script = document.createElement('script');

    fa.type = 'text/css';
    fa.textContent = '@font-face { font-family: FontAwesome; src: url("'
      + chrome.extension.getURL('fonts/fontawesome-webfont.woff')
      + '"); }';
    document.head.appendChild(fa);

    script.src = chrome.extension.getURL('build/js/libs.js');
    script.addEventListener('load', resolve);
    document.head.appendChild(script);
  });
}

/**
 * Render legend
 */

function composeLegend() {
  var legends = [{
      className: 'approved',
      description: 'approved'
    }, {
      className: '',
      description: 'not approved'
    }, {
      className: 'sick text-center fa fa-2x fa-stethoscope',
      description: 'sick paid'
    }, {
      className: 'vacation text-center fa fa-2x fa-plane',
      description: 'vacation paid'
    }],
    legendHtml = '',
    legendContainer = document.getElementById('ZPAtt_mReoprt_abbr');

  legends.map(function (legend) {
    legendHtml += '<div class="legend-block">' +
      '<div class="legend-sign ' + legend.className + '"></div>' +
      '<div class="legend-desc">- ' + legend.description + '</div>' +
      '</div>';
  });

  legendContainer.innerHTML = legendHtml;
}

/**
 * Format date as YYYY-MM-DD
 *
 * @param {Date} date
 * @returns {string}
 */

function renderDate(date) {
  return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
}

/**
 * Get first and last day of current month
 *
 * @returns {{firstDay: string, lastDay: string}}
 */

function getDatePeriod() {
  var date = new Date(),
    firstDay = new Date(date.getFullYear(), date.getMonth(), 1),
    lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    firstDay: renderDate(firstDay),
    lastDay: renderDate(lastDay)
  };
}

/**
 * GET info about selected users
 *
 * @param {Array} users
 */

function getUsersInfo(users) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest(),
      timePeriod = getDatePeriod();

    console.log(timePeriod);
    xhr.open('GET', 'https://private-anon-ad8ae34bbd-tocat.apiary-mock.com/timelog/?date_start=' + timePeriod.firstDay + '&date_end=' + timePeriod.lastDay + '&users=' + users.join(','), true);
    xhr.responseType = 'json';

    xhr.onload = function() {
      var status = xhr.status;

      if (status >= 200 && status < 400) {
        resolve(xhr.response);
      } else {
        reject(xhr.response);
      }
    };

    xhr.send();
  });
}

  /**
   * POST approval info about selected day for selected user
   *
   * @param {String} userId
   * @param {String} date
   * @param {String} leaveType: working/sick_paid/unpaid
   * @param {Number} percentage: 0.25/0.5/1.0
   */

function approveDay(userId, date, leaveType, percentage) {
  return new Promise(function(resolve, reject) {
    var request = new XMLHttpRequest(),
      dayLeaveType = leaveType || 'working',
      dayPercentage = percentage || 1.0, body;

    body = {
      date: date,
      percentage: dayLeaveType === 'working' ? dayPercentage : null,
      leave_type: dayLeaveType
    };

    request.open('POST', 'https://private-anon-ad8ae34bbd-tocat.apiary-mock.com/timelog/?date_start=2016-05-05&date_end=2016-05-06&users=ansam,alsan,dekul');

    request.setRequestHeader('Content-Type', 'application/json');

    request.onreadystatechange = function () {
      if (this.readyState === 4) {
        console.log('Status:', this.status);
        console.log('Headers:', this.getAllResponseHeaders());
        console.log('Body:', this.responseText);
      }
    };

    request.onload = function() {
      var status = request.status;

      if (status >= 200 && status < 400) {
        resolve(request.response);
      } else {
        reject(request.response);
      }
    };

    request.send(JSON.stringify(body));
  });
}

/**
 * Open modal to approve selected day of current month for selected user
 *
 * @param {String} userId
 * @param {Number} day (1..31)
 */

function openApproveModal(userId, day) {
  var currentDate = new Date(),
    date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
    dateFormatted = renderDate(date),
    approvalOptions = {
      w100: {
        leave_type: 'working',
        percentage: 1
      },
      w50: {
        leave_type: 'working',
        percentage: 0.5
      },
      w25: {
        leave_type: 'working',
        percentage: 0.25
      },
      s100: {
        leave_type: 'sick_paid',
        percentage: null
      },
      u0: {
        leave_type: 'unpaid',
        percentage: null
      }
    };

  bootbox.dialog({
    title: userId + ' (' + dateFormatted + ')',
    message: '<form id="approvalForm" class="container form-horizontal">' +
    '<div class="form-group"><input id="hours100" type="radio" name="hours" value="w100" checked><label class="control-label" for="hours100"> - 100% working day</label></div>' +
    '<div class="form-group"><input id="hours50" type="radio" name="hours" value="w50"><label class="control-label" for="hours50"> - 50% working day</label></div>' +
    '<div class="form-group"><input id="hours25" type="radio" name="hours" value="w25"><label class="control-label" for="hours25"> - 25% working day</label></div>' +
    '<div class="form-group"><input id="sick100" type="radio" name="hours" value="s100"><label class="control-label" for="sick100"> - 100% Sick/Paid</label></div>' +
    '<div class="form-group"><input id="unpaid0" type="radio" name="hours" value="u0"><label class="control-label" for="unpaid0"> - Unpaid leave</label></div>' +
    '</form>',
    buttons: {
      cancel: {
        label: "Cancel",
        className: 'btn-default'
      },
      ok: {
        label: "Save",
        className: 'btn-success',
        callback: function () {
          var approvalForm = document.getElementById('approvalForm'),
            checkedValue = approvalForm.elements['hours'].value;

          console.log('Checked: %s Which stands for: %o', checkedValue, approvalOptions[checkedValue]);

          approveDay(userId, dateFormatted, approvalOptions[checkedValue].leave_type, approvalOptions[checkedValue].percentage).then(function (response) {
            console.log('POST response: ', response);
          });
        }
      }
    }
  });
}

/**
 * Initiate content script
 */

function init() {
  var table = document.getElementById('ZPAtt_attmonthlyReportTableBody'),
    rows = [].slice.call(table.getElementsByClassName('ZPLRow')),
    users = {},
    usersList = [];

  composeLegend();

  [].map.call(rows, function (row) {
    var userId = row.firstChild.children[1].children[0].children[0].innerText,
      cells = [].slice.call(row.childNodes);

    usersList.push(userId);

    // remove first cell from list (with user name)
    cells.splice(0, 1);

    cells.map(function (cell, index) {
      if (cell.classList.contains('WStripe')) {
        cell.classList.remove('WStripe');
      }

      cell.onclick = function () {
        openApproveModal(userId, index + 1);
      }
    });

    users[userId] = cells;
    console.log('Parsed users: ', users);
  });

  getUsersInfo(usersList).then(function (response) {
    timelog = response.result;
    console.log('timelog: ', timelog);
  });
}
