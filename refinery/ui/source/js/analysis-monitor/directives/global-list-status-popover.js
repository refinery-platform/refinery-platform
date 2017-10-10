'use strict';

function rpAnalysisMonitorGlobalListStatusPopover (
  $
) {
  return {
    scope: {},
    restrict: 'AE',
    controller: 'AnalysisMonitorCtrl as AMCtrl',
    link: function (scope, element, attr, ctrl) {
      // The script is in the global-list-status.html template.

      // catches all clicks, so popover will hide if you click anywhere other
      // than icon & popover
      $('body').on('click', function (e) {
        // starts api calls if icon is clicked
        if ((e.target.id === 'global-analysis-status-run' ||
          e.target.id === 'global-analysis-status' ||
          e.target.id === 'global-analysis-status-run-div') &&
          !$('#analysesCogIcon .popover').hasClass('in')) {
          $('#global-analysis-status-run-div').tooltip('hide');
          $('#global-analysis-status').tooltip('hide');
          ctrl.updateAnalysesGlobalList();
        } else if ($(e.target).parents('.popover.in').length === 0 &&
          $('#analysesCogIcon .popover').hasClass('in')) {
          // popover is being closed
          ctrl.cancelTimerGlobalList();
        }
      });
    }
  };
}

angular
  .module('refineryAnalysisMonitor')
  .directive('rpAnalysisMonitorGlobalListStatusPopover', [
    '$',
    rpAnalysisMonitorGlobalListStatusPopover
  ]);
