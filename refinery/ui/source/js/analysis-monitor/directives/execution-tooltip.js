angular.module('refineryAnalysisMonitor')
  .directive("rpAnalysisMonitorExecutionTooltip", rpAnalysisMonitorExecutionTooltip);

function rpAnalysisMonitorExecutionTooltip() {
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
