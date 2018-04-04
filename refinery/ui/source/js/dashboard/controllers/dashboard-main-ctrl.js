/**
 * Dashboard Main Ctrl
 * @namespace DashboardMainCtrl
 * @desc Main controller for the main view, dashboard. Ctrl for parent component
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';

  angular
    .module('refineryDashboard')
    .controller('DashboardMainCtrl', DashboardMainCtrl);

  DashboardMainCtrl.$inject = [];

  function DashboardMainCtrl () {
   // var vm = this;

    activate();

    function activate () {
      console.log('dashboard-main-ctrl');
    }

    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
  }
})();
