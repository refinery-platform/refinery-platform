'use strict';

function AnalysisLaunchModalCtrl (
  $log,
  $scope,
  $window,
  $uibModalInstance,
  timeStamp,
  workflow,
  analysisLaunchConfigService,
  analysisLaunchFactory,
  selectedNodesService,
  nodeGroupService
) {
  var nowTimeStamp = timeStamp.getTimeStamp();
  var workflowName = workflow.getName();

  $scope.analysisLaunchFlag = 'NOCALL';
  $scope.dataObj = {
    name: workflowName + ' ' + nowTimeStamp
  };
  analysisLaunchConfigService.setAnalysisConfig(
    {
      workflowUuid: workflow.getUuid()
    }
  );

  var launchAnalysis = function (params) {
    analysisLaunchConfigService.setAnalysisConfig(params);
    var launchParams = analysisLaunchConfigService.getAnalysisConfig();
    analysisLaunchFactory.postLaunchAnalysis(launchParams)
      .then(function () {
        $scope.analysisLaunchFlag = 'SUCCESS';
      }, function (error) {
        $log.log(error);
        $scope.analysisLaunchFlag = 'FAILED';
      });
  };

  $scope.ok = function () {
    $scope.analysisLaunchFlag = 'LOADING';

    if ($scope.tempName !== null) {
      var paramsObj = {
        name: $scope.dataObj.name
      };
      if (selectedNodesService.selectedNodeGroupUuid.length > 0) {
        paramsObj.nodeGroupUuid = selectedNodesService.selectedNodeGroupUuid;
      }

      // update current selection nodes
      if (selectedNodesService.selectedNodeGroupUuid ===
        selectedNodesService.defaultCurrentSelectionUuid) {
        var params = {
          uuid: selectedNodesService.selectedNodeGroupUuid,
          assay: $window.externalAssayUuid
        };
        if (selectedNodesService.selectedAllFlag) {
          params.nodes = selectedNodesService.complementSelectedNodesUuids;
          params.use_complement_nodes = true;
        } else {
          params.nodes = selectedNodesService.selectedNodeUuids;
          params.use_complement_nodes = false;
        }

        nodeGroupService.update(params).$promise.then(function () {
          launchAnalysis(paramsObj);
        });
      } else {
        launchAnalysis(paramsObj);
      }
    }
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };

  $scope.close = function () {
    $uibModalInstance.close('close');
  };

  $scope.view = function () {
    $uibModalInstance.close('view');
    $window.location.href = '/data_sets/' + $window.dataSetUuid + '/#/analyses';
  };
}

angular
  .module('refineryAnalysisLaunch')
  .controller('AnalysisLaunchModalCtrl', [
    '$log',
    '$scope',
    '$window',
    '$uibModalInstance',
    'timeStamp',
    'workflow',
    'analysisLaunchConfigService',
    'analysisLaunchFactory',
    'selectedNodesService',
    'nodeGroupService',
    AnalysisLaunchModalCtrl
  ]);
