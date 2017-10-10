'use strict';

function rpAnalysisMonitorGlobalListStatusPopover () {
  return {
    scope: {},
    restrict: 'AE',
    controller: 'AnalysisMonitorCtrl as AMCtrl',
    link: function (scope, element, attr, ctrl) {
      // The script is in the global-list-status.html template.
      element.on('click', function () {
        if (!element.find('.popover').hasClass('in')) {
          element.find('#global-analysis-status-run-div').tooltip('hide');
          element.find('#global-analysis-status').tooltip('hide');
          ctrl.updateAnalysesGlobalList();
        }
      });
    }
  };
}

angular
  .module('refineryAnalysisMonitor')
  .directive('rpAnalysisMonitorGlobalListStatusPopover', [
    rpAnalysisMonitorGlobalListStatusPopover
  ]);
