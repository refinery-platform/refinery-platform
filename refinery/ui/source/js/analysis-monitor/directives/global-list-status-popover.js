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
        console.log($('#analysesCogIcon .popover').hasClass('in'));
        console.log(e.target);
        // starts api calls if icon is clicked
        if ((e.target.id === 'global-analysis-status-run' ||
          e.target.id === 'global-analysis-status' ||
          e.target.id === 'global-analysis-status-run-div') &&
          !$('#analysesCogIcon .popover').hasClass('in')) {
          // popover is being opened for the first time
          console.log('in the first iffy');
          $('#global-analysis-status-run-div').tooltip('hide');
          $('#global-analysis-status').tooltip('hide');
          ctrl.updateAnalysesGlobalList();
        } else if (e.target.id === 'global-analysis-status-run' ||
          e.target.id === 'global-analysis-status' ||
          e.target.id === 'global-analysis-status-run-div' &&
          $('#analysesCogIcon .popover').hasClass('in')
        ) { // popover is open but is being triggered closed
          console.log('being closed');
          ctrl.cancelTimerGlobalList();
        } else if (!$('#analysesCogIcon .popover').hasClass('in')) {
          console.log('closed popover so cancel');
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
