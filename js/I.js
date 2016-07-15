function I() {
  var user,
    myTeam,
    ordersOfMyTeam;

  /**
   * Get logged in user
   * @returns {*}
   */
  this.getMe = function() {
    if (!user) {
      return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/users/me').then(function(data) {
        user = data;
        return data;
      })
    } else {
      return Promise.resolve(user);
    }
  }

  /**
   * Simple logout
   */
  this.logOut = function() {
    user = null;
    myTeam = null;
    ordersOfMyTeam = null;
  }

  /**
   * Get all developers in my team
   * @returns {Promise.<T>|*}
   */
  this.getMyTeam = function() {
    return this.getMe().then(function(me) {
      if (!myTeam) {
        return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/users?search=role=Developer team = ' + me.tocat_team.name).then(function(receivedTeam) {
          myTeam = receivedTeam;
          return receivedTeam;
        });
      } else {
        return Promise.resolve(myTeam);
      }
    });
  }

  /**
   * Get all orders associated for my team
   * @returns {Promise.<T>|*}
   */
  this.getOrdersOfMyTeam = function() {
    return this.getMe().then(function(me) {
      if (!ordersOfMyTeam) {
        return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/orders?limit=9999999&search=team==' + encodeURIComponent(data.tocat_team.name) + ' completed = 0&sorted_by=name').then(function(myOrders){
          ordersOfMyTeam = myOrders;
          return myOrders;
        });
      } else {
        return Promise.resolve(ordersOfMyTeam);
      }
    })
  }
}