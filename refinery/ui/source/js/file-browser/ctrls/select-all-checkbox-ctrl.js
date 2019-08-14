/**
 * Select All Checkbox Ctrl
 * @namespace rpSelectAllCheckboxCtrl
 * @desc Component controller for the select all feature
 * @memberOf refineryApp.refineryFileBrowser
 */
(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('rpSelectAllCheckboxCtrl', rpSelectAllCheckboxCtrl);

  rpSelectAllCheckboxCtrl.$inject = [
  ];


  function rpSelectAllCheckboxCtrl (
  ) {
    var vm = this;
    vm.selectAllStatus = false;
   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */

    vm.$onInit = function () {
      console.log('On init');
    };
  }
})();
