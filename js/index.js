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
    globalAllOrders = null;

  function updateAllOrders() {
    getAllOrders().then(function(data) {
      globalAllOrders = adjustArrayOfObject(data, 'id')
    }, errorCather);
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
    alert(JSON.stringify(data));
  }

  function hideTable() {
    document.getElementById('tablecontent').innerHTML = '';
  }

  function showErrors(errors) {
    var placeForError = document.getElementById('error-message-block');
    if (errors && errors.length) {
      placeForError.innerHTML = errors.join('\n');
    }
  }

  function showInformation(message) {
    var placeForError = document.getElementById('error-message-block');
    placeForError.innerHTML = message;
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
    return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/orders');
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
    metadata.push({name: "action", label: "Actions", editable: false});
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
                  });
                }, errorCather);
              });
            }
          }
        }

        // order changed
        if (colIdx === 0) {
          editableGrid.setValueAt(rowIdx, 2, 0);
          getOrder(newValue).then(function(data) {
            editableGrid.setValueAt(rowIdx, 1, data.free_budget);
          });
        }
      },
      openedCellEditor: function(rowIndex, columnIndex) {
        // select with orders
        if (columnIndex === 0) {
          editableGrid.setEnumProvider("order", new EnumProvider({
            getOptionValuesForEdit: function (grid, column, rowIndex) {
              var selectedValues = editableGrid.getValueAt(rowIndex, columnIndex);
              var options = getAdjustedFreeOrders(editableGrid, globalAllOrders, selectedValues);
              return options;
            },
          }));
        }
      },
      rowRemoved: function() {
        updateAllOrders();
      }
    });
    editableGrid.load({"metadata": metadata, "data": data});
    editableGrid.setCellRenderer('action', new CellRenderer({render: function(cell, value) {
      var guidId = TOCAT_TOOLS.guidGenerator();

      cell.innerHTML = '<span class="pointer" id="' + guidId + '"><img src="delete.png" border="0" alt="delete" title="delete"/></span>';
      var deleteButton = document.getElementById(guidId);
      deleteButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to remove order?')) {
          var orderId = editableGrid.getValueAt(cell.rowIndex, 0);
          // Select means empty order
          if (orderId !== 'Select') {
            rmOrder(parseInt(orderId, 10), task).then(function() {
              editableGrid.remove(cell.rowIndex);
              if (!editableGrid.getTotalRowCount()) {
                hideTable();
              }
              refreshTask();
            }, function(err) {
              showErrors(err.errors);
            });
          } else {
            editableGrid.remove(cell.rowIndex);
            if (!editableGrid.getTotalRowCount()) {
              hideTable();
            }
          }
        }
      });

    }}));
    editableGrid.renderGrid("tablecontent", "ordersGrid");

    // todo: rm its
    window.editableGrid = editableGrid;
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
    var freeOrders = getFreeOrders(allOrders, usedOrders);
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
  function rebuildSelect(users) {
    var selectResolver = document.getElementById('selectResolver');
    selectResolver.options.length = 0;

    selectResolver.options.add(new Option('select', 0));
    for (var i = 0; i < users.length ; i++) {
        selectResolver.options.add(new Option(users[i].name, users[i].id));
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
        Promise.all([getAllOrders(), getBudget(task.id)]).then(function(data) {
          initTable(data[0], task.orders, data[1].budget);
        }, errorCather);
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
          if (data.length) {
            // todo: rm it from here
            rebuildSelect(data[0].potential_resolvers);
            TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/task/' + data[0].id).then(function(receivedTask) {
              resolve(receivedTask);
            });
          } else {
            // todo: rm it from here
            rebuildSelect([]);
            resolve({});
          }
        }, function(err) {
          reject(err);
        })
      });
    });
  }

  init();
  updateAllOrders();

  addOrderBtn.addEventListener('click', function() {
    if (editableGrid) {
      appendEmptyRowToGrid(editableGrid);
    } else {
      getAllOrders().then(function(allOrders) {
        renderTable([], allOrders);
        appendEmptyRowToGrid(editableGrid);
      }, errorCather);
    }
  });

  selectResolver.addEventListener('change', function() {
    var selectedResolver = getSelectedResolverHtmlObject();
    // id of resolver - selectedResolver.value
    if (!task) {
      return;
    }

    if (parseInt(selectedResolver.value, 10)) {
      addResolver(parseInt(selectedResolver.value, 10));
    } else {
      // value 0 means rm resolver
      rmResolver();
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
    }
  });

  getCurrentUrl().then(function(data) {
    TOCAT_TOOLS.updateIcon(data);
  });

});