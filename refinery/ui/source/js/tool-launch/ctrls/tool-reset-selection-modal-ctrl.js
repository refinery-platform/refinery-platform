(function () {
  'use strict';

  angular
    .module('refineryAnalysisLaunch')
    .controller('ToolResetSelectionModalCtrl', ToolResetSelectionModalCtrl);

  ToolResetSelectionModalCtrl.$inject = [
    '$log',
    '$scope',
    '$window',
    '$uibModalInstance',
    'fileRelationshipService',
    'toolParamsService',
    'toolSelectService'
  ];

  function ToolResetSelectionModalCtrl (
    $log,
    $scope,
    $window,
    $uibModalInstance,
    fileRelationshipService,
    toolParamsService,
    toolSelectService
  ) {
    var fileService = fileRelationshipService;
    var paramsService = toolParamsService;
    var toolService = toolSelectService;

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };

    $scope.confirm = function () {
      toolService.setSelectedTool(toolService.tempSelectTool);
      fileService.resetToolRelated();
      fileService.refreshFileMap();
      console.log(toolService.tempSelectTool);
      paramsService.refreshToolParams(toolService.tempSelectTool);
      $uibModalInstance.close('close');
    };
  }
})();
