'use strict';

var timelog = [];

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.isAuth)
      addAssets().then(function () {
        init();
      });
  });

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

function renderDate(date) {
  return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
}

function getDatePeriod() {
  var date = new Date(),
    firstDay = new Date(date.getFullYear(), date.getMonth(), 1),
    lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    firstDay: renderDate(firstDay),
    lastDay: renderDate(lastDay)
  };
}

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
   * @param {String} userId
   * @param {String} date
   * @param {String} leaveType: working/sick_paid/unpaid
   * @param {Number} percentage: 0.25/0.5/1.0
   */

function approveDay(userId, date, leaveType, percentage) {
  var request = new XMLHttpRequest(),
    dayLeaveType = leaveType || 'working',
    dayPercentage = percentage || 1.0;

  request.open('POST', 'https://private-anon-ad8ae34bbd-tocat.apiary-mock.com/timelog/?date_start=2016-05-05&date_end=2016-05-06&users=ansam,alsan,dekul');

  request.setRequestHeader('Content-Type', 'application/json');

  request.onreadystatechange = function () {
    if (this.readyState === 4) {
      console.log('Status:', this.status);
      console.log('Headers:', this.getAllResponseHeaders());
      console.log('Body:', this.responseText);
    }
  };

  var body = {
    date: date,
    percentage: dayLeaveType === 'working' ? dayPercentage : null,
    leave_type: dayLeaveType
  };

  request.send(JSON.stringify(body));
}

function openApproveModal(userId, day) {
  var currentDate = new Date(),
    date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day + 1),
    modalHtml = '';

  bootbox.dialog({
    title: userId + ' (' + renderDate(date) + ')',
    message: '<form class="container form-horizontal">' +
    '<div class="form-group"><input id="hours100" type="radio" name="hours" value="w100" checked><label class="control-label" for="hours100"> - 100% working day</label></div>' +
    '<div class="form-group"><input id="hours50" type="radio" name="hours" value="w50"><label class="control-label" for="hours50"> - 50% working day</label></div>' +
    '<div class="form-group"><input id="hours25" type="radio" name="hours" value="w25"><label class="control-label" for="hours25"> - 25% working day</label></div>' +
    '<div class="form-group"><input id="sick100" type="radio" name="hours" value="s100"><label class="control-label" for="sick100"> - 100% Sick/Paid</label></div>' +
    '<div class="form-group"><input id="unpaid0" type="radio" name="hours" value="u0"><label class="control-label" for="unpaid0"> - Unpaid leave</label></div>' +
    '</form>',
    buttons: {
      cancel: {
        label: "Cancel",
        className: 'btn-danger'
      },
      ok: {
        label: "Save",
        className: 'btn-success',
        callback: function () {
          console.log('clicked save');
        }
      }
    }
  });
}

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

    // remove first cell from list with user name
    cells.splice(0, 1);

    cells.map(function (cell, index) {
      if (cell.classList.contains('WStripe')) {
        cell.classList.remove('WStripe');
      }

      cell.onclick = function () {
        openApproveModal(userId, index);
      }
    });

    users[userId] = cells;
    console.log('users: ', users);
  });

  getUsersInfo(usersList).then(function (response) {
    timelog = response.result;
    console.log('timelog: ', timelog);
  });
}
