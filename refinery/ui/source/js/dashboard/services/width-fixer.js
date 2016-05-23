'use strict';

function WidthFixerFactory (_) {
  var fixedWidth = 0;
  var listeners = {
    fixer: [],
    resetter: []
  };

  /**
   * Trigger a stack of listeners
   * @type {function}
   * @param  {string} stack Listener's name.
   */
  function trigger (stack) {
    if (_.isArray(listeners[stack])) {
      for (var i = 0, len = listeners[stack].length; i < len; i++) {
        if (_.isFunction(listeners[stack][i])) {
          listeners[stack][i]();
        }
      }
    }
  }

  return {
    trigger: trigger,
    fixedWidth: fixedWidth,
    fixer: listeners.fixer,
    resetter: listeners.resetter
  };
}

angular
  .module('refineryDashboard')
  .factory('dashboardWidthFixerService', ['_', WidthFixerFactory]);
