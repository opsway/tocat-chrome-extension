document.addEventListener('DOMContentLoaded', function() {
  var addOrderBtn = document.getElementById('add-order-btn'),
    createNewOrder = document.getElementById('create-new-order-btn'),
    selectResolver = document.getElementById('selectResolver'),
    checkboxAccepted = document.getElementById('checkbox-accepted'),
    users = [],
    bkg = chrome.extension.getBackgroundPage(),
    port = chrome.extension.connect({name: "connection with background"}),
    url = null,
    // task is global variable. Redo it
    task = null,
    editableGrid = null,
    globalAllOrders = null,
    globalPotentialOrders = null,
    loginButton = document.getElementById('loginButton'),
    content = document.getElementById('content');

  function showLoginButton() {
    loginButton.classList.remove('hide');
  }

  function hideLoginButton() {
    loginButton.classList.add('hide');
  }

  function showContent() {
    content.classList.remove('hide');
  }

  function hideContent() {
    content.classList.add('hide');
  }

  function hideSpinner() {
    var spinner = document.getElementById('spinner');
    spinner.classList.add('hide');
  }

  function updateAllOrders() {
    getAllOrders().then(function(data) {
      globalAllOrders = adjustArrayOfObject(data, 'id')
    }, errorCather);
  }

  function addAuthError(errorMessage) {
    var authError = document.getElementById('auth-error');
    authError.innerHTML = errorMessage;
  }

  /**
   *
   * @param text
   */
  function showOrderText(text) {
    var orderText = document.getElementById('orders-text');
    orderText.innerHTML = text;
  }

  /**
   *
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
   * temporary solution
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
        TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/orders?search=team==' + data.tocat_team.name + ' completed != 1')
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
   * @param orderId
   * @returns {Promise}
   */
  function getPotentialResolvers(orderId) {
    if (!orderId) {
      console.error({message: 'empty orderId'});
      return Promise.reject();
    }

    return new Promise(function(resolve, reject) {
      TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/order/' + orderId).then(function(order) {
        TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/users?search=role=Developer team=' + order.team.name)
          .then(function (data){
            resolve(data);
          }, errorCather);
      }, function(err) {
        reject(err);
      })
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
   * @param googleToken
   * @returns {*}
   */
  function getTocatToken(googleToken) {
    return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/authenticate?code=' + googleToken);
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
    var checkboxPaid = document.getElementById('checkbox-paid');
    checkboxPaid.checked = value;
  }

  function setAcceptedStatusOfTask(value) {
    var checkboxAccepted = document.getElementById('checkbox-accepted');
    checkboxAccepted.checked = value;
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
    TOCAT_TOOLS.deleteJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/resolver');
  }

  /**
   *
   * @returns {*}
   */
  function getAllOrders() {
    return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/orders?search=completed != 1');
  }

  /**
   *
   * @returns {*}
   */
  function getAllDevelopers() {
    return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/users?search=role%20!=%20Manager');
  }

  /**
   *
   * @param orderId
   * @returns {*}
   */
  function getOrder(orderId) {
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
        console.log('budget ', data);
        console.log('orderId ', orderId);
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
      result[allOrders[i].id] = allOrders[i].name;
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
            id: taskOrders[i].id,
            values: {
              order: taskOrders[i].id,
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
            if (!TOCAT_TOOLS.isEmptyObject(task)) {
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
          });
          if (!TOCAT_TOOLS.isEmptyObject(task)) {
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

              console.log('edit options in getOptionValuesForEdit', options);
              return options;
            },
            getOptionValuesForRender: function(grid, column, rowIndex) {
              var adjustedOrders = {};

              console.log('globalPotentialOrders in getOptionValuesForRender', globalPotentialOrders);
              if (globalPotentialOrders) {
                for (var prop in globalPotentialOrders) {
                  if (globalPotentialOrders.hasOwnProperty(prop)) {
                    adjustedOrders[globalPotentialOrders[prop].id] = globalPotentialOrders[prop].name;
                  }
                }
              } else {
                for (var prop in globalAllOrders) {
                  if (globalAllOrders.hasOwnProperty(prop)) {
                    adjustedOrders[globalAllOrders[prop].id] = globalAllOrders[prop].name;
                  }
                }
              }

              console.log('adjustedOrders in getOptionValuesForRender', adjustedOrders);
              return adjustedOrders;
            }
          }));
        }
      }
    });
    editableGrid.load({"metadata": metadata, "data": data});
    editableGrid.setCellRenderer('action', new CellRenderer({render: function(cell, value) {
      var guidId = TOCAT_TOOLS.guidGenerator();

      cell.innerHTML = '<span class="pointer" id="' + guidId + '"><button type="button" class="btn btn-sm btn-danger"><em class="fa fa-trash"></em></button></span>';
      var deleteButton = document.getElementById(guidId);
      deleteButton.addEventListener('click', function() {
        bootbox.confirm('Are you sure you want to remove order?', function(result) {
          if (result) {
            var orderId = editableGrid.getValueAt(cell.rowIndex, 0);
            // Select means empty order
            if (orderId !== 'Select') {
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
      });

    }}));

    editableGrid.setCellRenderer('paid', new CellRenderer({render: function(cell, value) {
      var text = value ? 'Yes' : 'No';
      cell.innerHTML = text;
    }}));

    editableGrid.setCellRenderer('ticket_budget', new CellRenderer({render: function(cell, value) {
      cell.innerHTML = value + '<em class="icon-pencil icon-pencil-format"></em>';
    }}));

    editableGrid.renderGrid("tablecontent", "ordersGrid");
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
    var rowCount = editableGrid.getTotalRowCount();
    var results = [];

    for (var i = 0 ; i < rowCount ; i++) {
      var order = editableGrid.getValueAt(i, 0);
      if (order === 'Select') {
        continue;
      }

      if (parseInt(order, 10) == parseInt(notThisId, 10)) {
        continue;
      }

      results.push(parseInt(editableGrid.getValueAt(i, 0)));
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

  /**
   *
   * @param editableGrid
   * @param allOrders
   * @param notThisId
   * @returns {*}
   */
  function getAdjustedFreeOrders(editableGrid, allOrders, notThisId) {
    var usedOrders = getAllSelectedValuesWithoutOne(editableGrid, notThisId);
    console.log('all selected values without one', usedOrders);
    var freeOrders = getFreeOrders(allOrders, usedOrders);
    console.log('all free values', freeOrders);
    var adjustedOrders = {}
    for (var prop in freeOrders) {
      if (freeOrders.hasOwnProperty(prop)) {
        adjustedOrders[freeOrders[prop].id] = freeOrders[prop].name;
      }
    }
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
   */
  function rebuildSelect(users, flagSelected) {
    var selectResolver = document.getElementById('selectResolver');
    var oldValue = selectResolver.value;

    selectResolver.options.length = 0;

    selectResolver.options.add(new Option('select', 0));
    for (var i = 0; i < users.length ; i++) {
        selectResolver.options.add(new Option(users[i].name, users[i].id));
    }

    if (flagSelected) {
      selectResolver.value = oldValue;
    }
  }

  /**
   * information in header of extension
   * @param task
   */
  function fillInformationAboutTask(task) {
    setBudgetOfTask(task.budget);
    setPaidStatusOfTask(task.paid);
    setAcceptedStatusOfTask(task.accepted)
    if (task.resolver && task.resolver.id) {
      setResolverOfTask(task.resolver.id);
    }
  }


  function updateTask() {
    getCurrentTask().then(function(receivedTask) {
      task = receivedTask;
      if (!TOCAT_TOOLS.isEmptyObject(receivedTask)) {
        fillInformationAboutTask(task);

        // todo: redo it
        // fix on fix
        if (task && task.resolver && task.resolver.id) {
          getPotentialOrders(task.resolver.id).then(function(data) {
            globalPotentialOrders = adjustArrayOfObject(data, 'id');
            Promise.all([getAllOrders(), getBudget(task.id)]).then(function(data) {
              initTable(data[0], task.orders, data[1].budget);
            }, errorCather);
          })
        } else {
          Promise.all([getAllOrders(), getBudget(task.id)]).then(function(data) {
            initTable(data[0], task.orders, data[1].budget);
          }, errorCather);
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
      chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
        resolve(tabs[0].url.split('?')[0]);
      });
    });
  }

  /**
   * Get task which associated with current url
   * @returns {Promise.<T>}
   */
  function getCurrentTask() {
    return new Promise(function(resolve, reject) {
      getCurrentUrl().then(function(data) {
        TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/tasks/?search=external_id=' + data).then(function(data) {
          console.log('Current task ', data);
          if (data.length) {
            // todo: rm it from here
            rebuildSelect(data[0].potential_resolvers);
            TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/task/' + data[0].id).then(function(receivedTask) {
              resolve(receivedTask);
            });
          } else {
            // todo: rm it from here
            getAllDevelopers().then(function(data) {
              rebuildSelect(data);
              resolve({});
            }, function(err) {
              reject(err);
            });
            // show text before orders
            showOrderText('No orders yet, please add one');
          }
        }, function(err) {
          reject(err);
        })
      });
    });
  }

  function renderContent() {
    init();
    updateAllOrders();

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
      if (!task || TOCAT_TOOLS.isEmptyObject(task)) {
        createNewTask().then(function(data) {
          task = data;
          if (parseInt(selectedResolver.value, 10)) {
            addResolver(parseInt(selectedResolver.value, 10));
          }
          showInformation('The new task has been created');
          // maybe rm it from here
          chrome.browserAction.setBadgeText({text: '0'});
        }, errorCather);
      }

      if (parseInt(selectedResolver.value, 10)) {
        addResolver(parseInt(selectedResolver.value, 10));
        getPotentialOrders(selectedResolver.value).then(function(data) {
          globalPotentialOrders = adjustArrayOfObject(data, 'id');
        }, errorCather);
      } else {
        // value 0 means rm resolver
        rmResolver();
        globalPotentialOrders = null;
        console.log('globalPotentialOrders ', globalPotentialOrders);
      }
    });

    checkboxAccepted.addEventListener('change', function() {
      if (TOCAT_TOOLS.isEmptyObject(task)) {
        createNewTask().then(function(data) {
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

    getCurrentUrl().then(function(data) {
      TOCAT_TOOLS.updateIcon(data);
    });
  }

  port.postMessage({
    name: 'getToken'
  });

  port.onMessage.addListener(function(msg) {
    switch (msg.name) {
      case 'getToken':
        if (msg.token) {
          TOCAT_TOOLS.setTokenHeader(msg.token);
          renderContent();
          showContent();
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

      chrome.identity.launchWebAuthFlow(
        {'url': data.url, 'interactive': true},
        function(redirect_url) {
          // todo: check redirect_url
          if (!chrome.runtime.lastError) {
            if (redirect_url) {
              var message = redirect_url.split('#')[1];
              var authToken = message.split('=')[1];

              port.postMessage({
                name: 'setToken',
                token: authToken
              });

              port.postMessage({
                name: 'getToken'
              });

            } else {
              addAuthError('Authorization failed');
              chrome.identity.launchWebAuthFlow(
                { 'url': 'https://accounts.google.com/logout' },
                function() {}
              );
            }
          } else {
            addAuthError('Authorization failed');
            chrome.identity.launchWebAuthFlow(
              { 'url': 'https://accounts.google.com/logout' },
              function() {}
            );
          }
      });

    }, errorCather);
  });

});