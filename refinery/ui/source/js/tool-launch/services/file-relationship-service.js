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
    vm.attributesObj = {}; // displayName: internalName, ex Name:
    vm.currentGroup = []; // index for the group coordinates
    vm.currentTypes = []; // tracks whether depths are pair or list
    vm.groupCollection = {}; // contains groups with their selected row's info
    vm.inputFileTypes = []; // maintains the required input types
    vm.refreshFileMap = refreshFileMap;
    vm.resetCurrents = resetCurrents;
    vm.setGroupCollection = setGroupCollection;
    vm.setNodeSelectCollection = setNodeSelectCollection;
    vm.nodeSelectCollection = {}; // contains rows and their group info
    /*
    *-----------------------
    * Method Definitions
    * ----------------------
    */
    // helper method: convert attributes name array to attributes name obj,
    // displayName: internalName
    function generateAttributeObj () {
      var attributeArr = fileBrowserFactory.assayAttributes;
      for (var i = 0; i < attributeArr.length; i ++) {
        vm.attributesObj[attributeArr[i].display_name] = attributeArr[i].internal_name;
      }
    }

    /**
     * Generates obj with groups with input file types and their selected
     * node uuid
     * @param {string} inputTypeUuid - uuid of the input file type from tool
     * definitions api
     * @param {obj} selectionObj - ui-select model tracks checkboxes
     * @param {string} deselectedFileUuid - OPTIONAL, uuid of deselected node
     */
    function setGroupCollection (inputTypeUuid, selectionObj, deselectedFileUuid) {
      var nodeUuid = deselectedFileUuid;
      // Node isn't deselected, grab the active row's uuid.
      if (!nodeUuid) {
        nodeUuid = nodeService.activeNodeRow.uuid;
      }
      // checkbox selected
      if (selectionObj[inputTypeUuid]) {
        if (_.has(vm.groupCollection, vm.currentGroup) === false) {
          // intialize groupCollection[groupId]
          vm.groupCollection[vm.currentGroup] = {};
        }
        if (_.has(vm.groupCollection[vm.currentGroup], inputTypeUuid) === false) {
          // add inputTypes to groupCollectio[groupId]
          vm.groupCollection[vm.currentGroup][inputTypeUuid] = [];
        }
        vm.groupCollection[vm.currentGroup][inputTypeUuid].push(
          angular.copy(nodeService.activeNodeRow)
        );
      } else {
        // remove property when checkbox deselected
        for (var i = 0; i < vm.groupCollection[vm.currentGroup][inputTypeUuid].length; i ++) {
          if (vm.groupCollection[vm.currentGroup][inputTypeUuid][i].uuid === nodeUuid) {
            vm.groupCollection[vm.currentGroup][inputTypeUuid].splice(i, 1);
            break;
          }
        }
      }
    }

   /**
     * Generates obj with node uuids and their associated input file
     * types and groups.
     * @param {string} inputTypeUuid - uuid of the input file type from tool
     * definitions api
     * @param {obj} selectionObj - ui-select model tracks checkboxes
     * @param {string} deselectedFileUuid - OPTIONAL, uuid of deselected node
     */
    function setNodeSelectCollection (inputTypeUuid, selectionObj, deselectedFileUuid) {
      // Node isn't deselected, grab the active row's uuid.
      var nodeUuid = deselectedFileUuid;
      if (!nodeUuid) {
        nodeUuid = nodeService.activeNodeRow.uuid;
      }
      // checkbox selected
      if (selectionObj[inputTypeUuid]) {
        if (_.has(vm.nodeSelectCollection, nodeUuid) === true) {
          vm.nodeSelectCollection[nodeUuid].inputTypeList.push(angular.copy(inputTypeUuid));
          vm.nodeSelectCollection[nodeUuid].groupList.push(angular.copy(vm.currentGroup));
        } else {
          // intialize nodeSelectionCollection
          vm.nodeSelectCollection[nodeUuid] = {
            inputTypeList: [inputTypeUuid],
            groupList: [angular.copy(vm.currentGroup)]
          };
        }
      } else {
            // remove property when checkbox deselected
        for (var i = 0; i < vm.nodeSelectCollection[nodeUuid].inputTypeList.length; i ++) {
          if (vm.nodeSelectCollection[nodeUuid].groupList[i] === vm.currentGroup) {
            vm.nodeSelectCollection[nodeUuid].groupList.splice(i, 1);
            vm.nodeSelectCollection[nodeUuid].inputTypeList.splice(i, 1);
            break;
          }
        }
      }
    }

    /**
     * Parses the tool definition api response into usable data structure by
     * views. File_relationship is a self-reference nested structure.
     * ex: file_relationship: [{file_relationship: []}]
     */
    function refreshFileMap () {
      var scaledCopy = toolsService.selectedTool.file_relationship;
      // initialize groups and types
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

    /**
     * Resets the variables needed for new tool selection
     */
    function resetCurrents () {
      vm.currentGroup = [];
      vm.currentTypes = [];
      vm.inputFileTypes = [];
    }
  }
})();
