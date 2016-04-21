'use strict';

function refineryExpansionPanel () {
  function ExpansionPanelCtrl (settings, dashboardWidthFixerService) {
    var that = this;

    dashboardWidthFixerService.fixer.push(function () {
      that.style = {
        left: this.fixedWidth + 1
      };
    });

    if (settings.djangoApp.repositoryMode) {
      dashboardWidthFixerService.trigger('fixer');
    }
  }

  return {
    controller: [
      'settings',
      'dashboardWidthFixerService',
      ExpansionPanelCtrl
    ],
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
