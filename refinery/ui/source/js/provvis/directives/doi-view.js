/**
 * Provvis DOI View Directive
 * @namespace rpProvvisDOIView
 * @desc DOI view.
 * @memberOf refineryApp.refineryProvvis
 */

(function () {
  'use strict';
  angular
    .module('refineryProvvis')
    .component('rpProvvisDoiView', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/provvis/partials/doi-view.html');
      }]
    });
})();
