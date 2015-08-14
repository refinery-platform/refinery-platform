angular.module('refineryExternalToolStatus')
    .directive("externalToolStatusPopover", ['$compile', '$templateCache', '$', externalToolStatusPopover]);

function externalToolStatusPopover($compile, $templateCache, $) {
  "use strict";

  return {
    restrict: "AE",
    link: function (scope, element, attrs) {
      var template = $templateCache.get("externaltool.html");
      var popOverContent = $compile(template)(scope);

      var options = {
          content: popOverContent,
          placement: "left",
          html: true,
          date: scope.date,
          trigger: "click",
          toggle: "popover"
      };
      $(element).popover(options);

      $("body").on('click', function (e) {
      //starts api calls if icon is clicked
        if(e.target.id === 'global-tool-icon-success' ||
           e.target.id === 'global-tool-icon-warning' ||
           e.target.id === 'global-tool-icon-error'||
           e.target.id === 'global-tool-icon-unknown')
        {
          $('#'+ e.target.id).tooltip('hide');
        }

        if(e.target.id !== 'global-tool-icon-success' &&
           e.target.id !== 'global-tool-icon-warning' &&
           e.target.id !== 'global-tool-icon-error' &&
           e.target.id !== 'global-tool-icon-unknown' &&
          $(e.target).parents('.popover.in').length === 0)
        {
          $(element).popover('hide');
        }
      });
    }
  };
}
