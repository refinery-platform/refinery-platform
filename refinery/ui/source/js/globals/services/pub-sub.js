'use strict';

/**
 * PubSub class
 *
 * @method  PubSub
 * @author  Fritz Lekschas
 * @date    2015-08-13
 *
 * @class
 * @param   {Object}  _  Lodash library.
 */
function PubSub (_) {
  /**
   * Stack object holding arrays of objects with the callback functions.
   *
   * @author  Fritz Lekschas
   * @date    2015-08-13
   *
   * @example
   * {
   *   click: [
   *     {
   *       callback: function () {
   *         console.log('I have been clicked');
   *       },
   *       times: 2
   *     }
   *   ]
   * }
   *
   * @type  {Object}
   */
  var stack = {};

  /**
   * Event class
   *
   * @method  Event
   * @author  Fritz Lekschas
   * @date    2015-08-13
   *
   * @class
   */
  function Event () {
  }

  /**
   * Trigger an event stack
   *
   * @method  trigger
   * @author  Fritz Lekschas
   * @date    2015-08-13
   *
   * @param   {String}   event  Event identifier.
   * @return  {Boolean}         Returns `true` if an event stack was found.
   */
  Event.prototype.trigger = function (event, data) {
    if (_.isArray(stack[event])) {
      // Traversing from the end to the start, which has the advantage that
      // deletion of events, i.e. calling `Event.off()` doesn't affect the index
      // of event listeners in the next step.
      for (var i = stack[event].length; i--;) {
        // Instead of checking whether `stack[event][i]` is a function here,
        // we do it just once when we add the function to the stack.
        if (stack[event][i].times--) {
          stack[event][i].callback(data);
        } else {
          this.off(event, i);
        }
      }
      return true;
    }
    return false;
  };

  /**
   * Removes a callback function from an event stack given its index.
   *
   * @method  off
   * @author  Fritz Lekschas
   * @date    2015-08-13
   *
   * @param   {String}   event  Event identifier.
   * @param   {Number}   index  Index of the callback to be removed.
   * @return  {Boolean}         Returns `true` if event callback was found and
   *   successfully removed.
   */
  Event.prototype.off = function (event, index) {
    try {
      stack[event].splice(index, 1);
      return true;
    } catch (e) {
      return false;
    }
  };

  /**
   * Add a callback function to an event stack.
   *
   * @method  on
   * @author  Fritz Lekschas
   * @date    2015-08-13
   *
   * @param   {String}    event     Event identifier.
   * @param   {Function}  callback  Function which is called when the event
   *   stack is triggered.
   * @param   {Number}    times     Number of times the callback function should
   *   be triggered before it is removed from the event stack. This is useful
   *   when an event happens only a certain number of times.
   * @return  {Number}              Index of callback, which is needed to
   *   manually remove the callback from the event stack.
   */
  Event.prototype.on = function (event, callback, times) {
    if (!_.isFunction(callback)) {
      return false;
    }

    var stackTimes = _.isFinite(times) ? parseInt(times, 10) : Infinity;

    if (_.isArray(stack[event])) {
      return stack[event].push({
        callback: callback,
        times: stackTimes
      }) - 1;
    }

    stack[event] = [{
      callback: callback,
      times: stackTimes
    }];
    return 0;
  };

  return new Event();
}

angular
  .module('pubSub', [])
  .constant('_', window.lodashLatest)
  .service('pubSub', ['_', PubSub]);
