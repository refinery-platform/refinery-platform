/**
 * Tool Reset Selection Modal Ctrl
 * @namespace ToolResetSelectionModalCtrl
 * @desc Modal controller when user selects a different tool but already has
 * started configurations.
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('ToolResetSelectionModalCtrl', ToolResetSelectionModalCtrl);

  ToolResetSelectionModalCtrl.$inject = [
    '$uibModalInstance',
    'fileRelationshipService',
    'selectedTool',
    'toolParamsService',
    'toolSelectService'
  ];

  function ToolResetSelectionModalCtrl (
    $uibModalInstance,
    fileRelationshipService,
    selectedTool,
    toolParamsService,
    toolSelectService
  ) {
    var fileService = fileRelationshipService;
    var paramsService = toolParamsService;
    var toolService = toolSelectService;
    var vm = this;
    vm.cancel = cancel;
    vm.confirm = confirm;

    function cancel () {
      $uibModalInstance.dismiss('cancel');
    }

    function confirm () {
      toolService.setSelectedTool(selectedTool);
      fileService.resetToolRelated();
      fileService.refreshFileMap();
      paramsService.refreshToolParams(toolService.selectedTool);
      $uibModalInstance.close('close');
    }
  }
})();
