'use strict';

function refineryExpansionPanel () {
  function ExpansionPanelCtrl (dashboardWidthFixerService) {
    var that = this;

    dashboardWidthFixerService.fixer.push(function () {
      that.style = {
        left: this.fixedWidth + 1
      };
    });
  }

  return {
    controller: [
      'dashboardWidthFixerService',
      ExpansionPanelCtrl],
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
