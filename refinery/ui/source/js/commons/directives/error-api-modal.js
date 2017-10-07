(function () {
  'use strict';
  angular
    .module('refineryApp')
    .component('errorAPIModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/commons/partials/error-api-modal.html');
      }],
      bindings: {
        modalInstance: '<',
        resolve: '<'
      },
      controller: [function () {
        var vm = this;
        vm.modalData = vm.resolve.modalData;

        vm.closeModal = function () {
          vm.modalInstance.close(vm.modalData);
        };
      }]
    });
})();
