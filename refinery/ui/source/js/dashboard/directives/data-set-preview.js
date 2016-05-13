'use strict';

function refineryDataSetPreview () {
  return {
    bindToController: {
      close: '&',
      active: '='
    },
    controller: 'DataSetPreviewCtrl',
    controllerAs: 'preview',
    restrict: 'E',
    replace: true,
    templateUrl: '/static/partials/dashboard/directives/data-set-preview.html'
  };
}

angular
  .module('refineryDashboard')
  .directive('refineryDataSetPreview', [
    refineryDataSetPreview
  ]);
