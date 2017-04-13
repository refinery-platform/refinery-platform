'use strict';

function refineryDataSetPreview ($window) {
  return {
    bindToController: {
      close: '&',
      active: '='
    },
    controller: 'DataSetPreviewCtrl',
    controllerAs: 'preview',
    restrict: 'E',
    replace: true,
    templateUrl: function () {
      return $window.getStaticUrl('partials/dashboard/directives/data-set-preview.html');
    }
  };
}

angular
  .module('refineryDashboard')
  .directive('refineryDataSetPreview', [
    '$window',
    refineryDataSetPreview
  ]);
