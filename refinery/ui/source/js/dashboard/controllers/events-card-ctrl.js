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
    .controller('EventsCardCtrl', EventsCardCtrl);

  EventsCardCtrl.$inject = [];

  function EventsCardCtrl (
  ) {
    activate();

    function activate () {
      console.log('events-card');
    }

    /*
    * ---------------------------------------------------------
    * Watchers
    * ---------------------------------------------------------
    */
  }
})();
