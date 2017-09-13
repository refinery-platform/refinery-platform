'use strict';

function WidthFixerFactory ($q, $timeout, _) {
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

  /**
   * Trigger the width fixers as soon as more than 1 method is on the stack.
   *
   * @description
   * This method needs refactoring at some point. There are two steps in fixing
   * the width, added separately to the fixer stack. If one of them is missing
   * the whole width fixing is broken.
   * Generally this shouldn't happen anyways because the fixing is delayed by
   * one digest cycle of Angular but it seems like this doesn't guarantee that
   * all controllers have been initialized yet.
   *
   * @method  fixWidth
   * @author  Fritz Lekschas
   * @date    2016-09-30
   * @param   {Number}    counter  Integer counter that keeps track of the
   *   number of recursive executions.
   * @return  {Object}             Promise resolving to `true` if the width is
   *   successfully fixed.
   */
  function fixWidth (counter) {
    var _counter = counter || 1;
    var deferred = $q.defer();

    if (listeners.fixer.length > 1) {
      trigger('fixer');
      deferred.resolve();
    } else {
      // Try several times, increasing the wait time with each iteration.
      if (_counter <= 10) {
        $timeout(function () {
          fixWidth(_counter)
            .then(deferred.resolve)
            .catch(deferred.reject);
        }, 10 * _counter, true, ++_counter);
      } else {
        deferred.reject();
      }
    }

    return deferred.promise;
  }

  return {
    trigger: trigger,
    fixWidth: fixWidth,
    fixedWidth: fixedWidth,
    fixer: listeners.fixer,
    resetter: listeners.resetter
  };
}

angular
  .module('refineryDashboard')
  .factory('dashboardWidthFixerService', [
    '$q',
    '$timeout',
    '_',
    WidthFixerFactory
  ]);
