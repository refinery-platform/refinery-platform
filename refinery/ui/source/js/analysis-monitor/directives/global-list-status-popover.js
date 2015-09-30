angular
  .module('refineryAnalysisMonitor')
  .directive(
  "rfAnalysisMonitorGlobalListStatusPopover",
  ['$compile',
    '$templateCache',
    '$',
    '$timeout',
    '$rootScope',
    rfAnalysisMonitorGlobalListStatusPopover
  ]
);

function rfAnalysisMonitorGlobalListStatusPopover(
  $compile, $templateCache, $, $timeout, $rootScope
) {
  "use strict";

  return {
    restrict: "AE",
    controller: 'AnalysisMonitorCtrl',
    controllerAs: 'AMCtrl',
    link: function (scope, element, attrs) {
      //The script is in the base.html template.
      var template = $templateCache.get("analysesgloballist.html");
      var popOverContent = $compile(template)(scope);
      $rootScope.insidePopover = false;
      var options = {
        content: popOverContent,
        placement: "left",
        html: true,
        toggle: "popover",
      };
      $(element).popover(options);

      //catches all clicks, so popover will hide if you click anywhere other
      // than icon & popover
      $("body").on('click', function (e) {
        //starts api calls if icon is clicked
        if(e.target.id === 'global-analysis-status-run' ||
           e.target.id === 'global-analysis-status' ||
           e.target.id === 'global-analysis-status-run-div'){
          $('#global-analysis-status-run-div').tooltip('hide');
          $('#global-analysis-status').tooltip('hide');
          scope.AMCtrl.updateAnalysesGlobalList();
        }
        if ((e.target.id !== 'global-analysis-status-run' &&
          e.target.id !== 'global-analysis-status') &&
          e.target.id !== 'global-analysis-status-run-div' &&
          $(e.target).parents('.popover.in').length === 0) {
          $(element).popover('hide');
          scope.AMCtrl.cancelTimerGlobalList();
        }
      });
    },
  };
}
