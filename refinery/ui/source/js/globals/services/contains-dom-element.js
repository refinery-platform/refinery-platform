'use strict';

angular
  .module('containsDomElement', [])
  .service('containsDomElement', [function () {
    return function (searchEl, targetEl) {
      var found = false;

      // Set special attribute to identify element while browsing up the
      // DOM tree.
      searchEl.domSearchTarget = true;

      var target = targetEl;
      try {
        while (target.tagName.toLowerCase() !== 'body') {
          if (target.domSearchTarget) {
            found = true;
            break;
          }
          target = target.parentNode;
        }
        // Remove special search attribute
        delete searchEl.domSearchTarget;
      } catch (e) {
        return false;
      }

      return found;
    };
  }]);
