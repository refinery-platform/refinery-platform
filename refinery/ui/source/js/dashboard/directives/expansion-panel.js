'use strict';

function refineryExpansionPanel () {
  return {
    controller: 'ExpansionPanelCtrl',
    controllerAs: 'expansionPanel',
    restrict: 'E',
    replace: true,
    templateUrl: '/static/partials/dashboard/directives/expansion-panel.html',
    transclude: true
  };
}

angular
  .module('refineryDashboard')
  .directive('refineryExpansionPanel', [
    refineryExpansionPanel
  ]);
