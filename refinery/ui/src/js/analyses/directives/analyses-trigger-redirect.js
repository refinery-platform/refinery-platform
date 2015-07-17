angular.module('refineryAnalyses')
  .directive("rpAnalysesTriggerRedirect", rpAnalysesTriggerRedirect);

function rpAnalysesTriggerRedirect() {
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

