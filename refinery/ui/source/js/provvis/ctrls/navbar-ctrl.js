/**
 * Provvis Navbar Controller
 * @namespace provvisNavbarController
 * @desc Navbar controller for the provvis graph
 * @memberOf refineryApp.refineryProvvis
 */
(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .controller('provvisNavbarController', provvisNavbarController);

  provvisNavbarController.$inject = ['$scope'];

  function provvisNavbarController ($scope) {
    $scope.name = 'Navbar';

    var vm = this;
    vm.provView = 'Layers';
  }
})();
