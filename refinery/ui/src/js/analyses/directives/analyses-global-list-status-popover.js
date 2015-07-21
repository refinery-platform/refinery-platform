angular.module('refineryAnalyses')
    .directive("rfAnalysesGlobalListStatusPopover", ['$compile', '$templateCache', '$', rfAnalysesGlobalListStatusPopover]);

function rfAnalysesGlobalListStatusPopover($compile, $templateCache, $) {
    "use strict";

    return {
        restrict: "AE",

        link: function (scope, element, attrs) {
            var template = $templateCache.get("analysesgloballist.html");
            var popOverContent = $compile(template)(scope);

            var options = {
                content: popOverContent,
                placement: "bottom",
                html: true,
                date: scope.date,
                trigger: "hover"
            };
            $(element).popover(options);
        }
    };
}
