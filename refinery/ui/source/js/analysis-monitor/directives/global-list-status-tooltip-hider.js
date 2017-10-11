// (function () {
//  'use strict';
//  angular
//    .module('refineryAnalysisMonitor')
//    .component('rpAnalysisMonitorGlobalListStatusPopover', {
//      controller: 'AnalysisMonitorCtrl'
//    });
// })();
//

'use strict';

function rpAnalysisMonitorGlobalListStatusTooltipHider () {
  return {
    scope: {},
    restrict: 'A',
    link: function (scope, element) {
      // The script is in the global-list-status.html template.
      element.on('click', function () {
        if (!element.find('.popover').hasClass('in')) {
          element.find('#global-analysis-status-run-div').tooltip('hide');
          element.find('#global-analysis-status').tooltip('hide');
        }
      });
    }
  };
}


angular
  .module('refineryAnalysisMonitor')
  .directive('rpAnalysisMonitorGlobalListStatusTooltipHider', [
    rpAnalysisMonitorGlobalListStatusTooltipHider
  ]);
