/**
 * History Card Ctrl
 * @namespace HistoryCardCtrl
 * @desc Controller for history card component on dashboard component.
 * @memberOf refineryApp.refineryDashboard
 */
(function () {
  'use strict';

  angular
    .module('refineryDashboard')
    .controller('HistoryCardCtrl', HistoryCardCtrl);

  HistoryCardCtrl.$inject = ['$scope', 'eventsService', 'settings'];

  function HistoryCardCtrl (
    $scope,
    eventsService,
    settings
  ) {
    var vm = this;
    vm.isEventsLoading = false;
    vm.getUserEvents = getUserEvents;
    vm.isLoggedIn = settings.djangoApp.userId !== undefined;
    vm.events = [];
    activate();

    function activate () {
      getUserEvents();
    }

    /**
     * @name getUserEvents
     * @desc  View method to get the Events list
     * @memberOf refineryDashboard.HistoryCardCtrl
    **/
    function getUserEvents () {
      vm.isEventsLoading = true;
      var eventsRequest = eventsService.query();
      eventsRequest.$promise.then(function (response) {
        vm.isEventsLoading = false;
        vm.events = response;
      });
    }

     /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return vm.ParentCtrl.refreshEvents;
        },
        function () {
          if (vm.ParentCtrl.refreshEvents) {
            getUserEvents();
            vm.ParentCtrl.refreshEvents = false;
          }
        }
      );
    };
  }
})();
