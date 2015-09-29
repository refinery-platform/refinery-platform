angular.module('refineryAnalyses')
  .directive("rpAnalysesExecutionTooltip", rpAnalysesExecutionTooltip);

function rpAnalysesExecutionTooltip() {
  "use strict";

  return {
    restrict: 'A',
    link: function(scope, element, attrs)
      {
        $(element)
          .attr('title','Workflow inputs are being uploaded into the workflow engine and the workflow is being executed.')
          .attr('data-container',"body")
          .tooltip({placement: "bottom"});
      }
  };
}
