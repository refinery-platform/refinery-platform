angular.module('refineryAnalyses')
  .directive("rpAnalysesCancelTooltip", rpAnalysesCancelTooltip);

function rpAnalysesCancelTooltip() {
  "use strict";

  return {
    restrict: 'A',
    link: function(scope, element, attrs)
      {
        $(element)
          .attr('title','Cancel Analysis')
          .tooltip({placement: "right"});
      }
  };
}

