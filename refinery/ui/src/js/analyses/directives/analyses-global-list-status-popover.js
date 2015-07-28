angular.module('refineryAnalyses')
    .directive("rfAnalysesGlobalListStatusPopover", ['$compile', '$templateCache', '$', '$timeout', '$rootScope', rfAnalysesGlobalListStatusPopover]);

function rfAnalysesGlobalListStatusPopover($compile, $templateCache, $, $timeout, $rootScope) {
  "use strict";

  return {
    restrict: "AE",
    controller: 'AnalysesCtrl',
    controllerAs: 'analysesCtrl',
    link: function (scope, element, attrs) {
      //The script is in the base.html template.
      var template = $templateCache.get("analysesgloballist.html");
      var popOverContent = $compile(template)(scope);
      $rootScope.insidePopover = false;
      var options = {
        content: popOverContent,
        placement: "left",
        html: true,
        date: scope.date,
      };
      $(element).popover(options);
      $(element).bind('mouseenter', function (e) {
        scope.analysesCtrl.updateAnalysesGlobalList();
        $timeout(function () {
            if (!$rootScope.insidePopover) {
                $(element).popover('show');
                scope.analysesCtrl.analysesPopoverEvents(element);
            }
        }, 200);
      });
      $(element).bind('mouseleave', function (e) {
        $timeout(function () {
            if (!$rootScope.insidePopover) {
                $(element).popover('hide');
            }
        }, 400);
      });
    },
  };
}
