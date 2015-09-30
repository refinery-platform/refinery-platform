angular.module('refineryAnalysisMonitor')
  .directive("rpAnalysisMonitorCancelConfirm", rpAnalysisMonitorCancelConfirm);


function rpAnalysisMonitorCancelConfirm() {
  "use strict";
  return {
    controller: 'AnalysisMonitorCtrl',
    link: function (scope, element, attr) {
      var msg = "<h3>Cancel Analysis?</h3><p>Are you sure you want to" +
        " cancel this analysis?</p>";
      var clickAction = attr.confirmedClick;
      element.bind('click', function (event) {
        bootbox.confirm( msg, function(result) {
          if (result) {
            scope.$eval(clickAction);
          }
        });
      });
    }
  };
}
