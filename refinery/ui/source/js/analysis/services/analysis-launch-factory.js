angular.module('refineryAnalysis')
    .factory("analysisLaunchFactory", ['$http','$rootScope','$log', analysesLaunchFactory]);

function analysesLaunchFactory($http, $rootScope, $log) {
  "use strict";

  var postLaunchAnalysis = function (paramObj) {
    return(
      $http({
        method: 'POST',
        url: '/analysis_manager/run/',
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        data: paramObj,
      }).success(function (response) {
        $log.debug("Launching analysis with config:");
        $log.debug("Workflow: " + paramObj.workflowUuid);
        $log.debug("NodeSET: " + paramObj.nodeSetUuid);
        $log.debug("NodeREL: " + paramObj.nodeRelationshipUuid);
         $rootScope.$broadcast('rf/launchAnalysis');
      }).error(function (response, status) {
        $log.debug("Request failed: error " + status);
      })
    );
  };

 return{
   postLaunchAnalysis: postLaunchAnalysis
 };
}

