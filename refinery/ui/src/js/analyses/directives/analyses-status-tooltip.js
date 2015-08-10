angular.module('refineryAnalyses')
  .directive("rpAnalysesStatusTooltip", rpAnalysesStatusTooltip);

function rpAnalysesStatusTooltip() {
  "use strict";

  return {
    restrict: 'A',
    link: function(scope, element, attrs) {

      switch(scope.analysis.status){
        case "SUCCESS":
          $(element)
          .attr('title', 'Analysis successful.')
          .attr('data-container', "body")
          .tooltip({placement: "bottom"});
          break;
        case "RUNNING":
           $(element)
          .attr('title', 'Analysis is running.')
          .attr('data-container', "body")
          .tooltip({placement: "bottom"});
          break;
        case "FAILURE":
          $(element)
          .attr('title', 'Analysis failed.')
          .attr('data-container', "body")
          .tooltip({placement: "bottom"});
          break;
        default:
              $(element)
          .attr('title', 'Analysis status unknown.')
          .attr('data-container', "body")
          .tooltip({placement: "bottom"});
          break;
      }
    }
  };
}
