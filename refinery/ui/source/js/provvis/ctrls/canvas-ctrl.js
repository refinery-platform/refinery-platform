/**
 * Provvis Canvas Controller
 * @namespace provvisCanvasController
 * @desc Canvas controller for the provvis graph
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .controller('provvisCanvasController', provvisCanvasController);

  provvisCanvasController.$inject = ['$scope'];

  function provvisCanvasController ($scope) {
    $scope.name = 'Canvas';
  }
})();
