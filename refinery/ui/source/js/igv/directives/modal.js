'use strict';

function rpIGVLaunchModal ($compile, $templateCache, $uibModal) {
  return {
    restrict: 'AE',
    controller: 'IGVCtrl',
    controllerAs: 'ICtrl',
    link: function (scope, element) {
      console.log('in the directive from rp igv launch');
      element.bind('click', function () {
        var template = $templateCache.get('i-g-v-launch-modal.html');
        var modalContent = $compile(template)(scope);
        $uibModal.open({
          template: modalContent,
          controller: 'IGVLaunchModalCtrl'
        });
      });
    }
  };
}

angular
  .module('refineryIGV')
  .directive('rpIGVLaunchModal', [
    '$compile',
    '$templateCache',
    '$uibModal',
    rpIGVLaunchModal
  ]);
