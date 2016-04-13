function refineryExpansionPanel () {
  'use strict';

  function ExpansionPanelCtrl (
    pubSub,
    dashboardWidthFixerService,
    dashboardDataSetPreviewService) {
    var that = this;

    this.pubSub = pubSub;
    this.dashboardWidthFixerService = dashboardWidthFixerService;
    this.dashboardDataSetPreviewService = dashboardDataSetPreviewService;

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
      'dashboardDataSetPreviewService',
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
