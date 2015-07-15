angular.module('refineryAnalyses').directive("rpAnalysesCancelConfirm", rpAnalysesCancelConfirm);


function rpAnalysesCancelConfirm() {
  "use strict";
  return {
    controller: 'AnalysesCtrl',
    link: function (scope, element, attr) {
     // var msg = attr.ngConfirmClick || "Are you sure?";
      var msg = "<h3>Cancel Analysis?</h3><p>Are you sure you want to" +
        " cancel this analysis?</p>";
      var clickAction = attr.confirmedClick;
      element.bind('click', function (event) {
        //
        //if (window.confirm(msg)) {
        //  scope.$eval(clickAction)
        //}

        bootbox.confirm( msg, function(result) {
          if (result) {
          scope.$eval(clickAction);
          }
        });
      });
    }
  };
}
