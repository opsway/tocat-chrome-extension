/**
 * Created by polzoom on 15.07.16.
 */
function Company() {
  var employees = [];

  /**
   *
   * @returns {*}
   */
  function _getEmployees() {
    if (!employees.length) {
      return TOCAT_TOOLS.getJSON(TOCAT_TOOLS.urlTocat + '/users').then(function(data) {
        employees = data;
        return data;
      });
    } else {
      return Promise.resolve(employees);
    }
  }

  /**
   *
   * @param teamName
   * @returns {Promise.<T>|*}
   */
  this.getAllDevelopers = function(teamName) {
    return _getEmployees().then(function(employees) {
      return _.filter(employees, function(o) {
        if (!teamName) {
          return o.tocat_server_role.name === 'Developer';
        } else {
          return o.tocat_server_role.name === 'Developer' && o.tocat_team.name === teamName;
        }
      });
    });
  };

  this.getUser = function(userId) {
    return _getEmployees().then(function(employees) {
      return _.find(employees, function(o) {
        return o.id === userId;
      });
    });
  };


  this.reset = function() {
    employees = [];
  }
}