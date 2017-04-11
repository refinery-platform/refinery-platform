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
    vm.selectNode = selectNode;
    vm.selectionObj = {};
    vm.toolInputGroups = {};

  /*
   * ---------------------------------------------------------
   * Method
   * ---------------------------------------------------------
   */

    function selectNode (inputTypeUuid) {
      var nodeUuid = nodeService.activeNode;
      console.log(nodeUuid);
      console.log(vm.selectionObj[inputTypeUuid]);
      console.log(vm.toolInputGroups);
      if (vm.selectionObj[inputTypeUuid]) {
        if (_.has(vm.toolInputGroups, nodeUuid) === true) {
          vm.toolInputGroups[nodeUuid].inputTypeList.push(inputTypeUuid);
          vm.toolInputGroups[nodeUuid].groupList.push(fileService.currentPosition);
        } else {
          vm.toolInputGroups[nodeUuid] = {
            inputTypeList: [inputTypeUuid],
            groupList: [fileService.currentPosition]
          };
        }
      } else {
        // remove property
        for (var i = 0; i < vm.toolInputGroups[nodeUuid].inputTypeList.length; i ++) {
          if (vm.toolInputGroups[nodeUuid].groupList[i] === fileService.currentPosition) {
            vm.toolInputGroups[nodeUuid].groupList.splice(i, 1);
            vm.toolInputGroups[nodeUuid].inputTypeList.splice(i, 1);
            break;
          }
        }
      }
      console.log(vm.toolInputGroups);
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
  }
})();
