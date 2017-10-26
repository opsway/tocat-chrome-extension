document.addEventListener('DOMContentLoaded', function() {
  var addOrderBtn = document.getElementById('add-order-btn'),
    selectResolver = document.getElementById('selectResolver'),
    checkboxAccepted = document.getElementById('checkbox-accepted'),
    checkboxExpense = document.getElementById('checkbox-expense'),
    me = new I(),
    company = new Company(),
    appId = 'odhmjbnlbbmepdhbdhpfjnhngniadfoo',
    users = [],
    port = chrome.extension.connect({name: "connection with background"}),
    // task is global variable. Redo it
    task = null,
    editableGrid = null,
    globalAllOrders = null,
    globalPotentialOrders = null,
    loginButton = document.getElementById('loginButton'),
    closeButton = document.getElementById('close-button'),
    logoutButton = document.getElementById('logout-button'),
    content = document.getElementById('content'),
    TASK_ACL = {
      MODIFY_ACCEPTED: 'modify_accepted', //user can request "Accept Task" (setting or removing accept flag)',
      MODIFY_RESOLVER: 'modify_resolver', //user can change "Resolver" (setting or removing resolver of the task)',
      MODIFY_BUDGETS: 'modify_budgets', //user can add/remove orders to task, change budget',
      SHOW_BUDGETS: 'show_budgets', //user can see orders connected to the task',
      SHOW_ISSUES: 'show_issues', //user can see list of tasks (also - list of teams, users)',
      SHOW_AGGREGATED_INFO: 'show_aggregated_info', //user can see tocat data (budget, resolver, orders) of the task',
      CAN_REQUEST_REVIEW: 'can_request_review', //user can request review of the task',
      CAN_REVIEW_TASK: 'can_review_task', //user can review the task',
      SET_EXPENSES: 'set_expenses', //user can set "expenses" flag of the task',
      REMOVE_EXPENSES: 'remove_expenses' //user can remove "expenses" flag of the task'
    },
    globalReceivedACL = [];

  /**
   * save protocol and domain in localStorage
   */
  function saveDomain() {
    getCurrentUrl().then(function(url){
      var domain,
        protocol,
        full;

      domain = TOCAT_TOOLS.getDomainFromUrl(url);
      protocol = TOCAT_TOOLS.getProtocolFromUrl(url);
      full = protocol + '://' + domain;

      TOCAT_TOOLS.saveDomain(full);
    });
  }

  function setVersion() {
    var manifest = chrome.runtime.getManifest(),
      version = manifest.version,
      place = document.getElementById('version-place');

    place.innerHTML = version;
  }

  function showLoginButton() {
    loginButton.classList.remove('hidden');
  }

  function hideLoginButton() {
    loginButton.classList.add('hidden');
  }

  function showContent() {
    content.classList.remove('hidden');
  }

  function hideContent() {
    content.classList.add('hidden');
    loginButton.classList.remove('hidden');
  }

  function hideSpinner() {
    var spinner = document.getElementById('spinner');
    spinner.classList.add('hidden');
  }

  function updateAllOrders() {
    getAllOrders().then(function(data) {
        globalAllOrders = adjustArrayOfObject(data, 'id')
    }, errorCather);
  }

  function addAuthError(errorMessage) {
    errorCather(errorMessage);
  }

  /**
   * Show text under table with orders
   * @param text
   */
  function showOrderText(text) {
    var orderText = document.getElementById('orders-text');
    orderText.innerHTML = text;
  }

  /**
   * Transform array with objects to object
   * where key is property and value is object
   * @param array
   * @param property
   * @returns {*}
   */
  function adjustArrayOfObject(array, property) {
    if (!array.length) {
      return array;
    }

    if (!array[0].hasOwnProperty(property)) {
      console.error('Array does not have property with name ' + property.toString());
      return;
    }

    var result = {};
    for (var i = 0 ; i < array.length ; i++) {
      result[array[i][property]] = array[i];
    }

    return result;
  }

  /**
   * Show alert with message
   * @param data
   */
  function errorCather(data) {
    bootbox.alert(JSON.stringify(data), function() {

    });
  }

  function hideTable() {
    document.getElementById('tablecontent').innerHTML = '';
  }

  function showErrors(errors) {
    if (errors && errors.length) {
      bootbox.alert(JSON.stringify(errors.join('\n')), function() {

      });
    }
  }

  /**
   * Show message with text Saved in top right corner
   * @param message
   */
  function showInformation(message) {
    console.log('showInformation message', message);
    var documentBox = $('#save-message');
    documentBox.show();
    setTimeout(function(){ documentBox.fadeOut('slow') }, 1600);
  }

  /**
   * HtmlOptionObjest with selected resolver
   * @returns {*}
   */
  function getSelectedResolverHtmlObject() {
    // use returned object to get value of selected option via selectedResolver.value
    // or via selectedResolver.text get text of it.
    return selectResolver.options[selectResolver.selectedIndex];
  }

  /**
   *
   * @param userId
   * @returns {Promise}
   */
  function getPotentialOrders(userId) {
    if (!parseInt(userId, 10)) {
      return Promise.resolve([]);
    }

    if (!userId) {
      console.error({message: 'empty userId'});
      return Promise.reject();
    }

    return new Promise(function(resolve, reject) {
      TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/user/' + userId).then(function(data) {
        TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/orders?limit=9999999&search=team==' + data.tocat_team.name + ' completed = 0&sorted_by=name')
          .then(function (data){
            resolve(data);
          }, errorCather);
      }, function(err) {
        reject(err);
      });
    });
  }

  /**
   *
   * @returns {*}
   */
  function getACL(){
    return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/acl').then(function(AClList) {
      globalReceivedACL = AClList;
      console.log('AClList ', AClList);
      // globalReceivedACL = ['modify_accepted','modify_resolver','modify_budgets','show_budgets','show_issues','show_aggregated_info','can_request_review','can_review_task','set_expenses','remove_expenses'];
    });
  }

  /**
   *
   * @param accessString
   * @returns {number|Number}
   */
  function checkAccessControl(accessString) {
    if (!accessString) {
      console.error('accessString is empty');
      return;
    }

    return globalReceivedACL.indexOf(accessString) + 1;
  }

  /**
   *
   * @param orderId
   * @returns {Promise}
   */
  function getPotentialResolvers(orderId) {
    if (!orderId) {
      console.error({message: 'empty orderId'});
      return Promise.reject();
    }

    return getOrder(orderId).then(function(order) {
      return company.getAllDevelopers(order.team.name);
    });
  }

  function createNewTask() {
    return new Promise(function(resolve, reject) {
      getCurrentUrl().then(function(data) {
        TOCAT_TOOLS.postJSON(TOCAT_TOOLS.urlTocat + '/tasks', {
          external_id: data
        }).then(function(data) {
          resolve(data);
        }, function(err) {
          reject(err);
        })
      });
    });
  }

  /**
   *
   * @returns {*}
   */
  function getAuthUrl() {
    return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/authenticate')
  }

  /**
   *
   * @param task
   * @returns {*}
   */
  function setAcceptStatus(task) {
    return TOCAT_TOOLS.postJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/accept');
  }

  /**
   *
   * @param task
   * @returns {*}
   */
  function rmAcceptStatus(task) {
    return TOCAT_TOOLS.deleteJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/accept');
  }

  /**
   * setter for budget
   * @param value
   */
  function setBudgetOfTask(value) {
    var budgetPlace  = document.getElementById('budget');
    budgetPlace.innerHTML = value;
  }

  function setPaidStatusOfTask(value) {
    var textPaid = document.getElementById('text-paid');
    textPaid.innerHTML = value ? 'Yes' : 'No';
  }

  function setAcceptedStatusOfTask(value) {
    var checkboxAccepted = document.getElementById('checkbox-accepted');
    checkboxAccepted.checked = value;

    if (checkAccessControl(TASK_ACL.MODIFY_ACCEPTED)) {
      checkboxAccepted.disabled = false;
    } else {
      checkboxAccepted.disabled = true;
    }
  }

  function disableSelectResolverBox() {
    selectResolver.disabled = true;
  }

  function enableSelectResolverBox() {
    selectResolver.disabled = false;
  }

  function disableSelectOrderEditability() {
    if (editableGrid) {
      editableGrid.columns[0].editable = false;
    }
  }

  function enableSelectOrderEditability() {
    if (editableGrid) {
      editableGrid.columns[0].editable = true;
    }
  }

  function disableTicketBudgetEditability() {
    if (editableGrid) {
      editableGrid.columns[2].editable = false;
    }
  }

  function enableTicketBudgetEditability() {
    if (editableGrid) {
      editableGrid.columns[2].editable = true;
    }
  }

  function disableAddButton() {
    addOrderBtn.disabled = true;
  }

  function enableAddButton() {
    addOrderBtn.disabled = false;
  }

  function checkPermission() {
    if (!_.isEmpty(task)) {
      if (task.expenses) {
        disableAddButton();
        disableSelectResolverBox();
        disableSelectOrderEditability();
        disableTicketBudgetEditability();
      } else {
        if (checkAccessControl(TASK_ACL.MODIFY_BUDGETS) && checkAccessControl(TASK_ACL.MODIFY_RESOLVER)) {
          enableAddButton();
          enableSelectResolverBox();
          enableSelectOrderEditability();
          enableTicketBudgetEditability();
        }
      }
    }
  }

  function setExpenseStatusOfTask(value) {
    var checkboxExpense = document.getElementById('checkbox-expense');
    checkboxExpense.checked = value;
  }

  function setResolverOfTask(value) {
    var selectBox = document.getElementById('selectResolver');
    selectBox.value = value;
  }

  /**
   *
   * @param resolverId
   * @returns {*}
   */
  function addResolver(resolverId) {
    return TOCAT_TOOLS.postJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/resolver', {
      "user_id": resolverId
    });
  }

  function rmResolver() {
    return TOCAT_TOOLS.deleteJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/resolver');
  }

  function setExpensesStatus(task) {
    return TOCAT_TOOLS.postJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/expenses').then(function () {
      task.expenses = true;
    }, function (err) {
      checkboxExpense.checked = false;
      errorCather(err);
    });
  }

  function rmExpensesStatus(task) {
    return TOCAT_TOOLS.deleteJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/expenses').then(function () {
      task.expenses = false;
    });
  }

  /**
   *
   * @returns {*}
   */
  var getAllOrders = (function() {
    var storedOrders = [];
    return function() {
      if (!storedOrders.length) {
        return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/orders?limit=9999999&search=completed = 0 free_budget>0&sort=name').then(function(data){
          storedOrders = data;
          return data;
        });
      } else {
        return Promise.resolve(storedOrders);
      }
    }
  })();

  /**
   *
   * @param orderId
   * @returns {*}
   */
  function getOrder(orderId) {
    if (typeof(orderId) === 'string') {
      orderId = orderId.split("'")[1];
    }
    return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/order/' + orderId);
  }

  /**
   * Remove order with id from array of all orders
   * @param id
   * @returns {*}
   */
  function rmOrderToTask(id, orders) {
    var results = orders;
    for (var i = 0 ; i < results.length ; i++) {
      if (results[i].order_id == id) {
        results.splice(i, 1);
      }
    }

    return results;
  }

  function adjustOrderToTask(order, orders) {
    var results = orders;
    for (var i = 0 ; i < results.length ; i++) {
      if (results[i].order_id == order.order_id) {
        results[i] = order;
        return results;
      }
    }

    results.push(order);
    return results;
  }

  function rmOrder(orderId, task) {
    return new Promise(function(resolve, reject) {
      getBudget(task.id).then(function(receivedBudget) {
        if (receivedBudget.budget) {
          var orders = rmOrderToTask(orderId, receivedBudget.budget);
          setBudget(orders, task.id).then(function(data) {
            resolve(data);
          }, function(err) {
            reject(err);
          });
        } else {
          resolve();
        }
      }, function(err) {
        reject(err);
      })
    });
  }

  function updateOrders(order, task) {
    return new Promise(function(resolve, reject) {
      getBudget(task.id).then(function(receivedBudget) {
        if (receivedBudget.budget) {
          var orders = adjustOrderToTask(order, receivedBudget.budget);
          setBudget(orders, task.id).then(function(data) {
            resolve(data);
          }, function(err) {
            reject(err);
          });
        } else {
          setBudget([order], task.id).then(function(data) {
            resolve(data);
          }, function(err) {
            reject(err);
          });
        }
      }, function(err) {
        reject(err);
      })
    });
  }

  /**
   *
   * @param orders
   * @param taskId
   * @returns {*}
   */
  function setBudget(orders, taskId) {
    return TOCAT_TOOLS.postJSON(TOCAT_TOOLS.urlTocat + '/task/' + taskId + '/budget', {
      budget: orders
    });
  }

  /**
   *
   * @param taskId
   * @returns {Promise}
   */
  function getBudget(taskId) {
    return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/task/' + taskId + '/budget');
  }

  /**
   *
   * @param orderId
   * @returns {Promise}
   */
  function getTicketBudget(orderId, taskId) {
    return new Promise(function(resolve, reject) {
      getBudget(taskId).then(function(data) {
        if (data.budget) {
          for (var i = 0 ; i < data.budget.length ; i++) {
            if (data.budget[i].order_id == orderId) {
              resolve(data.budget[i].budget);
            }
          }
          resolve(0);
        } else {
          resolve(0);
        }
      }, errorCather);
    });
  }

  function refreshTask() {
    return getCurrentTask().then(function(receivedTask) {
      task = receivedTask;
      fillInformationAboutTask(task);
    });
  }

  /**
   *
   * @param allOrders
   * @returns {{}}
   */
  function adjustAllOrders(allOrders) {
    var result = {};
    for (var i = 0 ; i < allOrders.length ; i++) {
      result["'" + allOrders[i].id + "'"] = allOrders[i].name;
    }
    return result;
  }

  /**
   *
   * @param taskOrders
   * @param budget
   * @returns {Array}
   */
  function adjustTaskOrders(taskOrders, budget) {
    var result = [];
    for (var i = 0 ; i < taskOrders.length ; i++) {
      for (var j = 0 ; j < budget.length ; j ++) {
        if (taskOrders[i].id == budget[j].order_id) {
          result.push({
            id: "'" + taskOrders[i].id + "'",
            values: {
              order: "'" + taskOrders[i].id + "'",
              "budget_left": taskOrders[i].free_budget,
              "ticket_budget": budget[j].budget,
              "paid": taskOrders[i].paid
            }
          })
        }
      }
    }

    return result;
  }

  /**
   *
   * @param data
   * @param allOrders
   */
  function renderTable(data, allOrders) {
    // todo: check are you manager
    var metadata = [];
    metadata.push({name: "order", label: "Order", datatype: "string", editable: true});
    metadata.push({name: "budget_left", label: "Budget left", datatype: "integer", editable: false});
    metadata.push({name: "ticket_budget", label: "Ticket budget", datatype: "integer", editable: true});
    metadata.push({name: "paid", label: "Paid", datatype: "boolean", editable: false});
    metadata.push({name: "action", label: "Actions", editable: false, datatype: "html"});
    metadata[0].values = adjustAllOrders(allOrders);

    editableGrid = new EditableGrid("GridJsData", {
      modelChanged: function(rowIdx, colIdx, oldValue, newValue, row) {;
        // ticket budget changed
        if (colIdx === 2) {
          var orderId = editableGrid.getValueAt(rowIdx, 0);
          if (orderId !== 'Select') {
            orderId = parseInt(orderId.split("'")[1]);

            if (globalAllOrders[orderId]) {
              var freeBudget = parseInt(editableGrid.getValueAt(rowIdx, 1), 10),
                oldValue = parseInt(oldValue, 10),
                newValue = parseInt(newValue, 10),
                rest = -1;

              if (oldValue <= freeBudget) {
                rest = freeBudget + oldValue - newValue;
              }

              if (rest >= 0) {
                editableGrid.setValueAt(rowIdx, 1, rest);
              }
            }

            if (!_.isEmpty(task)) {
              updateOrders({
                order_id: parseInt(orderId, 10),
                budget: newValue,
                task_id: task.id
              }, task).then(function(data) {
                refreshTask();
                showInformation('Task has been updated');
                updateAllOrders();
                getCurrentUrl().then(function(data) {
                  TOCAT_TOOLS.updateIcon(data);
                }, errorCather);
              }, function(err) {
                showErrors(err.errors)
              });
            } else {
              createNewTask().then(function(data) {
                refreshTask().then(function() {
                  updateOrders({
                    order_id: parseInt(orderId, 10),
                    budget: newValue,
                    task_id: task.id
                  }, task).then(function() {
                    showInformation('Task has been created');
                    updateAllOrders();
                    getCurrentUrl().then(function(data) {
                      TOCAT_TOOLS.updateIcon(data);
                    }, errorCather);
                  });
                }, errorCather);
              });
            }
          }
        }

        // order changed
        if (colIdx === 0) {
          getPotentialResolvers(newValue).then(function(resolvers) {
            rebuildSelect(resolvers, true);
          });

          getOrder(newValue).then(function(data) {
            editableGrid.setValueAt(rowIdx, 1, data.free_budget);
            editableGrid.setValueAt(rowIdx, 3, data.paid);
          });
          if (!_.isEmpty(task)) {
            getTicketBudget(newValue, task.id).then(function(data) {
              editableGrid.setValueAt(rowIdx, 2, parseInt(data, 10));
            }, errorCather)
          }
        }
      },
      openedCellEditor: function(rowIndex, columnIndex) {
        // select with orders
        if (columnIndex === 0) {
          editableGrid.setEnumProvider("order", new EnumProvider({
            getOptionValuesForEdit: function (grid, column, rowIndex) {
              var selectedValues = editableGrid.getValueAt(rowIndex, columnIndex);
              var options = null;
              if (globalPotentialOrders) {
                options = getAdjustedFreeOrders(editableGrid, globalPotentialOrders, selectedValues);
              } else {
                options = getAdjustedFreeOrders(editableGrid, globalAllOrders, selectedValues);
              }

              return options;
            },
            getOptionValuesForRender: function(grid, column, rowIndex) {
              var adjustedOrders = {};

              if (globalPotentialOrders) {
                for (var prop in globalPotentialOrders) {
                  if (globalPotentialOrders.hasOwnProperty(prop)) {
                    adjustedOrders[globalPotentialOrders[prop].id ] = globalPotentialOrders[prop].name;
                  }
                }
              } else {
                for (var prop in globalAllOrders) {
                  if (globalAllOrders.hasOwnProperty(prop)) {
                    adjustedOrders[globalAllOrders[prop].id] = globalAllOrders[prop].name;
                  }
                }
              }

              return adjustedOrders;
            }
          }));
        }
      }
    });
    editableGrid.load({"metadata": metadata, "data": data});
    editableGrid.setCellRenderer('action', new CellRenderer({render: function(cell, value) {
      var guidId = TOCAT_TOOLS.guidGenerator();

      var disabled = checkAccessControl(TASK_ACL.MODIFY_BUDGETS) ? '' : 'disabled';
      cell.innerHTML = '<span class="pointer" id="' + guidId + '"><button type="button" class="btn btn-sm btn-danger" ' + disabled + '><em class="fa fa-trash"></em></button></span>';
      var deleteButton = document.getElementById(guidId);
      deleteButton.addEventListener('click', function() {
        if (!task.expenses && checkAccessControl(TASK_ACL.MODIFY_BUDGETS)) {
          bootbox.confirm('Are you sure you want to remove order?', function(result) {
            if (result) {
              var orderId = editableGrid.getValueAt(cell.rowIndex, 0);
              // Select means empty order
              if (orderId !== 'Select') {
                orderId = parseInt(orderId.split("'")[1], 10);
                rmOrder(parseInt(orderId, 10), task).then(function() {
                  editableGrid.remove(cell.rowIndex);
                  if (!editableGrid.getTotalRowCount()) {
                    hideTable();
                    showOrderText('No orders yet, please add one');
                  }
                  refreshTask();
                  getCurrentUrl().then(function(data) {
                    TOCAT_TOOLS.updateIcon(data);
                  }, errorCather);
                }, function(err) {
                  showErrors(err.errors);
                });
              } else {
                editableGrid.remove(cell.rowIndex);
                if (!editableGrid.getTotalRowCount()) {
                  hideTable();
                  showOrderText('No orders yet, please add one');
                }
              }
            }
          });
        } else {
          showErrors(["You don't have permission to remove this order"]);
        }
      });

    }}));

    editableGrid.setCellRenderer('paid', new CellRenderer({render: function(cell, value) {
      var text = value ? 'Yes' : 'No';
      cell.innerHTML = text;
    }}));

    editableGrid.setCellRenderer('budget_left', new CellRenderer({render: function(cell, value){
      cell.innerHTML = value;
    }}));

    editableGrid.setCellRenderer('ticket_budget', new CellRenderer({render: function(cell, value) {
      var disabledPointer = checkAccessControl(TASK_ACL.MODIFY_BUDGETS) ? '' : 'disabled-pointer';

      cell.innerHTML = '<div class="' + disabledPointer + '">' + value + '<em class="icon-pencil icon-pencil-format"></em></div>';
    }}));

    editableGrid.setCellRenderer('order', new CellRenderer({render: function(cell, value) {
      var disabledPointer = checkAccessControl(TASK_ACL.MODIFY_BUDGETS) ? '' : 'disabled-pointer';

      if (value === 'Select') {
        cell.innerHTML = '<div class="' + disabledPointer + '">' + value + '<em class="icon-pencil icon-pencil-format mr-5"></em></div>';
        return;
      }

      parsedValue = parseInt(value.split("'")[1], 10);
      if (_.isEmpty(globalPotentialOrders) && globalAllOrders[parsedValue]) {
        cell.innerHTML = '<div class="' + disabledPointer + '">' + globalAllOrders[parsedValue].name + '<em class="icon-pencil icon-pencil-format mr-5"></em></div>';
      }

      if (!_.isEmpty(globalPotentialOrders) && globalPotentialOrders[parsedValue]) {
        cell.innerHTML = '<div class="' + disabledPointer + '">' + globalPotentialOrders[parsedValue].name + '<em class="icon-pencil icon-pencil-format mr-5"></em></div>';
      }
    }}));

    editableGrid.renderGrid("tablecontent", "ordersGrid");

    window.editableGrid = editableGrid;
    // todo: refactor me
    // ugly solution
    var orders = document.getElementsByClassName('editablegrid-order');
    for (var i = 0 ; i < orders.length ; i++) {
      orders[i].click();
    }
    editableGrid.refreshGrid();
  }

  /**
   *
   * @param editableGrid
   * @param notThisId
   * @returns {Array}
   */
  function getAllSelectedValuesWithoutOne(editableGrid, notThisId) {
    var rowCount = editableGrid.getTotalRowCount(),
      results = [];

    for (var i = 0 ; i < rowCount ; i++) {
      var order = editableGrid.getValueAt(i, 0);
      if (order === 'Select') {
        continue;
      }

      if (order == notThisId) {
        continue;
      }

      order = typeof order == "string" ? parseInt(order.split("'")[1], 10) : order;
      results.push(order);
    }

    return results;
  }

  function getFreeOrders(allOrders, usedOrders) {
    var results = $.extend(true, {}, allOrders);
    for (var i = 0 ; i < usedOrders.length ; i++) {
      if (results[usedOrders[i]]) {
        delete results[usedOrders[i]];
      }
    }

    return results;
  }

  function sortObject(obj) {
    var arr = [],
      prop,
      result = {};

    for (prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        arr.push({
          'key': prop,
          'value': obj[prop]
        });
      }
    }
    arr.sort(function(a, b) {
      var x = a.value.toLowerCase();
      var y = b.value.toLowerCase();
      return x < y ? -1 : x > y ? 1 : 0;
    });

    arr.forEach(function(element) {
      result["'" + element.key + "'"] = element.value;
    });

    return result;
  }

  /**
   *
   * @param editableGrid
   * @param allOrders
   * @param notThisId
   * @returns {*}
   */
  function getAdjustedFreeOrders(editableGrid, allOrders, notThisId) {
    var usedOrders = getAllSelectedValuesWithoutOne(editableGrid, notThisId);
    var freeOrders = getFreeOrders(allOrders, usedOrders);
    var adjustedOrders = {}
    for (var prop in freeOrders) {
      if (freeOrders.hasOwnProperty(prop)) {
        adjustedOrders[freeOrders[prop].id] = freeOrders[prop].name;
      }
    }

    adjustedOrders = sortObject(adjustedOrders);
    return adjustedOrders;
  }

  /**
   *
   * @param allOrders
   * @param taskOrders
   * @param budget
   */
  function initTable(allOrders, taskOrders, budget) {
    if (taskOrders.length) {
      var data = adjustTaskOrders(taskOrders, budget);
      renderTable(data, allOrders);
      checkPermission();
      setAccessabilityOfExpenseCheckbox();
      setAccessabilityOfSelectResolver();
      setAccessabilityOfChangeOrders();
    } else {
      showOrderText('No orders yet, please add one');
    }
  }

  /**
   *
   * @param editableGrid
   * @param rowObj
   */
  function appendRowToGrid(editableGrid, rowObj) {
    if (editableGrid && rowObj) {
      editableGrid.append(rowObj.id, {
        order: rowObj.order,
        "budget_left": rowObj.budget_left,
        "ticket_budget": rowObj.ticket_budget,
        "paid": rowObj.paid
      })
    }
  }

  /**
   *
   * @param editableGrid
   */
  function appendEmptyRowToGrid(editableGrid) {
    appendRowToGrid(editableGrid, {
      id: 'new-' + TOCAT_TOOLS.guidGenerator(),
      order: 'Select',
      budget_left: 0,
      ticket_budget: 0,
      paid: false
    })
  }

  /**
   * change select box with resolvers according to users
   * @param users
   * @param flagSelected
   */
  function rebuildSelect(users, flagSelected, selectedValue) {
    // store my team in global var an then check it
    var optGroupMy = document.createElement('OPTGROUP'),
      optGroupNotMy = document.createElement('OPTGROUP');
      selectResolver = document.getElementById('selectResolver'),
      counterOfArguments = arguments.length,
      oldValue = selectResolver.value;

    optGroupMy.label = 'My Team';
    optGroupNotMy.label = 'Other Users';

    if (checkAccessControl(TASK_ACL.MODIFY_RESOLVER)) {
      me.getMyTeam().then(function(myTeam) {
        var otherUsers = _.differenceWith(users, myTeam, function(user, myTeamPlayer) {
          return user.id === myTeamPlayer.id;
        });
        otherUsers = _.sortBy(otherUsers, 'name');
        myTeam = _.sortBy(myTeam, 'name');

        // todo: refactor me
        // rm all inside select
        selectResolver.options.length=0;
        var ogl=selectResolver.getElementsByTagName('optgroup');
        for (var i = ogl.length-1 ; i >= 0 ; i-- ){
          selectResolver.removeChild(ogl[i])
        }

        selectResolver.options.add(new Option('select', 0));
        if (myTeam.length) {
          selectResolver.appendChild(optGroupMy);
        }
        for (var i = 0; i < myTeam.length ; i++) {
          optGroupMy.appendChild(new Option(myTeam[i].name, myTeam[i].id));
        }

        if (otherUsers.length) {
          selectResolver.appendChild(optGroupNotMy);
        }
        for (var j = 0; j < otherUsers.length ; j++) {
          optGroupNotMy.appendChild(new Option(otherUsers[j].name, otherUsers[j].id));
        }

        // selectedValue was passed
        if (counterOfArguments === 3) {
          selectedValue = selectedValue || 0;
          selectResolver.value = selectedValue;
          return;
        }

        if (flagSelected) {
          selectResolver.value = oldValue;
        }

      }, errorCather);
    } else {
      selectResolver.options.add(new Option('select', 0));
      for (var i = 0; i < users.length ; i++) {
        selectResolver.options.add(new Option(users[i].name, users[i].id));
      }

      if (flagSelected) {
        selectResolver.value = oldValue;
      }
    }
  }

  function setAccessabilityOfSelectResolver() {
    if (checkAccessControl(TASK_ACL.MODIFY_RESOLVER)) {
      selectResolver.disabled = false;
    } else {
      selectResolver.disabled = true;
    }
  }

  function setAccessabilityOfChangeOrders() {
    if (!checkAccessControl(TASK_ACL.MODIFY_BUDGETS)) {
      disableAddButton();
      disableSelectResolverBox();
      disableSelectOrderEditability();
      disableTicketBudgetEditability();
    } else {
      enableAddButton();
      enableSelectResolverBox();
      enableSelectOrderEditability();
      enableTicketBudgetEditability();
    }
  }

  function setAccessabilityOfOrders() {
    var ordersWrapper = document.getElementById('content-wrapper');
    if (checkAccessControl(TASK_ACL.SHOW_BUDGETS)) {
      ordersWrapper.style.display = '';
    } else {
      ordersWrapper.style.display = 'none';
    }
  }

  function setAccessabilityOfAcceptedCheckbox() {
    if (checkAccessControl(TASK_ACL.MODIFY_ACCEPTED)) {
      checkboxAccepted.disabled = false;
    } else {
      checkboxAccepted.disabled = true;
    }
  }

  function setAccessabilityOfExpenseCheckbox() {
    checkboxExpense.disabled = true;

    if (checkAccessControl(TASK_ACL.REMOVE_EXPENSES) && checkAccessControl(TASK_ACL.SET_EXPENSES)) {
      checkboxExpense.disabled = false;
    }

    if (checkboxExpense.checked && checkAccessControl(TASK_ACL.REMOVE_EXPENSES)) {
      checkboxExpense.disabled = false;
    }

    if (!checkboxExpense.checked && !!checkAccessControl(TASK_ACL.SET_EXPENSES)) {
      checkboxExpense.disabled = false;
    }
  }

  /**
   * information in header of extension
   * @param task
   */
  function fillInformationAboutTask(task) {
    setBudgetOfTask(task.budget);
    setPaidStatusOfTask(task.paid);
    setAcceptedStatusOfTask(task.accepted);
    setExpenseStatusOfTask(task.expenses);

    if (task.resolver && task.resolver.id) {
      setResolverOfTask(task.resolver.id);
    }
  }


  function updateTask() {
    getCurrentTask().then(function(receivedTask) {
      task = receivedTask;
      if (!_.isEmpty(receivedTask)) {
        fillInformationAboutTask(task);
        setAccessabilityOfExpenseCheckbox();

        // todo: redo it
        // fix on fix
        if (task && task.resolver && task.resolver.id) {
          if (checkAccessControl(TASK_ACL.MODIFY_BUDGETS)) {
            getPotentialOrders(task.resolver.id).then(function(data) {
              globalPotentialOrders = adjustArrayOfObject(data, 'id');
              if (checkAccessControl(TASK_ACL.MODIFY_BUDGETS)) {
                Promise.all([getAllOrders(), getBudget(task.id)]).then(function(data) {
                  initTable(data[0], task.orders, data[1].budget);
                }, errorCather);
              }
            });
          }
        } else {
          if (checkAccessControl(TASK_ACL.MODIFY_BUDGETS)) {
            Promise.all([getAllOrders(), getBudget(task.id)]).then(function (data) {
              initTable(data[0], task.orders, data[1].budget);
            }, errorCather);
          }
        }
      } else {
        // task with external_id does not exist
      }
    });
  }

  function init() {
    updateTask();
  }

  /**
   * Get url of current opened tab
   * @returns {Promise}
   */
  function getCurrentUrl() {
    return new Promise(function(resolve, reject) {
      chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
        resolve(tabs[0].url);
      });
    });
  }

  /**
   * Get task which associated with current url
   * @returns {Promise.<T>}
   */
  function getCurrentTask() {
    return getCurrentUrl().then(function(data) {
      return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/tasks/?search=external_id=' + data).then(function(data) {
        if (data.length) {
          rebuildSelect(data[0].potential_resolvers, true, data[0].resolver.id);
          return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/task/' + data[0].id).then(function(receivedTask) {
            return receivedTask;
          });
        } else {
          return company.getAllDevelopers().then(function(data) {
            rebuildSelect(data);
            showOrderText('No orders yet, please add one');
            return {};
          });
        }
      })
    })
  }

  function renderContent() {
    init();
    if (checkAccessControl(TASK_ACL.MODIFY_BUDGETS)) {
      updateAllOrders();
    }

    addOrderBtn.addEventListener('click', function() {
      if (editableGrid) {
        var numberRows = editableGrid.getRowCount();
          if (!numberRows) {
            // hide additional text
            showOrderText('');
          }

          for (var i = 0 ; i < numberRows ; i++) {
            if (editableGrid.getValueAt(i, 0) !== 'Select') {
              getOrder(editableGrid.getValueAt(i, 0)).then(function(order) {
                TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/orders?search=team==' + order.team.name + ' completed != 1')
                  .then(function (data){
                    globalPotentialOrders = adjustArrayOfObject(data, 'id');
                  }, errorCather);
              }, errorCather);
            }
          }
        appendEmptyRowToGrid(editableGrid);
      } else {
        // hide additional text
        showOrderText('');

        if (selectResolver.value == 0) {
          getAllOrders().then(function(allOrders) {
            globalPotentialOrders = adjustArrayOfObject(allOrders, 'id');
            renderTable([], allOrders);
            appendEmptyRowToGrid(editableGrid);
          }, errorCather);
        } else {
          getPotentialOrders(selectResolver.value).then(function(data) {
            globalPotentialOrders = adjustArrayOfObject(data, 'id');
            renderTable([], data);
            appendEmptyRowToGrid(editableGrid);
          }, errorCather)
        }
      }
    });

    selectResolver.addEventListener('change', function() {
      var selectedResolver = getSelectedResolverHtmlObject();
      // id of resolver - selectedResolver.value
      if ( _.isEmpty(task)) {
        createNewTask().then(function(data) {
          task = data;
          if (parseInt(selectedResolver.value, 10)) {
            addResolver(parseInt(selectedResolver.value, 10));
          }
          showInformation('The new task has been created');
          // maybe rm it from here
          chrome.browserAction.setBadgeText({text: '—'});
        }, errorCather);
        return;
      }

      if (parseInt(selectedResolver.value, 10)) {
        addResolver(parseInt(selectedResolver.value, 10)).then(function() {
          showInformation('set other resolver for task');
        }, errorCather);
        getPotentialOrders(selectedResolver.value).then(function(data) {
          globalPotentialOrders = adjustArrayOfObject(data, 'id');
        }, errorCather);
      } else {
        // value 0 means rm resolver
        rmResolver().then(function() {
          showInformation('rm resolver');
        }, errorCather);
        globalPotentialOrders = null;
      }
    });

    checkboxAccepted.addEventListener('change', function() {
      if (_.isEmpty(task)) {
        createNewTask().then(function(data) {
          task = data;
          if (checkboxAccepted.checked) {
            setAcceptStatus(data);
          } else {
            rmAcceptStatus(data);
          }
          showInformation('The new task has been created');
        }, errorCather);
      } else {
        if (checkboxAccepted.checked) {
          setAcceptStatus(task);
        } else {
          rmAcceptStatus(task);
        }
        showInformation('The new task has been created');
      }
    });

    checkboxExpense.addEventListener('change', function() {
      if (_.isEmpty(task)) {
        createNewTask().then(function(data) {
          task = data;
          if (checkboxExpense.checked) {
            setExpensesStatus(data);
            setAccessabilityOfExpenseCheckbox();
          } else {
            rmExpensesStatus(data);
            setAccessabilityOfExpenseCheckbox();
          }
          showInformation('The new task has been created');
        }, errorCather);
      } else {
        if (checkboxExpense.checked) {
          setExpensesStatus(task).then(function() {
            checkPermission();
            setAccessabilityOfExpenseCheckbox();
          });
        } else {
          rmExpensesStatus(task).then(function() {
            checkPermission();
            setAccessabilityOfExpenseCheckbox();
          });
        }
        showInformation('The new task has been created');
      }
    });

    getCurrentUrl().then(function(data) {
      TOCAT_TOOLS.updateIcon(data);
    });
  }

  port.postMessage({
    name: 'getToken'
  });
  saveDomain();

  port.onMessage.addListener(function(msg) {
    switch (msg.name) {
      case 'getToken':
        if (msg.token) {
          TOCAT_TOOLS.setTokenHeader(msg.token);
          // me.getOrdersOfMyTeam();
          getACL().then(function () {
            if (checkAccessControl(TASK_ACL.SHOW_AGGREGATED_INFO)) {
              renderContent();
              setAccessabilityOfOrders();
              setAccessabilityOfExpenseCheckbox();
              setAccessabilityOfSelectResolver();
              setAccessabilityOfAcceptedCheckbox();
              showContent();
              setVersion();
            } else {
              document.body.style.height = '200px';
              showErrors(["you don't have permission"]);
            }
          }, function() {
            document.body.style.height = '200px';
            showErrors(["you don't have permission"]);
          });
        } else {
          hideSpinner();
          showLoginButton();
        }
      default:
        break;
    }
  });

  loginButton.addEventListener('click', function() {
    getAuthUrl().then(function(data) {
      hideLoginButton();

      port.postMessage({
        name: 'initAuth',
        url: data.url
      });

      port.postMessage({
        name: 'getToken'
      });
    }, errorCather);
  });

  closeButton.addEventListener('click', function() {
    window.close();
  });

  logoutButton.addEventListener('click', function() {
    localStorage.tocatToken = '';
    hideContent();
    chrome.browserAction.setBadgeText({text: ''});
    me.logOut();
    company.logOut();
    port.postMessage({
      name: 'getToken'
    });
  });

});