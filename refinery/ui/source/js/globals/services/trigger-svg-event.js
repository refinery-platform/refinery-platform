'use strict';

/**
 * Serice wrapper.
 *
 * @method  triggerSvgEvent
 * @author  Fritz Lekschas
 * @date    2016-10-04
 * @return  {Function}  The actual service.
 */
function triggerSvgEvent () {
  /**
   * Triggers an SVG event on a given element
   *
   * @method
   * @author  Fritz Lekschas
   * @date    2016-10-04
   * @param   {Object}  element    DOM element.
   * @param   {String}  eventName  Event name, e.g., `mouseenter`.
   */
  return function (element, eventName) {
    var event = document.createEvent('SVGEvents');
    event.initEvent(eventName, true, true);
    element.dispatchEvent(event);
  };
}

angular
  .module('triggerSvgEvent', [])
  .service('triggerSvgEvent', [triggerSvgEvent]);
