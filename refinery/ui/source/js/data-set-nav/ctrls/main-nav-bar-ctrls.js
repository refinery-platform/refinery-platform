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
    '$scope',
    'currentUserService',
  ];


  function MainNavBarCtrl (
    $location,
    $scope,
    currentUserService
  ) {
    var vm = this;
    vm.path = '';
    vm.currentUser = currentUserService.currentUser;
    vm.userProfileUUID = vm.currentUser.profile.uuid;
    vm.fullName = vm.currentUser.first_name + ' ' + vm.currentUser.last_name;
    vm.userName = vm.currentUser.username;

    activate();

   /*
   * ---------------------------------------------------------
   * Methods Definitions
   * ---------------------------------------------------------
   */
    function activate () {
      getCurrentPath();
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

    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return currentUserService.currentUser;
        },
        function () {
          vm.currentUser = currentUserService.currentUser;
          vm.userProfileUUID = vm.currentUser.profile.uuid;
          vm.fullName = vm.currentUser.first_name + vm.currentUser.last_name;
          vm.userName = vm.currentUser.username;
        }
      );
    };
  }
})();
