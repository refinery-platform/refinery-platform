'use strict';

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

angular
  .module('refineryDashboard')
  .controller('ExpansionPanelCtrl', [
    'settings',
    'dashboardWidthFixerService',
    ExpansionPanelCtrl
  ]);
