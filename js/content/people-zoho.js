'use strict';

(function () {
  var timelog = [],
    usersParsed = {},
    userCells = [],
    isAuth = false,
    isInitiating = false,
    isContentLoaded = false,
    isTocatConnected = false,
    tableBodyId = 'ZPAtt_attmonthlyReportTableBody',
    apiUrls = {
      timelogs: '/timelogs',
      issuesSummary: '/timelogs/issues_summary'
    },
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
    spinnerTemplate = '<div class="sk-circle">\n' +
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
      '        </div>',
    filtersFirstDay, spinner, notification, switcherContainer;

  /**
   * Get data from Google Sync storage
   */

  function syncData() {
    return new Promise(function (resolve, reject) {
      chrome.storage.sync.get(['isAuth', 'token'], function (storage) {
        resolve(storage);
      });
    });
  }

  /**
   * Wait for element to be loaded
   *
   * @param {String} elementId
   * @param {Function} callback
   */

  function waitForElement(elementId, callback) {
    var timeout, wait;

    wait = function () {
      var element = document.getElementById(elementId);

      if (document.body.contains(element)) {
        clearTimeout(timeout);
        callback();
      }
      else {
        timeout = setTimeout(wait, 10);
      }
    };

    wait();
  }

  /**
   * Catch filters changes
   */

  function filtersHook() {
    var filters = document.getElementById('ZPAtt_monthlyReportfilter'),
      searchButton = filters.getElementsByTagName('button')[0];

    searchButton.onclick = function () {
      setTimeout(function () {
        var users = parseTable(false);

        waitForElement(tableBodyId, function () {
          users = parseTable(false);

          if (users.length > 0 && isTocatConnected) {
            getData();
          }
        });
      }, 800);
    };
  }

  /**
   * Init content script
   */

  function hashInit() {
    if (location.hash === '#attendance/report/monthlyreport') {
      syncData().then(function (storage) {
        isAuth = storage.isAuth;

        if (!isInitiating && isAuth) {
          isInitiating = true;

          waitForElement(tableBodyId, function () {
            var switcherElement = document.getElementById('switcher-container');

            if (!document.body.contains(switcherElement)) {
              TOCAT_TOOLS.setTokenHeader(storage.token);
              addAssets().then(function () {
                setTimeout(function () {
                  isInitiating = false;
                  addSwitcher();
                  filtersHook();
                }, 500);
              });
            }
          });
        }
      });
    }
  }

  /**
   * Process messages from the background script
   */

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    sendResponse('ok');
    hashInit();
  });

  /**
   * Add JIRA sync switcher element
   */

  function addSwitcher() {
    var switcherHtml = '<input type="checkbox" name="tocat-connection" id="tocat-connection" class="checkbox-green ios-toggle"/>\n' +
      '<label for="tocat-connection" class="checkbox-label"></label><span class="switcher-label">JIRA sync</span>',
      filtersRow = document.getElementById('attendance-report-monthlyreport'),
      switcher;

    switcherContainer = document.createElement('div');
    switcherContainer.className = 'switcher-container';
    switcherContainer.id = 'switcher-container';
    switcherContainer.innerHTML = switcherHtml;
    filtersRow.getElementsByClassName('col-md-4')[2].prepend(switcherContainer);

    switcher = document.getElementById('tocat-connection');

    switcher.onclick = function (event) {
      if (isAuth) {
        if (switcher.checked) {
          isTocatConnected = switcher.checked;
          getData();
        } else {
          event.preventDefault();
        }
      } else {
        event.preventDefault();
        showNotification('You are not authenticated in TOCAT plugin', 'error');
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
    spinnerHtml.innerHTML = spinnerTemplate;

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
      dateFormatted = ('0' + date.getDate()).slice(-2) + delimiter + date.toLocaleString('en-en', { month: 'short' }) + delimiter + date.getFullYear();
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

    return TOCAT_TOOLS.getJSON(apiUrls.timelogs + '?date_start=' + timePeriod.firstDay + '&date_end=' + timePeriod.lastDay + '&user_id=' + users.join(','));
  }

  /**
   * Get issues summary from JIRA
   * @param issues
   * @returns {*}
   */

  function getIssuesSummary(issues) {
    var payload = {
      issues_keys: issues.toString()
    };

    return TOCAT_TOOLS.postJSON(apiUrls.issuesSummary, payload);
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

    return TOCAT_TOOLS.postJSON(apiUrls.timelogs, payload);
  }

  /**
   * Generate HTML code for issues block
   *
   * @param {String} userId
   * @param {String} date
   * @returns {*}
   */

  function renderIssues(userId, date, elementId) {
    var workday = getTimelogItem(userId, date),
      issuesKeys = [],
      issuesHours = {},
      issuesContainer = document.getElementById(elementId),
      content, issuesTitile;

    if (workday && workday.issues.length > 0) {
      issuesTitile = workday.issues.length > 1 ? 'issues' : 'issue';

      content = '<table class="tocat-table table-fixed opacity-0 fadeIn"><thead><tr><th>ISSUES</th><th>Time</th></tr></thead>';

      workday.issues.map(function (issue) {
        if (!issuesKeys.includes(issue.issue_key)) {
          issuesKeys.push(issue.issue_key);
        }

        if (issuesHours[issue.issue_key]) {
          issuesHours[issue.issue_key] += issue.hours;
        } else {
          issuesHours[issue.issue_key] = issue.hours;
        }
      });

      getIssuesSummary(issuesKeys).then(function (response) {
        var issueDetails = response.result,
          jiraIssueUrl = 'https://opsway.atlassian.net/browse/';

        issuesKeys.map(function (key) {
          content += '<tr class="tocat-issues-content">' +
            '<td><a href="' + jiraIssueUrl + key + '" target="_blank">' + issueDetails[key].summary + '</a></td>' +
            '<td>' + Number(issuesHours[key].toFixed(1)) + 'h</td></tr>';
        });

        content += '<tfoot><tr><td>TOTAL (' + issuesKeys.length + ' ' + issuesTitile + ')</td><td>' + workday.hours + 'h</td></tr></tfoot></table>';

        issuesContainer.innerHTML =  content;
      }, function () {
        showNotification('TOCAT Server error occurred!', 'error');

        issuesContainer.innerHTML = '<div class="no-result error opacity-0 fadeIn">No issues has been loaded. Try again later.</div>';
      });
    } else {
      issuesContainer.innerHTML = '<div class="no-result opacity-0 fadeIn">No logged time in issues</div>';
    }
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
      workday = getTimelogItem(userId, date),
      form = {
        id: 'approvalForm',
        content: ''
      },
      issues = {
        id: 'tocat-issues',
        content: workday.issues.length > 0 ? spinnerTemplate : ''
      },
      modalTitle = usersParsed[userId].name + ' (' + renderDate(date, '/') + ')<div class="fa fa-close fa-pull-right cursor-p" id="modal-close"></div>',
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
        title.innerHTML = modalTitle;

        modalBox.prepend(title);

        if (isApproved) {
          setTimeout(function () {
            checkMark.classList.add('draw');
          }, 300);
        }
      },
      onOpen: function () {
        document.getElementById('modal-close').onclick = function () {
          approvalModal.close();
        };

        renderIssues(userId, date, issues.id);
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

          approvedCell.firstChild.innerHTML = approvalOptions[checkedValue].title + '<div class="hours-approved">(' + workday.hours + 'h)</div>';
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

        if (data.leave_type && data.leave_type !== '') {
          Object.keys(leaveTypes).forEach(function (key) {
            if (leaveTypes[key] === data.leave_type) {
              leaveKey = key;
              if (key === 'w') {
                leaveKey += data.percentage > 1 ? 100 : data.percentage * 100;
              }
            }
          });

          cell.setAttribute('data-leave', leaveKey);
          cell.firstChild.innerHTML = approvalOptions[leaveKey].title + '<div class="hours-approved">(' + data.hours + 'h)</div>';
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
    var table = document.getElementById(tableBodyId),
      rows = [].slice.call(table.getElementsByClassName('ZPLRow')),
      usersList = [];

    userCells = data ? [] : userCells;

    [].map.call(rows, function (row) {
      var userId = row.firstChild.children[1].children[0].children[0].innerText,
        userName = row.firstChild.children[1].children[0].lastChild.textContent,
        cells = [].slice.call(row.childNodes), userCell;

      usersList.push(userId);

      if (data) {
        userCell = cells.splice(0, 1);
        userCells.push(userCell);

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
                showNotification('Enable JIRA sync, please', 'error');
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

  function tableOnScroll() {
    var tableContainer = document.getElementById('ZPAtt_attmonthlyReport'),
      tableHeadRect = tableContainer.getElementsByClassName('ZPLHRow')[0].cells[0].getBoundingClientRect(),
      breakPointX = tableHeadRect.width,
      userCell = userCells[0][0],
      isScrolling;

    tableContainer.onscroll = function (event) {
      var scrollLeft = event.target.scrollLeft;

      clearTimeout(isScrolling);

      isScrolling = setTimeout(function() {
        if (userCells.length > 0) {
          if (scrollLeft > breakPointX) {
            userCells.map(function (cell) {
              cell[0].style.left = scrollLeft + 'px';
              cell[0].classList.add('cell-fixed');
            });
          } else {
            if (userCell.classList.contains('cell-fixed')) {
              userCells.map(function (cell) {
                cell[0].style.left = '0px';
                cell[0].classList.remove('cell-fixed');
              });
            }
          }
        }
      }, 66);
    };
  }

  /**
   * Initiate content script
   */

  function getData() {
    var users = parseTable(false);

    showSpinner();

    filtersFirstDay = new Date(getDatePeriod().firstDay);

    getTimelog(users).then(function (response) {
      timelog = response.result;
      isContentLoaded = true;
      hideSpinner();
      composeLegend();
      parseTable(timelog);
      tableOnScroll();
    }, function () {
      isContentLoaded = true;
      hideSpinner();
      showNotification('TOCAT Server error occurred!', 'error');
    });
  }
})();
