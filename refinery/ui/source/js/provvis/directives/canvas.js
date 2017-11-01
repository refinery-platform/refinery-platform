/**
 * Provvis Canvas Directive
 * @namespace provvisCanvas
 * @desc Canvas directive for the provvis graph
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';

  angular
    .module('refineryProvvis')
    .directive('provvisCanvas', provvisCanvas);

  provvisCanvas.$inject = ['$window'];

  function provvisCanvas ($window) {
    return {
      restrict: 'AE',
      templateUrl: function () {
        return $window.getStaticUrl('partials/provvis/partials/provvis-canvas.html');
      }
    };
  }
})();
