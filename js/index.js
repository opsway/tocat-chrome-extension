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
    task = null;

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
   * change select box with resolvers according to users
   * @param users
   */
  function rebuildSelect(users) {
    var selectResolver = document.getElementById('selectResolver');
    selectResolver.options.length = 0;

    selectResolver.options.add(new Option('is not selected', 0));
    for (var i = 0; i < users.length ; i++) {
        selectResolver.options.add(new Option(users[i].name, users[i].id));
    }
  }

  /**
   * get array of links via querySelectorAll. On index.html links can be only change or delete
   * @param dataString
   */
  function getRedirectableButtons(dataString) {
    // dataString equal data-order-delete-id or data-order-edit-id
    return document.querySelectorAll(dataString);
  }

  /**
   * Remove order with id from array of all orders
   * @param id
   * @returns {*}
   */
  function getAdjustedOrdersToTask(id, orders) {
    var results = orders;
    for (var i = 0 ; i < results.length ; i++) {
      if (results[i].order_id == id) {
        results.splice(i, 1);
      }
    }

    return results;
  }

  /**
   *
   * @param deleteId
   * @returns {Promise}
   */
  function deleteOrderFromTask(deleteId) {
    return new Promise(function(resolve, reject) {
      TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/budget').then(function(data) {
        var orders = getAdjustedOrdersToTask(deleteId, data.budget);
        TOCAT_TOOLS.postJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/budget', {
          budget: orders
        }).then(function(data) {
          resolve(data);
        }, function(err) {
          reject(err);
        });
      }, function(err) {
        reject(err);
      });
    });
  }

  /**
   * add clickHandlers for all new orders in table
   */
  function addClickHandlers() {
    var editButtons = getRedirectableButtons('[data-order-edit-id]');
    var deleteButtons = getRedirectableButtons('[data-order-delete-id]');
    if (editButtons.length) {
      for (var i = 0 ; i < editButtons.length ; i++) {
        editButtons[i].addEventListener('click', function(e) {
          e.preventDefault();
          port.postMessage({
            message: 'setSelectedTask',
            selectedTask: JSON.stringify(task)
          });
          port.postMessage({
            message: 'setSelectedOrder',
            selectedOrder: e.target.dataset.orderEditId
          });
          TOCAT_TOOLS.goTo('edit.html');
        });
      }
    }
    if (deleteButtons.length) {
      for (var i = 0 ; i < deleteButtons.length ; i++) {
        deleteButtons[i].addEventListener('click', function(e) {
          e.preventDefault();
          deleteOrderFromTask(e.target.dataset.orderDeleteId).then(function(data) {
            e.target.parentNode.parentNode.classList.add('hide');
            updateTask();
            getCurrentUrl().then(function(data) {
              TOCAT_TOOLS.updateIcon(data);
            });
          });
        });
      }
    }
  }

  function applyBudget(receivedBudget , orders) {
    var result = [];
    for (var i = 0 ; i < receivedBudget.length; i++) {
      for (var j = 0 ; j < orders.length; j++) {
        if (receivedBudget[i].order_id == orders[j].id) {
          result.push({
            id: orders[j].id,
            name: orders[j].name,
            paid:  orders[j].paid,
            budgetForTask: receivedBudget[i].budget
          })
        }
      }
    }
    return result;
  }

  /**
   * Get all orders of current task and redraw table
   * @param task
   */
  function rebuildOrders(task) {
    TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/budget').then(function(data) {
      var orders = applyBudget(data.budget, task.orders);
      drawOrdersTable(orders);

      addClickHandlers()
    });
  }

  /**
   * Redraw tbody according to orders
   * @param orders
   */
  function drawOrdersTable(orders) {
    var ordersTable = document.getElementById('orders-table');
    var innerHtmlOfTable = '';
    for (var i = 0 ; i < orders.length ; i++) {
      innerHtmlOfTable += '' +
        '<tr>' +
        '<td>' + orders[i].name + '</td>' +
        '<td>' + orders[i].paid + '</td>' +
        '<td>' + orders[i].budgetForTask + '</td>' +
        '<td>' +
        '<a data-order-edit-id = ' + orders[i].id + ' href="edit.html">edit</a>/' +
        '<a data-order-delete-id = ' + orders[i].id + ' href="edit.html">delete</a>' +
        '</td>' +
        '</tr>'
    }
    ordersTable.innerHTML = innerHtmlOfTable;
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
        rebuildOrders(task);
        fillInformationAboutTask(task);
      } else {
        // create task on this url
        getCurrentUrl().then(function(data) {
          TOCAT_TOOLS.postJSON(TOCAT_TOOLS.urlTocat + '/tasks', {
            external_id: data
          }).then(function(receivedNewTask) {
            alert('task created');
            TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/task/' + receivedNewTask.id).then(function(receivedNewTask) {
              task = receivedNewTask;
              // rebuildOrders(task);
              fillInformationAboutTask(task);
            });
          });
        })
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

  port.postMessage({
    message: 'setSelectedOrder',
    selectedOrder: ''
  });

  addOrderBtn.addEventListener('click', function() {
    if (task) {
      port.postMessage({
        message: 'setSelectedTask',
        selectedTask: JSON.stringify(task)
      });
      TOCAT_TOOLS.goTo('edit.html');
    }
  });

  createNewOrder.addEventListener('click', function() {

  });

  selectResolver.addEventListener('change', function() {
    var selectedResolver = getSelectedResolverHtmlObject();
    // id of resolver - selectedResolver.value
    if (!task) {
      return;
    }

    if (parseInt(selectedResolver.value, 10)) {
      TOCAT_TOOLS.postJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/resolver', {
        "user_id": parseInt(selectedResolver.value, 10)
      });
    } else {
      // value 0 means rm resolver
      TOCAT_TOOLS.deleteJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/resolver');
    }

  });

  checkboxAccepted.addEventListener('change', function() {
    if (!task) {
      return;
    }

    if (checkboxAccepted.checked) {
      TOCAT_TOOLS.postJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/accept');
    } else {
      TOCAT_TOOLS.deleteJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/accept');
    }
  });

  getCurrentUrl().then(function(data) {
    TOCAT_TOOLS.updateIcon(data);
  });

});