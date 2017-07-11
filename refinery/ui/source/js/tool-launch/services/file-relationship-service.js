/**
 * File Relationship Service
 * @namespace fileRelationshipService
 * @desc Service which maintains processes the tool's fileRelationship
 * structure and creates and updates the digestable data structures. Also
 * tracks display colors for input files
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';
  angular
    .module('refineryToolLaunch')
    .service('fileRelationshipService', fileRelationshipService);

  fileRelationshipService.$inject = [
    '_',
    'fileBrowserFactory',
    'activeNodeService',
    'toolSelectService'
  ];

  function fileRelationshipService (
    _,
    fileBrowserFactory,
    activeNodeService,
    toolSelectService
  ) {
    // each input file type will have a color associated with it, rgb
    var colorSelectionArray = [
      '0,158,115', '204,121,167', '86,180,233',
      '230,159,0', '240,228,66', '213,94,0'
    ];
    var nodeService = activeNodeService;
    var toolService = toolSelectService;
    var vm = this;
    vm.attributesObj = {}; // displayName: internalName, ex Name:
    vm.currentGroup = []; // index for the group coordinates
    vm.currentTypes = []; // tracks whether depths are pair or list
    vm.depthNames = []; // tracks whether depth names
    vm.groupCollection = {}; // contains groups with their selected row's info
    // {groupId: {'0,0': {'inputTypeUuid: [{nodeDOM1}, {nodeDOM2}]}}
    vm.hideNodePopover = false;
    vm.inputFileTypes = []; // maintains the required input types
    vm.inputFileTypeColor = {}; // inputFileTypeUuids: hex color
    vm.nodeSelectCollection = {}; // contains rows and their group info, ex:
    // {nodeUuid: {'groupList': [[0,0], [1,0]], 'inputTypeList': [uuid1, uuid2]}
    vm.refreshFileMap = refreshFileMap;
    vm.reindexCollections = reindexCollections;
    vm.removeGroupFromCollections = removeGroupFromCollections;
    vm.resetInputGroup = resetInputGroup;
    vm.resetToolRelated = resetToolRelated;
    vm.setGroupCollection = setGroupCollection;
    vm.setNodeSelectCollection = setNodeSelectCollection;
    /*
     *-----------------------
     * Method Definitions
     * ----------------------
     */
    /**
     * @name associateColorToInputFileType
     * @desc helper method which generates the vm.inputFileTypeColor by
     * assigning a pre-defined color to a list of inputFileTypes
     * @memberOf refineryToolLaunch.fileRelationshipService
    **/
    function associateColorToInputFileType () {
      var colorInd = 0;
      for (var fileInd = 0; fileInd < vm.inputFileTypes.length; fileInd++) {
        if (colorInd > colorSelectionArray.length) {
          colorInd = 0;
        }
        vm.inputFileTypeColor[vm.inputFileTypes[fileInd].uuid] = colorSelectionArray[colorInd];
        colorInd++;
      }
    }

    /**
     * @name generateAttributeObj
     * @desc helper method: convert attributes name array to attributes name
     * obj, displayName: internalName
     * @memberOf refineryToolLaunch.fileRelationshipService
    **/
    function generateAttributeObj () {
      var attributeArr = fileBrowserFactory.assayAttributes;
      for (var i = 0; i < attributeArr.length; i++) {
        if (attributeArr[i].internal_name !== 'Selection' &&
          attributeArr[i].display_name !== 'Input Groups') {
          vm.attributesObj[attributeArr[i].display_name] = attributeArr[i].internal_name;
        }
      }
    }

    /**
     * @name refreshFileMap
     * @desc  Parses the tool definition api response into usable data structure by
     * views. File_relationship is a self-reference nested structure.
     * ex: file_relationship: [{file_relationship: []}]
     * @memberOf refineryToolLaunch.fileRelationshipService
    **/
    function refreshFileMap () {
      if (_.isEmpty(toolService.selectedTool.file_relationship)) {
        return;
      }
      var scaledCopy = toolService.selectedTool.file_relationship;
      // initialize groups and types
      while (scaledCopy.file_relationship.length > 0) {
        vm.currentGroup.push(0);
        vm.currentTypes.push(scaledCopy.value_type);
        vm.depthNames.push(scaledCopy.name);
        scaledCopy = scaledCopy.file_relationship[0];
      }
      angular.copy(scaledCopy.input_files, vm.inputFileTypes);
      associateColorToInputFileType();
      vm.currentTypes.push(scaledCopy.value_type);
      vm.depthNames.push(scaledCopy.name);
      // avoids having an empty string as a key
      if (vm.currentGroup.length === 0) {
        vm.currentGroup.push(0);
      }
      generateAttributeObj();
    }

    /**
     * @name reindexCollections
     * @desc  Main method reindexs the groupCollections,
      * nodeSelectCollections, and selectionObj
     * @memberOf refineryToolLaunch.fileRelationshipService
    **/
    function reindexCollections () {
      // only need to reindex groups post deleted group
      var aheadGroup = angular.copy(vm.currentGroup);
      aheadGroup[0]++;
      var replaceGroup = angular.copy(vm.currentGroup);
      // find the next group which will replace the previous group
      angular.forEach(vm.groupCollection, function (inputObj, groupId) {
        // copying the next index to the previous and deleting the next index
        if (groupId === aheadGroup.join(',')) {
          // need to update each inputObj (can be 1 or 2 items if list or pair)
          angular.forEach(inputObj, function (selectArr, inputUuid) {
            // initialize the group when missing
            if (!_.has(vm.groupCollection, replaceGroup.join(','))) {
              vm.groupCollection[replaceGroup.join(',')] = {};
            }
            vm.groupCollection[replaceGroup.join(',')][inputUuid] = [];
            // have to deep copy each dom Object in the arr
            for (var domInd = 0; domInd < selectArr.length; domInd++) {
              // initialize the dom object
              vm.groupCollection[replaceGroup.join(',')][inputUuid][domInd] = {};
              angular.copy(
                selectArr[domInd],
                vm.groupCollection[replaceGroup.join(',')][inputUuid][domInd]
              );
              var nodeUuid = vm.groupCollection[aheadGroup.join(',')][inputUuid][domInd].uuid;
              reindexNodeSelectCollection(nodeUuid, replaceGroup, aheadGroup);
            }

            reindexSelectionObj(inputUuid, replaceGroup, aheadGroup);
          });
          replaceGroup[0]++;
          aheadGroup[0]++;
          delete nodeService.selectionObj[groupId];
          delete vm.groupCollection[groupId];
        }
      });
    }

    /**
     * @name reindexNodeSelectCollection
     * @desc  Helper method reindexes nodeSelectCollection for UI, ex if group
     * 1 was deleted, group 2 would become group 1
     * @memberOf refineryToolLaunch.fileRelationshipService
     * @param {str} nodeUuid - a node uuid
     * @param {array} replaceGroup - array of group ID, current position
     * @param {array} aheadGroup - array of group ID, next position
    **/
    function reindexNodeSelectCollection (nodeUuid, replaceGroup, aheadGroup) {
      var groupListLen = vm.nodeSelectCollection[nodeUuid].groupList.length;
      for (var groupInd = 0; groupInd < groupListLen; groupInd++) {
        if (vm.nodeSelectCollection[nodeUuid]
            .groupList[groupInd].join(',') === aheadGroup.join(',')) {
          vm.nodeSelectCollection[nodeUuid].groupList[groupInd] = angular.copy(replaceGroup);
        }
      }
    }

    /**
     * @name reindexSelectionObj
     * @desc  Helper method reindexes selectionObj for UI, ex if group 1 was
     * deleted, group 2 would become group 1
     * @memberOf refineryToolLaunch.fileRelationshipService
     * @param {str} inputUuid - input type uuid
     * @param {array} replaceGroup - array of group ID, current position
     * @param {array} aheadGroup - array of group ID, next position
    **/
    function reindexSelectionObj (inputUuid, replaceGroup, aheadGroup) {
      if (!_.has(nodeService.selectionObj, replaceGroup.join(','))) {
        nodeService.selectionObj[replaceGroup.join(',')] = {};
      }
      nodeService.selectionObj[replaceGroup.join(',')][inputUuid] = {};
      angular.copy(
        nodeService.selectionObj[aheadGroup.join(',')][inputUuid],
        nodeService.selectionObj[replaceGroup.join(',')][inputUuid]
      );
    }

    /**
     * @name removeGroupFromCollections
     * @desc  Main method to remove a group from the
        * groupCollection and nodeSelectCollections
     * @memberOf refineryToolLaunch.fileRelationshipService
    **/
    function removeGroupFromCollections () {
      angular.forEach(vm.groupCollection[vm.currentGroup], function (nodeArr, inputTypeUuid) {
        removeGroupFromNodeSelectCollection(nodeArr, inputTypeUuid);
      });

      // Delete groupID property from obj since it is empty
      delete vm.groupCollection[vm.currentGroup];
    }

    /**
     * @name removeGroupFromNodeSelectCollection
     * @desc  Helper method which finds index of currentGroupId and slices
     * it from groupId and it's associated inputFileType
     * @memberOf refineryToolLaunch.fileRelationshipService
     * @param {array} nodeList - list of selected nodes
     * @param {str} typeUuid - input Type Uuid
    **/
    function removeGroupFromNodeSelectCollection (nodeList, typeUuid) {
      for (var i = 0; i < nodeList.length; i++) {
        var nodeUuid = nodeList[i].uuid;
        for (var j = 0; j < vm.nodeSelectCollection[nodeUuid].inputTypeList.length; j++) {
          if (vm.nodeSelectCollection[nodeUuid].inputTypeList[j] === typeUuid &&
            vm.nodeSelectCollection[nodeUuid].groupList[j].join(',') ===
            vm.currentGroup.join(',')) {
            vm.nodeSelectCollection[nodeUuid].groupList.splice(j, 1);
            vm.nodeSelectCollection[nodeUuid].inputTypeList.splice(j, 1);
          }
        }
        // Delete node property from obj if empty
        if (vm.nodeSelectCollection[nodeUuid].groupList.length === 0) {
          delete vm.nodeSelectCollection[nodeUuid];
        }
      }
    }

    /**
     * @name resetInputGroup
     * @desc  Resets the variables needed for clearing cart completely
     * @memberOf refineryToolLaunch.fileRelationshipService
    **/
    function resetInputGroup () {
      // resets group coordinates
      for (var i = 0; i < vm.currentGroup.length; i++) {
        vm.currentGroup[i] = 0;
      }
      vm.groupCollection = {};
      vm.nodeSelectCollection = {};
      angular.copy({}, nodeService.selectionObj);
    }

    /**
     * @name resetToolRelated
     * @desc  Resets the variables needed for new tool selection
     * @memberOf refineryToolLaunch.fileRelationshipService
    **/
    function resetToolRelated () {
      vm.currentGroup = [];
      vm.currentTypes = [];
      vm.depthNames = [];
      vm.groupCollection = {};
      vm.hideNodePopover = false;
      vm.inputFileTypes = [];
      vm.inputFileTypeColor = {};
      vm.nodeSelectCollection = {};
      angular.copy({}, nodeService.selectionObj);
    }


     /**
     * @name setGroupCollection
     * @desc  Generates obj with groups with input file types and their selected
     * node uuid
     * @memberOf refineryToolLaunch.fileRelationshipService
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
      if (selectionObj[vm.currentGroup][inputTypeUuid][nodeUuid]) {
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
        for (var i = 0; i < vm.groupCollection[vm.currentGroup][inputTypeUuid].length; i++) {
          if (vm.groupCollection[vm.currentGroup][inputTypeUuid][i].uuid === nodeUuid) {
            vm.groupCollection[vm.currentGroup][inputTypeUuid].splice(i, 1);
            break;
          }
        }
      }
    }

    /**
     * @name setNodeSelectCollection
     * @desc Generates obj with node uuids and their associated input file
     * types and groups.
     * @memberOf refineryToolLaunch.fileRelationshipService
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
      if (selectionObj[vm.currentGroup][inputTypeUuid][nodeUuid]) {
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
        for (var i = 0; i < vm.nodeSelectCollection[nodeUuid].inputTypeList.length; i++) {
          if (_.isEqual(vm.nodeSelectCollection[nodeUuid].groupList[i], vm.currentGroup) &&
          vm.nodeSelectCollection[nodeUuid].inputTypeList[i] === inputTypeUuid) {
            vm.nodeSelectCollection[nodeUuid].groupList.splice(i, 1);
            vm.nodeSelectCollection[nodeUuid].inputTypeList.splice(i, 1);
            break;
          }
        }
      }
    }
  }
})();
