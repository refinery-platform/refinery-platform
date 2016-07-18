'use strict';

function analysesStartFactory ($http, $rootScope, $log) {
  var postStartAnalysis = function (paramObj) {
    return (
    $http({
      method: 'POST',
      url: '/analysis_manager/run/',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      },
      data: paramObj
    }).success(function () {
      $log.debug('Starting analysis with config:');
      $log.debug('Workflow: ' + paramObj.workflowUuid);
     // $log.debug('NodeSET: ' + paramObj.nodeSetUuid);
      $log.debug('NodeREL: ' + paramObj.nodeRelationshipUuid);
      // $rootScope.$broadcast('rf/launchAnalysis');
    }).error(function (response, status) {
      $log.debug('Request failed: error ' + status);
    })
    );
  };

  return {
    postStartAnalysis: postStartAnalysis
  };
}

angular
  .module('refineryAnalysisStart')
  .factory('analysisStartFactory', [
    '$http', '$rootScope', '$log', analysesStartFactory
  ]);
