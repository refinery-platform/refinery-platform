'use strict';

function rpAnalysisMonitorGlobalListStatusPopover (
  $
) {
  return {
    scope: {},
    restrict: 'AE',
    controller: 'AnalysisMonitorCtrl as AMCtrl',
    link: function (scope, element, attr, ctrl) {
      // The script is in the base.html template.
   //   $(element).popover(options);

      // catches all clicks, so popover will hide if you click anywhere other
      // than icon & popover
      $('body').on('click', function (e) {
        console.log('i am a click event');
        // starts api calls if icon is clicked
        if (e.target.id === 'global-analysis-status-run' ||
          e.target.id === 'global-analysis-status' ||
          e.target.id === 'global-analysis-status-run-div') {
          $('#global-analysis-status-run-div').tooltip('hide');
          $('#global-analysis-status').tooltip('hide');
          console.log('in the first iffy');
          ctrl.updateAnalysesGlobalList();
        }
        if ((e.target.id !== 'global-analysis-status-run' &&
          e.target.id !== 'global-analysis-status') &&
          e.target.id !== 'global-analysis-status-run-div' &&
          $(e.target).parents('.popover.in').length === 0) {
         // $(element).popover('hide');
          console.log('in the second iffy');
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
