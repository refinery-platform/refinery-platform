/**
 * Statistics Card Ctrl
 * @namespace StatisticsCardCtrl
 * @desc Controller for statistics card component on dashboard component.
 * @memberOf refineryApp.refineryStatisticsCardCtrl
 */
(function () {
  'use strict';

  angular
    .module('refineryDashboard')
    .controller('StatisticsCardCtrl', StatisticsCardCtrl);

  StatisticsCardCtrl.$inject = [];

  function StatisticsCardCtrl (
  ) {
    activate();

    function activate () {
      console.log('statistics-card');
    }

    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
  }
})();
