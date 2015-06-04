angular.module('refineryExternalToolStatus')
    .directive("externalToolStatusPopover", ['$compile', '$templateCache', externalToolStatusPopover]);

function externalToolStatusPopover($compile,$templateCache) {
    "use strict";

    return {
        restrict: "AE",

        link: function (scope, element, attrs) {
            var template = $templateCache.get("externaltool.html");
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