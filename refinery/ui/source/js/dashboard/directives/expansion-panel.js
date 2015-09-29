function refineryExpansionPanel () {
  'use strict';

  function ExpansionPanelCtrl (
    pubSub,
    dashboardWidthFixerService,
    dashboardDataSetPreviewService,
    dashboardExpandablePanelService) {
    var that = this;

    this.pubSub = pubSub;
    this.dashboardWidthFixerService = dashboardWidthFixerService;
    this.dashboardDataSetPreviewService = dashboardDataSetPreviewService;
    this.dashboardExpandablePanelService = dashboardExpandablePanelService;

    this.dashboardWidthFixerService.fixer.push(function () {
      that.style = {
        left: this.fixedWidth + 1
      };
    });

    this.pubSub.on('expandFinished', function () {
      this.animationFinished = true;
    }.bind(this));

    this.dashboardExpandablePanelService.collapser.push(function () {
      this.animationFinished = false;
    }.bind(this));
  }

  return {
    controller: [
      'pubSub',
      'dashboardWidthFixerService',
      'dashboardDataSetPreviewService',
      'dashboardExpandablePanelService',
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
