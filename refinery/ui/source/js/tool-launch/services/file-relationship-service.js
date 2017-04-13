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
    vm.currentGroup = []; // index for the group coordinates
    vm.currentTypes = []; // tracks whether depths are pair or list
    vm.groupCollection = {}; // contains groups with their selected row's info
    vm.inputFileTypes = []; // maintains the required input types
    vm.refreshFileMap = refreshFileMap; // method
    vm.resetCurrents = resetCurrents; // method
    vm.setGroupCollection = setGroupCollection; // method
    vm.setNodeSelectCollection = setNodeSelectCollection; // method
    vm.nodeSelectCollection = {}; // contains rows and their group info

    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */

    // convert attributes array to attributes obj
    function generateAttributeObj () {
      var attributeArr = fileBrowserFactory.assayAttributes;
      for (var i = 0; i < attributeArr.length; i ++) {
        vm.attributesObj[attributeArr[i].display_name] = attributeArr[i].internal_name;
      }
    }


    function setGroupCollection (inputTypeUuid, selectionObj) {
      var nodeUuid = nodeService.activeNodeRow.uuid;
      if (selectionObj[inputTypeUuid]) {
        if (_.has(vm.groupCollection, vm.currentGroup) === false) {
          vm.groupCollection[vm.currentGroup] = {};
        }
        if (_.has(vm.groupCollection[vm.currentGroup], inputTypeUuid) === false) {
          vm.groupCollection[vm.currentGroup][inputTypeUuid] = [];
        }
        vm.groupCollection[vm.currentGroup][inputTypeUuid].push(nodeService.activeNodeRow);
      } else {
        // remove property
        for (var i = 0; i < vm.groupCollection[vm.currentGroup][inputTypeUuid].length; i ++) {
          if (vm.groupCollection[vm.currentGroup][inputTypeUuid][i].uuid === nodeUuid) {
            vm.groupCollection[vm.currentGroup][inputTypeUuid].splice(i, 1);
            break;
          }
        }
      }
    }

    function setNodeSelectCollection (inputTypeUuid, selectionObj) {
      var nodeUuid = nodeService.activeNodeRow.uuid;
      if (selectionObj[inputTypeUuid]) {
        if (_.has(vm.nodeSelectCollection, nodeUuid) === true) {
          vm.nodeSelectCollection[nodeUuid].inputTypeList.push(inputTypeUuid);
          vm.nodeSelectCollection[nodeUuid].groupList.push(angular.copy(vm.currentGroup));
        } else {
          vm.nodeSelectCollection[nodeUuid] = {
            inputTypeList: [inputTypeUuid],
            groupList: [angular.copy(vm.currentGroup)]
          };
        }
      } else {
        // remove property
        for (var i = 0; i < vm.nodeSelectCollection[nodeUuid].inputTypeList.length; i ++) {
          if (vm.nodeSelectCollection[nodeUuid].groupList[i] === vm.currentGroup) {
            vm.nodeSelectCollection[nodeUuid].groupList.splice(i, 1);
            vm.nodeSelectCollection[nodeUuid].inputTypeList.splice(i, 1);
            break;
          }
        }
      }
    }

    // used to initialize the tool's data structure used by vm
    function refreshFileMap () {
      var scaledCopy = toolsService.selectedTool.file_relationship;
      // this is an array
      while (scaledCopy.file_relationship.length > 0) {
        vm.currentGroup.push(0);
        vm.currentTypes.push(scaledCopy.value_type);
        scaledCopy = scaledCopy.file_relationship[0];
      }
      angular.copy(scaledCopy.input_files, vm.inputFileTypes);
      vm.currentTypes.push(scaledCopy.value_type);
      generateAttributeObj();
      return vm.currentGroup;
    }

    function resetCurrents () {
      vm.currentGroup = [];
      vm.currentTypes = [];
      vm.inputFileTypes = [];
    }
  }
})();
