angular.module('refineryAnalyses')
  .directive("rpAnalysesInputTooltip", rpAnalysesInputTooltip);

function rpAnalysesInputTooltip() {
  "use strict";

  return {
    restrict: 'A',
    link: function(scope, element, attrs)
      {
        $(element)
          .attr('title','Workflow input files are being downloaded into the Refinery file store.')
          .attr('data-container',"body")
          .tooltip({placement: "bottom"});
      }
  };
}
