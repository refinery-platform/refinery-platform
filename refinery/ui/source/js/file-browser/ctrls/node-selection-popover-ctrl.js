(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('NodeSelectionPopoverCtrl', NodeSelectionPopoverCtrl);

  NodeSelectionPopoverCtrl.$inject = [
    '$scope',
    '_',
    'fileRelationshipService',
    'selectedNodesService'
  ];


  function NodeSelectionPopoverCtrl (
    $scope,
    _,
    fileRelationshipService,
    selectedNodesService
  ) {
    var fileService = fileRelationshipService;
    var nodeService = selectedNodesService;
    var vm = this;
    vm.inputFileTypes = [];
    vm.currentGroup = fileService.currentGroup;
    vm.currentTypes = fileService.currentTypes;
    vm.currentRow = nodeService.activeNodeRow;
    vm.selectNode = selectNode;
    vm.selectionObj = {};
    vm.nodeSelection = fileService.nodeSelectCollection;
    vm.currentRow = fileService.currentRow;
    vm.attributes = fileService.attributesObj;
    vm.groupCollection = fileService.groupCollection;

  /*
   * ---------------------------------------------------------
   * Method
   * ---------------------------------------------------------
   */

    function selectNode (inputUuid) {
      vm.currentRow = nodeService.activeNodeRow;
      fileService.setNodeSelectCollection(inputUuid, vm.selectionObj);
      fileService.setGroupCollection(inputUuid, vm.selectionObj);
      vm.groupCollection = fileService.groupCollection;
    }

  /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    // MOVE TO A SEPERATE DIRECTIVE
    $scope.$watchCollection(
      function () {
        return fileService.inputFileTypes;
      },
      function () {
        vm.inputFileTypes = fileService.inputFileTypes;
      }
    );

    $scope.$watchCollection(
      function () {
        return fileService.currentGroup;
      },
      function () {
        vm.currentGroup = fileService.currentGroup;
        vm.currentTypes = fileService.currentTypes;
      }
    );
  }
})();
