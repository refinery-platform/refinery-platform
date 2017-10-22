/**
 * API Response Modal
 * @namespace aPIResponseModal
 * @desc Generic component for display an API Response. Fields which can be
 * set are header, introMsg, msgType (i.e. danger, primary, success, &
 * warning), apiStatus, & apiMsg
 * @memberOf refineryApp.aPIResponseModal
 */
(function () {
  'use strict';
  angular
    .module('refineryApp')
    .component('rpApiResponseModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/commons/partials/api-response-modal.html');
      }],
      bindings: {
        modalInstance: '<',
        resolve: '<'
      },
      controller: 'APIResponseModalCtrl'
    });
})();
