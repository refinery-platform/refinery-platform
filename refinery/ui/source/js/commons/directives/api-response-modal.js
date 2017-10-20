(function () {
  'use strict';
  angular
    .module('refineryApp')
    .component('aPIResponseModal', {
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
