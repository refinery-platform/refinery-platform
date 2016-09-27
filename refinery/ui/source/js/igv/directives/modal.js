'use strict';

function rpIGVLaunchModal ($compile, $templateCache, $uibModal) {
  return {
    restrict: 'AE',
    link: function (scope, element) {
      element.bind('click', function () {
        var template = $templateCache.get('igvlaunchmodal.html');
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
