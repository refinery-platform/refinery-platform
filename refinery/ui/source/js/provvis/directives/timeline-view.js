/**
 * Provvis Timeline View Directive
 * @namespace rpProvvisTimelineView
 * @desc Timeline view only showing analysis within a time-gradient background.
 * @memberOf refineryApp.refineryProvvis
 */

(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .component('rpProvvisTimelineView', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/provvis/partials/timeline-view.html');
      }]
    });
})();
