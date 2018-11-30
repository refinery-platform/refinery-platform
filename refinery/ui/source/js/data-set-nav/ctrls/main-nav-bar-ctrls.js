/**
 * Main Nav Bar Ctrl
 * @namespace MainNavBarCtrl
 * @desc Controller for main nav bar.
 * @memberOf refineryApp.refineryDataSetNav
 */
(function () {
  'use strict';

  angular
    .module('refineryDataSetNav')
    .controller('MainNavBarCtrl', MainNavBarCtrl);

  MainNavBarCtrl.$inject = [
    '$location'
  ];


  function MainNavBarCtrl (
    $location
  ) {
    var vm = this;
    vm.path = '';

    activate();

   /*
   * ---------------------------------------------------------
   * Methods Definitions
   * ---------------------------------------------------------
   */
    function activate () {
      var absUrl = $location.absUrl();
      if (absUrl.indexOf('dashboard') > -1) {
        vm.path = 'dashboard';
      } else if (absUrl.indexOf('about') > -1) {
        vm.path = 'about';
      } else if (absUrl.indexOf('accounts/login') > -1) {
        vm.path = 'login';
      } else if (absUrl.indexOf('accounts/register') > -1) {
        vm.path = 'register';
      } else {
        vm.path = '';
      }
    }
    /**
     * @name navLeft
     * @desc  Updates the current group when user navigates
     * @memberOf refineryToolLaunch.InputControlCtrl
     * @param {int} depth - group nav index
    **/
  }
})();
