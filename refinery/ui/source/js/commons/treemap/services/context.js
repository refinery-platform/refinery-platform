'use strict';

function TreemapContext () {
  /**
   * Private data store.
   *
   * @date  2015-10-15
   *
   * @type  {Object}
   */
  var dataStore = {};

  /**
   * Private stack of event listeners.
   *
   * @date  2015-10-15
   *
   * @type  {Object}
   */
  var stack = {};

  /**
   * Context class constructor.
   *
   * @method  Context
   * @date    2015-10-15
   *
   * @class
   */
  function Context () {
  }

  Context.prototype.constructor = Context;

  /**
   * Get a stored value from the context store.
   *
   * @method  get
   * @date    2015-10-15
   *
   * @param   {String}  key  Indentifier for `value`.
   * @return  {*}            Value represented by `key`.
   */
  Context.prototype.get = function (key) {
    return dataStore[key];
  };

  /**
   * Simple listener for value changes.
   *
   * @method  on
   * @date    2015-10-15
   *
   * @param   {String}    key       Indentifier for `value`.
   * @param   {Function}  callback  Function to be called when the event occurs.
   * @return  {Number}              Number of event listener.
   */
  Context.prototype.on = function (key, callback) {
    if (key in stack) {
      return stack[key].push(callback);
    }
    stack[key] = [callback];
    return 0;
  };

  /**
   * Set a context property and inform listeners if the value changed.
   *
   * @method  set
   * @date    2015-10-15
   *
   * @param   {String}   key    Indentifier for `value`.
   * @param   {*}        value  Actual value that should be stored.
   * @param   {Boolean}  force  If `true` the change will always be broadcasted
   *   no matter if the value actually changed or not.
   */
  Context.prototype.set = function (key, value, force) {
    var old = dataStore[key];
    if (old !== value || force === true) {
      if (!!stack[key]) {
        for (var i = stack[key].length; i--;) {
          if (typeof stack[key][i] === 'function') {
            stack[key][i](value);
          }
        }
      }
      dataStore[key] = value;
    }
  };

  return new Context();
}

angular
  .module('treemap')
  .factory('treemapContext', [TreemapContext]);
