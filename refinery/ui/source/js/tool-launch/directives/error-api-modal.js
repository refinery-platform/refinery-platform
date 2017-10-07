(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .component('errorAPIModal', {
      templateUrl: ['$window', function ($window) {
        return $window.getStaticUrl('partials/tool-launch/partials/error-api-modal.html');
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
