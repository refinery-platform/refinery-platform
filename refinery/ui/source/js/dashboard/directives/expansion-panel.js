'use strict';

function refineryExpansionPanel ($window) {
  return {
    controller: 'ExpansionPanelCtrl',
    controllerAs: 'expansionPanel',
    restrict: 'E',
    replace: true,
    templateUrl: function () {
      return $window.getStaticUrl('partials/dashboard/directives/expansion-panel.html');
    },
    transclude: true
  };
}

angular
  .module('refineryDashboard')
  .directive('refineryExpansionPanel', [
    '$window',
    refineryExpansionPanel
  ]);
