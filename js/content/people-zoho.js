'use strict';

(function () {
  var timelog = [],
    usersParsed = {},
    isAuth = false,
    isInitiated = false,
    isContentLoaded = false,
    isTocatConnected = false,
    apiUrl = 'https://private-anon-ad8ae34bbd-tocat.apiary-mock.com/timelog',
    approvalOptions = {
      w100: {
        leave_type: 'Working',
        percentage: 1,
        title: '100%',
        description: '100% working day',
        checked: true
      },
      w50: {
        leave_type: 'Working',
        percentage: 0.5,
        title: '50%',
        description: '50% working day'
      },
      w25: {
        leave_type: 'Working',
        percentage: 0.25,
        title: '25%',
        description: '25% working day'
      },
      s100: {
        leave_type: 'Sick [Paid]',
        percentage: 1,
        title: '<span class="fa fa-2x fa-stethoscope"></span>',
        description: '100% Sick/Paid'
      },
      u0: {
        leave_type: 'Day off/Vacation',
        percentage: 1,
        title: '<span class="fa fa-2x fa-plane"></span>',
        description: 'Unpaid leave'
      }
    },
    filtersFirstDay, spinner, notification;

  /**
   * Process messages from the background script
   */

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    isAuth = request.isAuth;

    if (isAuth && !isInitiated) {
      isInitiated = true;
      TOCAT_TOOLS.setTokenHeader(request.token);

      addAssets().then(function () {
        addSwitcher();

        filtersHook();
      });
    }
  });

  function addSwitcher() {
    var switcherContainer = document.createElement('div'),
        switcherHtml = '<input type="checkbox" name="tocat-connection" id="tocat-connection" class="checkbox-green ios-toggle"/>\n' +
      '<label for="tocat-connection" class="checkbox-label"></label><span class="switcher-label">Tocat connection</span>',
      filtersRow = document.getElementById('attendance-report-hoursreport'),
      switcher;

    switcherContainer.className = 'switcher-container';
    switcherContainer.innerHTML = switcherHtml;
    filtersRow.getElementsByClassName('col-md-4')[2].prepend(switcherContainer);

    switcher = document.getElementById('tocat-connection');

    switcher.onclick = function () {
      isTocatConnected = switcher.checked;

      if (isTocatConnected) {
        init();
      }
    };
  }

  /**
   * Spinner tools
   */

  function showSpinner() {
    spinner.classList.remove('hidden');
    setTimeout(function () {
      spinner.classList.add('fadeIn');
    }, 10);
  }

  function hideSpinner() {
    spinner.classList.remove('fadeIn');
    setTimeout(function () {
      spinner.classList.add('hidden');
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

      addTemplates();

      fa.type = 'text/css';
      fa.textContent = '@font-face { font-family: FontAwesome; src: url("'
        + chrome.extension.getURL('fonts/fontawesome-webfont.woff')
        + '"); }';
      document.head.appendChild(fa);

      resolve();

      /*script.src = chrome.extension.getURL('build/js/content/people-zoho-libs.js');
      script.addEventListener('load', resolve);
      document.body.appendChild(script);*/
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
   * Format date as YYYY-MM-DD. If delimiter is present - format changed to DD-MM-YYYY.
   *
   * @param {Date} date
   * @param {String} delimiter: default '-'
   * @param {Boolean} shortMonth
   * @returns {string}
   */

  function renderDate(date, delimiter, shortMonth) {
    var dateFormatted = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();

    if (delimiter) {
      dateFormatted = date.getDate() + delimiter + (date.getMonth() + 1) + delimiter + date.getFullYear();
    }

    if (shortMonth) {
      dateFormatted = date.getDate() + delimiter + date.toLocaleString('en-en', { month: 'short' }) + delimiter + date.getFullYear();
    }

    return dateFormatted;
  }

  /**
   * Get first and last day of current month
   *
   * @returns {{firstDay: string, lastDay: string}}
   */

  function getDatePeriod() {
    var from = new Date(document.getElementById('ZPAtt_monthlyRep_fromDate').value),
      to = new Date(document.getElementById('ZPAtt_monthlyRep_toDate').value);

    return {
      firstDay: renderDate(from),
      lastDay: renderDate(to)
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
    var payload = {
      user_id: userId,
      date: date,
      leave_type: leaveType || 'Working',
      percentage: (percentage || 1.0).toString()
    };

    return TOCAT_TOOLS.postJSON('/timelogs', payload);
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

    if (workday && workday.issues.length > 0) {
      content = '<table class="tocat-table"><tr><th>ISSUES</th><th>Time</th></tr>';

      workday.issues.map(function (issue) {
        content += '<tr class="tocat-issues-content"><td><a href="https://opsway.atlassian.net/browse/' + issue.issue_key + '" target="_blank">' + issue.issue_key + '</a></td><td>' + issue.hours + 'h</td></tr>';
      });

      content += '<tr><td>TOTAL</td><td>' + workday.hours + 'h</td></tr></table>';
    } else {
      content = '<div class="no-result">No logged time in issues</div>';
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
    var date = new Date(filtersFirstDay.getFullYear(), filtersFirstDay.getMonth(), day),
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

    approvalModal = new tingle.modal({
      footer: !isApproved,
      stickyFooter: false,
      closeMethods: ['overlay', 'button', 'escape'],
      closeLabel: 'Close',
      cssClass: ['approve-modal'],
      beforeOpen: function () {
        var modal = document.getElementsByClassName('approve-modal')[0],
          modalBox = modal.getElementsByClassName('tingle-modal-box')[0],
          checkMark = modal.getElementsByClassName('checkmark')[0],
          title = document.createElement('div');

        title.className = 'tingle-modal-box__title';
        title.textContent = modalTitle;

        modalBox.prepend(title);

        if (isApproved) {
          setTimeout(function () {
            checkMark.classList.add('draw');
          }, 300);
        }
      }
    });

    if (isApproved) {
      template =
        '<div class="circle-loader load-complete center-block">\n' +
        '  <div class="checkmark"></div>\n' +
        '</div>' +
        '<div class="approved-result">' + approvalOptions[cell.getAttribute('data-leave')].description + '</div>' +
        '<div id="' + issues.id + '" class="tocat-issues-container">' + issues.content + '</div>';
    } else {
      template = '<form id="' + form.id + '" class="tocat-form">' + form.content + '</form>' +
        '<div id="' + issues.id + '" class="tocat-issues-container">' + issues.content + '</div>';

      approvalModal.addFooterBtn('Save', 'btn btn-success tingle-btn--pull-right', function() {
        var approvalForm = document.getElementById(form.id),
          checkedValue = approvalForm.elements['hours'].value;

        showSpinner();
        approvalModal.close();

        approveDay(userId, renderDate(date, '-', true), approvalOptions[checkedValue].leave_type, approvalOptions[checkedValue].percentage).then(function (response) {
          var approvedCell = usersParsed[userId].cells[day - filtersFirstDay.getDate()];

          approvedCell.firstChild.innerHTML = approvalOptions[checkedValue].title;
          approvedCell.classList.add('approved');
          approvedCell.setAttribute('data-leave', checkedValue);
          hideSpinner();
          approvalModal.destroy();
          showNotification('Updated successfully!');
        }, function () {
          hideSpinner();
          showNotification('TOCAT Server error occurred!', 'error');
        });
      });

      approvalModal.addFooterBtn('Cancel', 'btn btn-default tingle-btn--pull-right', function() {
        approvalModal.close();
      });
    }

    approvalModal.setContent(template);
    approvalModal.open();
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
    var data = getTimelogItem(userId, date),
      leaveTypes = {
        w: 'Working',
        s100: 'Sick [Paid]',
        u0: 'Day off/Vacation'
      },
      leaveKey = '';

    cell.firstChild.className = '';

    if (data) {
      if (data.approval_status) {
        cell.className = data.approval_status ? data.approval_status.toLowerCase() : '';

        if (data.leave_type) {
          Object.keys(leaveTypes).forEach(function (key) {
            if (leaveTypes[key] === data.leave_type) {
              leaveKey = key;
              if (key === 'w') {
                leaveKey += data.percentage > 1 ? 100 : data.percentage * 100;
              }
            }
          });

          cell.setAttribute('data-leave', leaveKey);
          cell.firstChild.innerHTML = approvalOptions[leaveKey].title;
        }
      } else {
        cell.firstChild.textContent = data.hours > 0 ? data.hours + 'h' : '-';
      }
    }
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
          var day = index + filtersFirstDay.getDate();

          if (cell.classList.contains('WStripe')) {
            cell.classList.remove('WStripe');
          }

          if (cell.classList.contains('WKend')) {
            cell.classList.remove('WKend');
          }

          decorateCell(cell, userId, renderDate(new Date(filtersFirstDay.getFullYear(), filtersFirstDay.getMonth(), day)));

          cell.onclick = function () {
            var isApproved = cell.classList.contains('approved');

            if (isAuth) {
              if (isTocatConnected) {
                openApproveModal(userId, day, cell, isApproved);
              } else {
                showNotification('Enable TOCAT connection, please', 'error');
              }
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

    return data ? false : usersList;
  }

  /**
   * Catch filters changes
   */

  function filtersHook() {
    var filters = document.getElementById('ZPAtt_monthlyReportfilter'),
      searchButton = filters.getElementsByTagName('button')[0];

    searchButton.onclick = function () {
      var users = parseTable(false);

      if (users.length > 0 && isTocatConnected) {
        init();
      }
    };
  }

  /**
   * Initiate content script
   */

  function init() {
    showSpinner();

    filtersFirstDay = new Date(getDatePeriod().firstDay);

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
})();
