/**
 * Provvis Change Layers View View Directive
 * @namespace rpProvvisChangeLayersView
 * @desc DOI view.
 * @memberOf refineryApp.refineryProvvis
 */

(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .component('rpProvvisChangeLayersView', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/provvis/partials/change-layers-view.html');
      }]
    });
})();
