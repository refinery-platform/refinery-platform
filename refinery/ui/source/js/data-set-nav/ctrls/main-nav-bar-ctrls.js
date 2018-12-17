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
    '$location',
    'settings'
  ];


  function MainNavBarCtrl (
    $location,
    settings
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
      getCurrentPath();

      vm.userProfileUUID = settings.djangoApp.userprofileUUID;

      if (settings.djangoApp.userFullName.length) {
        vm.userName = settings.djangoApp.userFullName;
      } else {
        vm.userName = settings.djangoApp.userName;
      }
    }

    /**
     * @name getCurrentPath
     * @desc  Private method to get current path and set view path variable
     * @memberOf refineryDataSetNav.refineryDataSetNav
    **/
    function getCurrentPath () {
      var absUrl = $location.absUrl();
      if (absUrl.indexOf('dashboard') > -1) {
        vm.path = 'dashboard';
      } else if (absUrl.indexOf('about') > -1) {
        vm.path = 'about';
      } else if (absUrl.indexOf('accounts/login') > -1) {
        vm.path = 'login';
      } else if (absUrl.indexOf('accounts/register') > -1) {
        vm.path = 'register';
      } else if (absUrl.indexOf('users') > -1) {
        vm.path = 'users';
      } else {
        vm.path = '';
      }
    }
  }
})();
