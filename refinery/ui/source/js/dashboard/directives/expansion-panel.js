'use strict';

function refineryExpansionPanel () {
  function ExpansionPanelCtrl (pubSub, dashboardWidthFixerService) {
    var that = this;

    this.pubSub = pubSub;
    this.dashboardWidthFixerService = dashboardWidthFixerService;

    this.dashboardWidthFixerService.fixer.push(function () {
      that.style = {
        left: this.fixedWidth + 1
      };
    });
  }

  return {
    controller: [
      'pubSub',
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
