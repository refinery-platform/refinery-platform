/**
 * Events Card Ctrl
 * @namespace EventsCardCtrl
 * @desc Controller for events card component on dashboard component.
 * @memberOf refineryApp.refineryEventsCardCtrl
 */
(function () {
  'use strict';

  angular
    .module('refineryDashboard')
    .controller('CollaborationCardCtrl', CollaborationCardCtrl);

  CollaborationCardCtrl.$inject = [];

  function CollaborationCardCtrl (
  ) {
    activate();

    function activate () {
      console.log('CollaborationCardCtrl-card');
    }

    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
  }
})();
