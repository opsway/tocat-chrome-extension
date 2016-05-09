document.addEventListener('DOMContentLoaded', function() {
  var saveBtn = document.getElementById('save-btn'),
    cancelBtn = document.getElementById('cancel-btn'),
    bkg = chrome.extension.getBackgroundPage(),
    port = chrome.extension.connect({name: "connection with background"}),
    checkboxAccepted = document.getElementById('checkbox-accepted'),
    selectResolver = document.getElementById('selectResolver'),
    selectOrder = document.getElementById('selectOrder'),
    orders = null,
    task = null;

  /**
   * setter for budget
   * @param value
   */
  function setBudgetOfTask(value) {
    var budgetPlace = document.getElementById('budget');
    budgetPlace.innerHTML = value;
  }

  function checkBudgetOfTask() {
    var budgetPlace = document.getElementById('freeBudget');
    var maxBudget = parseInt(budgetPlace.innerHTML, 10);
    var issueBudget = document.getElementById('issueBudget').value;
    var alert = document.getElementById('alert');
    if (issueBudget) {
      if (parseInt(issueBudget, 10) > maxBudget) {
        alert.innerHTML = 'Value must be less than ' + maxBudget;
        alert.classList.remove("hidden");
        return false;
      } else {
        return true;
      }
    } else {
      alert.innerHTML = 'Value must be greater or equal 1';
      alert.classList.remove("hidden");
      return false;
    }
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
   * Information in header of extension
   * @param task
   */
  function fillInformationAboutTask(task) {
    setBudgetOfTask(task.budget);
    setPaidStatusOfTask(task.paid);
    setAcceptedStatusOfTask(task.accepted);
    if (task.resolver && task.resolver.id) {
      setResolverOfTask(task.resolver.id);
    }
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
   * Add to select received orders
   * @param orders
   */
  function rebuildOrdersSelect(orders) {
    var selectOrder = document.getElementById('selectOrder');
    selectOrder.options.length = 0;
    for (var i = 0; i < orders.length ; i++) {
      selectOrder.options.add(new Option(orders[i].name, orders[i].id));
    }
  }

  /**
   * Get map orderId => order object
   * @param orders
   * @returns {{}}
   */
  function formatOrders(orders) {
    var formattedOrders = {};
    for(var i = 0; i < orders.length ; i++) {
      formattedOrders[orders[i].id] = orders[i];
    }
    return formattedOrders;
  }

  function rmUsedOrders(usedOrders) {
    var usedOrders = formatOrders(usedOrders);
    var selectBoxOrders = document.getElementById('selectOrder');

    for (var i = 0; i< selectBoxOrders.length; i++){
      if (usedOrders[selectBoxOrders.options[i].value]) {
        selectBoxOrders.remove(i);
      }
    }
  }

  /**
   * Show free budget accordingly to selected order
   */
  function updateOrderData() {
    if (orders) {
      var orderId = selectOrder.options[selectOrder.selectedIndex].value;
      var freeBudget = document.getElementById('freeBudget');

      freeBudget.innerHTML = orders[parseInt(orderId, 10)].free_budget;
    }
  }

  // test function to check duplicate of orders
  function testNewBudget(receivedBudget, newBudget) {
    if (!receivedBudget) {
      return [newBudget];
    }

    for (var i = 0 ; i <  receivedBudget.length ; i++) {
      if (receivedBudget[i].order_id == newBudget.order_id) {
        receivedBudget[i] = newBudget;
        return receivedBudget;
      }
    }

    receivedBudget.push(newBudget);
    return receivedBudget;
  }

  function init() {
    // todo: get orders associated with current task not all orders
    TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/orders')
      .then(function(receivedOrders) {
        orders = formatOrders(receivedOrders);
        rebuildOrdersSelect(receivedOrders);
        updateOrderData();
        port.postMessage({ message: 'getSelectedOrder' });
      }, function(data) {
      });
  }

  init();

  port.postMessage({ message: 'getSelectedTask' });

  port.onMessage.addListener(function(msg) {
    switch (msg.message) {
      case 'getSelectedTask':
        task = JSON.parse(msg.selectedTask);
        // todo: get not all users, get only resolvers
        TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/users?search=role != Manager')
          .then(function(data) {
            rebuildSelect(data);
            fillInformationAboutTask(task);
          }, function(err) {
          });
        break;
      case 'getSelectedOrder':
        if (msg.selectedOrder) {
          // we try to edit order not add
          var selectBox = document.getElementById('selectOrder');
          selectBox.value = msg.selectedOrder;
          selectBox.disabled = true;
          updateOrderData();
        } else {
          // we add new order
          rmUsedOrders(task.orders);
        }
        break;
      default:
        break;
    }
  });

  saveBtn.addEventListener('click', function() {
    if (orders && task) {
      if (checkBudgetOfTask()) {
        var orderId = selectOrder.options[selectOrder.selectedIndex].value;
        var budget = parseInt(document.getElementById('issueBudget').value, 10);
        // todo: redo it. Migrate all code to server
        TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/budget')
          .then(function(res) {
            var receivedBudget = res.budget;
            receivedBudget = testNewBudget(receivedBudget, {
              order_id: parseInt(orderId),
              budget:budget,
              task_id: task.id
            });
            TOCAT_TOOLS.postJSON(TOCAT_TOOLS.urlTocat + '/task/' + task.id + '/budget', {
              budget: receivedBudget
            }).then(function() {
              TOCAT_TOOLS.goTo('index.html');
            }, function(err) {
            });
          });
      }
    }
  });

  cancelBtn.addEventListener('click', function() {
    port.postMessage({
      message: 'setSelectedTask',
      selectedTask: ''
    });
    TOCAT_TOOLS.goTo('index.html');
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

  selectOrder.addEventListener('change', function(e) {
    updateOrderData();
  });

});