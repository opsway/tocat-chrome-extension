document.addEventListener('DOMContentLoaded', function() {
  var addOrderBtn = document.getElementById('add-order-btn'),
    createNewOrder = document.getElementById('create-new-order-btn'),
    selectResolver = document.getElementById('selectResolver'),
    checkboxAccepted = document.getElementById('checkbox-accepted'),
    users = [],
    bkg = chrome.extension.getBackgroundPage(),
    port = chrome.extension.connect({name: "connection with background"}),
    url = null,
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
    // todo: filter only developer
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
   *
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
        })
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
          });
        });
      }
    }
  }

  /**
   * Get all orders of current task and redraw table
   * @param task
   */
  function rebuildOrders(task) {
    drawOrdersTable(task.orders);
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
          // todo: check name of budget from this order to current task
        '<td>' + orders[i].BUDGET + '</td>' +
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
      if (receivedTask) {
        rebuildOrders(task);
        fillInformationAboutTask(task);
        addClickHandlers();
      } else {
        // create task on this url
        getCurrentUrl().then(function(data) {
          TOCAT_TOOLS.postJSON(TOCAT_TOOLS.urlTocat + '/tasks', {
            external_id: data
          }).then(function(receivedNewTask) {
            task = receivedNewTask;
            alert('task created');
            rebuildOrders(task);
            fillInformationAboutTask(task);
            addClickHandlers();
          })
        })
      }
    });
  }

  /**
   * On firstRender redraw select with resolvers and table with orders
   * Set resolver and additional parameters of current task
   */
  function init() {
    // get users from api
    TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/users?search=role != Manager')
      .then(function(data) {
        users = data;
        rebuildSelect(users);
        updateTask();
      }, function(data) {

      });
  }

  // TEMPORARY SOLUTION START
  /**
   * Get url of current opened tab
   * @returns {Promise}
   */
  function getCurrentUrl() {
    return new Promise(function(resolve, reject) {
      chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
        resolve(tabs[0].url);
      });
    });
  }

  /**
   * Get map url => task object
   * @returns {Promise.<T>}
   */
  function getMapUrlTask() {
    return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/tasks')
      .then(function(data) {
        var map = {};
        // look like 'url' => 'task object'
        for (var i = 0 ; i < data.length ; i++) {
          map[data[i].external_id] = data[i];
        }
        return map;
      }, function(data) {
        return data;
      });
  }

  /**
   * Get task which associated with current url
   * @returns {Promise.<T>}
   */
  function getCurrentTask() {

    // temporary solution to get task associated with url
    // to get task using external id does not work
    /*var mapUrlTask = getMapUrlTask();
    return Promise.all([urlPromise, mapUrlTask])
      .then(function(values) {
        var url = values[0];
        var map = values[1];
        // return task object
        return map[url];
      }, function(reason) {

      })*/
    return new Promise(function(resolve, reject) {
      getCurrentUrl().then(function(data) {
        // lets use task with id = 1
        TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/task/1').then(function(data) {
          resolve(data);
        }, function(err) {
          reject(err);
        })
      });
    });
  }
  // TEMPORARY SOLUTION END

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

});