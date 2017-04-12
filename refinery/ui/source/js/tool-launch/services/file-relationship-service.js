(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .service('fileRelationshipService', fileRelationshipService);

  fileRelationshipService.$inject = [
    '_',
    'fileBrowserFactory',
    'selectedNodesService',
    'toolsService'
  ];

  function fileRelationshipService (
    _,
    fileBrowserFactory,
    selectedNodesService,
    toolsService
  ) {
    var nodeService = selectedNodesService;
    var vm = this;
    vm.attributesObj = {};
    vm.fileDepth = 0; // Roots are at depth 0
    vm.currentGroup = [];
    vm.currentTypes = []; // tracks whether depths are pair or list
    vm.inputFileTypes = []; // maintains the required input types
    vm.resetCurrents = resetCurrents;
    vm.refreshFileMap = refreshFileMap;
    vm.setToolInputGroup = setToolInputGroup;
    vm.toolInputGroups = {};

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */

    function setToolInputGroup (inputTypeUuid, selectionObj) {
      var nodeUuid = nodeService.activeNode;
      if (selectionObj[inputTypeUuid]) {
        if (_.has(vm.toolInputGroups, nodeUuid) === true) {
          vm.toolInputGroups[nodeUuid].inputTypeList.push(inputTypeUuid);
          vm.toolInputGroups[nodeUuid].groupList.push(angular.copy(vm.currentGroup));
        } else {
          vm.toolInputGroups[nodeUuid] = {
            inputTypeList: [inputTypeUuid],
            groupList: [angular.copy(vm.currentGroup)]
          };
        }
      } else {
        // remove property
        for (var i = 0; i < vm.toolInputGroups[nodeUuid].inputTypeList.length; i ++) {
          if (vm.toolInputGroups[nodeUuid].groupList[i] === vm.currentGroup) {
            vm.toolInputGroups[nodeUuid].groupList.splice(i, 1);
            vm.toolInputGroups[nodeUuid].inputTypeList.splice(i, 1);
            break;
          }
        }
      }
    }

    function resetCurrents () {
      vm.fileDepth = 0;
      vm.currentGroup = [];
      vm.currentTypes = [];
      vm.inputFileTypes = [];
    }
    // convert attributes array to attributes obj
    function generateAttributeObj () {
      var attributeArr = fileBrowserFactory.assayAttributes;
      for (var i = 0; i < attributeArr.length; i ++) {
        vm.attributesObj[attributeArr[i].display_name] = attributeArr[i].internal_name;
      }
    }

    // used to initialize the tool's data structure used by vm
    function refreshFileMap () {
      var scaledCopy = toolsService.selectedTool.file_relationship;
      // this is an array
      while (scaledCopy.file_relationship.length > 0) {
        vm.fileDepth++;
        vm.currentGroup.push(0);
        vm.currentTypes.push(scaledCopy.value_type);
        scaledCopy = scaledCopy.file_relationship[0];
      }
      angular.copy(scaledCopy.input_files, vm.inputFileTypes);
      vm.currentTypes.push(scaledCopy.value_type);
      generateAttributeObj();
      return vm.currentGroup;
    }
  }
})();
