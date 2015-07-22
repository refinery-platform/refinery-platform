angular.module('refineryAnalyses')
    .directive("rfAnalysesGlobalListStatusPopover", ['$compile', '$templateCache', '$', '$timeout', '$rootScope', rfAnalysesGlobalListStatusPopover]);

function rfAnalysesGlobalListStatusPopover($compile, $templateCache, $, $timeout, $rootScope) {
  "use strict";

  return {
    restrict: "AE",
    controller: 'AnalysesCtrl',
    controllerAs: 'AnalysesCtrl',
    link: function (scope, element, attrs) {
      var template = $templateCache.get("analysesgloballist.html");
      var popOverContent = $compile(template)(scope);
      $rootScope.insidePopover = false;
      var options = {
        content: popOverContent,
        placement: "bottom",
        html: true,
        date: scope.date,
      };
      $(element).popover(options);
      $(element).bind('mouseenter', function (e) {
        $timeout(function () {
            if (!$rootScope.insidePopover) {
                $(element).popover('show');
                scope.analysesPopoverEvents(element);
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
