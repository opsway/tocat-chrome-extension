'use strict';

(function ($) {
  var timelog = [],
    usersParsed = {},
    isAuth = false,
    isInitiated = false,
    isContentLoaded = false,
    apiUrl = 'https://private-anon-ad8ae34bbd-tocat.apiary-mock.com/timelog',
    currentDate = new Date(),
    spinner, notification;

  /**
   * Process messages from the background script
   */

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    isAuth = request.isAuth;

    if (isAuth && !isInitiated) {
      TOCAT_TOOLS.setTokenHeader(request.token);

      addAssets().then(function () {
        init();
      });
    }
  });

  /**
   * Spinner tools
   */

  function showSpinner() {
    spinner.classList.remove('hidden');
    spinner.classList.add('fadeIn');
  }

  function hideSpinner() {
    spinner.classList.add('fadeOut');
    setTimeout(function () {
      spinner.classList.add('hidden');
      spinner.classList.remove('fadeOut');
    }, 350);
  }

  /**
   * Notifications tools
   */

  function showNotification(message, type) {
    var messageType = type || 'success',
      content = notification.firstChild;

    content.innerText = message;
    content.classList.add(messageType);
    notification.classList.add('active');

    setTimeout(function () {
      content.classList.add('zoomIn');
    }, 10);

    setTimeout(function () {
      content.classList.remove('zoomIn');
      setTimeout(function () {
        notification.classList.remove('active');
        content.classList.remove(messageType);
      }, 250);
    }, 3000);
  }

  /**
   * Inject resources into the page
   */

  function addTemplates() {
    var spinnerHtml = document.createElement('div'),
      notificationHtml = document.createElement('div');

    notificationHtml.id = 'tocat-notification';
    notificationHtml.className = 'tocat-notification-container';
    notificationHtml.innerHTML = '<div class="tocat-notification"></div>';

    spinnerHtml.id = 'spinner';
    spinnerHtml.classList.add('content-spinner');
    spinnerHtml.classList.add('hidden');
    spinnerHtml.innerHTML = '<div class="sk-circle">\n' +
      '            <div class="sk-circle1 sk-child"></div>\n' +
      '            <div class="sk-circle2 sk-child"></div>\n' +
      '            <div class="sk-circle3 sk-child"></div>\n' +
      '            <div class="sk-circle4 sk-child"></div>\n' +
      '            <div class="sk-circle5 sk-child"></div>\n' +
      '            <div class="sk-circle6 sk-child"></div>\n' +
      '            <div class="sk-circle7 sk-child"></div>\n' +
      '            <div class="sk-circle8 sk-child"></div>\n' +
      '            <div class="sk-circle9 sk-child"></div>\n' +
      '            <div class="sk-circle10 sk-child"></div>\n' +
      '            <div class="sk-circle11 sk-child"></div>\n' +
      '            <div class="sk-circle12 sk-child"></div>\n' +
      '        </div>';

    document.body.appendChild(spinnerHtml);
    document.body.appendChild(notificationHtml);

    spinner = document.getElementById('spinner');
    notification = document.getElementById('tocat-notification');
  }

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

      addTemplates();
    });
  }

  /**
   * Render legend
   */

  function composeLegend() {
    var legends = [{
        className: 'approved',
        description: 'Approved'
      }, {
        className: '',
        description: 'Not approved'
      }, {
        className: 'sick text-center fa fa-2x fa-stethoscope',
        description: 'Sick/Paid'
      }, {
        className: 'vacation text-center fa fa-2x fa-plane',
        description: 'Unpaid leave'
      }],
      legendHtml = '',
      legendContainer = document.getElementById('ZPAtt_mReoprt_abbr');

    legends.map(function (legend) {
      legendHtml += '<div class="legend-block">' +
        '<div class="legend-sign ' + legend.className + '"></div>' +
        '<div class="legend-desc">' + legend.description + '</div>' +
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

  function renderDate(date, delimiter) {
    var dateFormatted = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();

    if (delimiter) {
      dateFormatted = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
    }

    return dateFormatted;
  }

  /**
   * Get first and last day of current month
   *
   * @returns {{firstDay: string, lastDay: string}}
   */

  function getDatePeriod() {
    var firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
      lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

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

  function getTimelog(users) {
    var timePeriod = getDatePeriod();

    return TOCAT_TOOLS.getJSON('/timelogs?date_start=' + timePeriod.firstDay + '&date_end=' + timePeriod.lastDay + '&user_id=' + users.join(','));
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
        dayPercentage = percentage || 1.0,
        body;

      body = {
        date: date,
        percentage: dayLeaveType === 'working' ? dayPercentage : null,
        leave_type: dayLeaveType
      };

      request.open('POST', apiUrl + '/?date_start=2016-05-05&date_end=2016-05-06&users=ansam,alsan,dekul');

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
   * Generate HTML code for issues block
   *
   * @param {String} userId
   * @param {String} date
   * @returns {*}
   */

  function renderIssues(userId, date) {
    var workday = getTimelogItem(userId, date),
      content;

    if (workday.issues.length > 0) {
      content = '<table class="tocat-table"><tr><th>ISSUES</th><th>Time</th></tr>';

      workday.issues.map(function (issue) {
        content += '<tr class="tocat-issues-content"><td><a href="https://opsway.atlassian.net/browse/' + issue.issue_key + '" target="_blank">' + issue.issue_key + '</a></td><td>' + issue.hours + 'h</td></tr>';
      });

      content += '<tr><td>TOTAL</td><td>' + workday.hours + 'h</td></tr></table>';
    } else {
      content = '<b>No logged time in issues</b>';
    }

    return content;
  }

  /**
   * Open modal to approve selected day of current month for selected user.
   *
   * @param {String} userId
   * @param {Number} day (1..31)
   * @param {HTMLElement} cell
   * @param {Boolean} isApproved
   */

  function openApproveModal(userId, day, cell, isApproved) {
    var date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
      approvalOptions = {
        w100: {
          leave_type: 'working',
          percentage: 1,
          title: '100%',
          description: '100% working day',
          checked: true
        },
        w50: {
          leave_type: 'working',
          percentage: 0.5,
          title: '50%',
          description: '50% working day'
        },
        w25: {
          leave_type: 'working',
          percentage: 0.25,
          title: '25%',
          description: '25% working day'
        },
        s100: {
          leave_type: 'sick_paid',
          percentage: null,
          title: '<span class="fa fa-2x fa-stethoscope"></span>',
          description: '100% Sick/Paid'
        },
        u0: {
          leave_type: 'unpaid',
          percentage: null,
          title: '<span class="fa fa-2x fa-plane"></span>',
          description: 'Unpaid leave'
        }
      },
      form = {
        id: 'approvalForm',
        content: ''
      },
      issues = {
        id: 'tocat-issues',
        content: renderIssues(userId, date)
      },
      modalTitle = usersParsed[userId].name + ' (' + renderDate(date, '/') + ')',
      approvalModal, template;

    Object.keys(approvalOptions).forEach(function (option) {
      var defaultChecked = approvalOptions[option].checked ? 'checked' : '',
        disabled = isApproved ? 'disabled' : '';

      form.content += '<div class="form-group"><input id="' + option + '" type="radio" name="hours" ' + disabled + ' value="' + option + '" ' + defaultChecked + '><label class="control-label" for="' + option + '">' + approvalOptions[option].description + '</label></div>';
    });

    if (isApproved) {
      template =
        '<div class="circle-loader load-complete center-block">\n' +
        '  <div class="checkmark"></div>\n' +
        '</div>' +
        '<div class="approved-result">' + approvalOptions[cell.getAttribute('data-leave')].description + '</div>' +
        '<div id="' + issues.id + '" class="tocat-issues-container">' + issues.content + '</div>';

      approvalModal = bootbox.alert({
        title: modalTitle,
        message: template
      });
    } else {
      template = '<form id="' + form.id + '" class="tocat-form">' + form.content + '</form>' +
        '<div id="' + issues.id + '" class="tocat-issues-container">' + issues.content + '</div>';

      approvalModal = bootbox.dialog({
        title: modalTitle,
        message: template,
        buttons: {
          cancel: {
            label: "Cancel",
            className: 'btn-default'
          },
          ok: {
            label: "Save",
            className: 'btn-success',
            callback: function () {
              var approvalForm = document.getElementById(form.id),
                checkedValue = approvalForm.elements['hours'].value;

              console.log('Checked: %s Which stands for: %o', checkedValue, approvalOptions[checkedValue]);
              showSpinner();

              approveDay(userId, renderDate(date), approvalOptions[checkedValue].leave_type, approvalOptions[checkedValue].percentage).then(function (response) {
                var approvedCell = usersParsed[userId].cells[day - 1];

                console.log('POST response: ', response);
                approvedCell.firstChild.innerHTML = approvalOptions[checkedValue].title;
                approvedCell.classList.add('approved');
                approvedCell.setAttribute('data-leave', checkedValue);
                hideSpinner();
                showNotification('Updated successfully!');
              }, function () {
                hideSpinner();
                showNotification('TOCAT Server error occurred!', 'error');
              });
            }
          }
        }
      });
    }

    approvalModal.init(function(){
      var checkmark = approvalModal.find('.checkmark'),
        footer = approvalModal.find('.modal-footer');

      if (isApproved) {
        footer.addClass('hidden');
        setTimeout(function () {
          checkmark.addClass('draw');
        }, 300);
      }
    });
  }

  /**
   * Get data for selected user and date
   *
   * @param {String} userId
   * @param {String} date
   */

  function getTimelogItem(userId, date) {
    var requestedDay = new Date(date), items;

    items = timelog[userId].filter(function (workday) {
      var currentDay = new Date(workday.work_date);

      if (currentDay.getDate() === requestedDay.getDate()) {
        return workday;
      }

      return false;
    });

    return items[0] || false;
  }

  /**
   * Modify day cell with data
   *
   * @param {HTMLElement} cell
   * @param {String} userId
   * @param {String} date
   */

  function decorateCell(cell, userId, date) {
    var data = getTimelogItem(userId, date);

    cell.firstChild.textContent = data ? data.hours + 'h' : '-';
  }

  /**
   * Parse table from HTML and modify if with timelog data.
   *
   * @param {Object} data
   */

  function parseTable(data) {
    var table = document.getElementById('ZPAtt_attmonthlyReportTableBody'),
      rows = [].slice.call(table.getElementsByClassName('ZPLRow')),
      usersList = [];

    [].map.call(rows, function (row) {
      var userId = row.firstChild.children[1].children[0].children[0].innerText,
        userName = row.firstChild.children[1].children[0].lastChild.textContent,
        cells = [].slice.call(row.childNodes);

      usersList.push(userId);

      if (data) {
        // remove first cell from list (with user name)
        cells.splice(0, 1);

        cells.map(function (cell, index) {
          if (cell.classList.contains('WStripe')) {
            cell.classList.remove('WStripe');
          }

          if (cell.classList.contains('WKend')) {
            cell.classList.remove('WKend');
          }

          decorateCell(cell, userId, renderDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), index + 1)));

          cell.onclick = function () {
            var isApproved = cell.classList.contains('approved');

            if (isAuth) {
              openApproveModal(userId, index + 1, cell, isApproved);
            } else {
              showNotification('You are not authenticated in TOCAT plugin', 'error');
            }
          }
        });
      }

      usersParsed[userId] = {
        name: userName,
        cells: cells
      };
    });

    console.log('Parsed users: ', usersParsed);

    return data ? false : usersList;
  }

  /**
   * Initiate content script
   */

  function init() {
    isInitiated = true;
    showSpinner();

    getTimelog(parseTable(false)).then(function (response) {
      timelog = response.result;
      isContentLoaded = true;
      hideSpinner();
      composeLegend();
      parseTable(timelog);
      console.log('Timelog from server: ', timelog);
    }, function () {
      isContentLoaded = true;
      hideSpinner();
      showNotification('TOCAT Server error occurred!', 'error');
    });
  }
})(jQuery);
