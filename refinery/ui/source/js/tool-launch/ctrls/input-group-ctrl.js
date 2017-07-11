/**
 * Input Group Ctrl
 * @namespace InputGroupCtrl
 * @desc Controller for the input groups portion of the tool input control
 * panel
 * @memberOf refineryApp.refineryToolLaunch
 */
(function () {
  'use strict';

  angular
    .module('refineryToolLaunch')
    .controller('InputGroupCtrl', InputGroupCtrl);

  InputGroupCtrl.$inject = [
    '$scope',
    '_',
    'fileRelationshipService',
    'resetGridService',
    'activeNodeService'
  ];


  function InputGroupCtrl (
    $scope,
    _,
    fileRelationshipService,
    resetGridService,
    activeNodeService
  ) {
    var fileService = fileRelationshipService;
    var nodeService = activeNodeService;
    var vm = this;
    vm.attributes = fileService.attributesObj;
    vm.currentGroup = fileService.currentGroup;
    vm.currentTypes = fileService.currentTypes;
    vm.groupCollection = fileService.groupCollection;
    vm.inputFileTypes = fileService.inputFileTypes;
    vm.inputFileTypeColor = fileService.inputFileTypeColor;
    vm.isGroupPopulated = isGroupPopulated;
    vm.isNavCollapsed = false;
    vm.isObjEmpty = isObjEmpty;
    vm.removeAllGroups = removeAllGroups;
    vm.removeGroup = removeGroup; // Refreshes all selection
    vm.selectedTool = {};


   /*
   * ---------------------------------------------------------
   * Methods
   * ---------------------------------------------------------
   */
  /**
   * @name isGroupPopulated
   * @desc Checks if the group has a inputFile template filled, used by vm to show
   * template vs the node
   * @memberOf refineryToolLaunch.InputGroupCtrl
   * @param {string} inputFileUuid - uuid for the input file type
   */
    function isGroupPopulated (inputFileUuid) {
      if (_.has(vm.groupCollection[vm.currentGroup], inputFileUuid) &&
        vm.groupCollection[vm.currentGroup][inputFileUuid].length > 0) {
        return true;
      }
      return false;
    }

    /**
   * @name isObjEmpty
   * @desc Method check if an obj is empty, used to disable remove/removeall button
   * @memberOf refineryToolLaunch.InputGroupCtrl
   * @param {obj} testObj - any object
   */
    function isObjEmpty (testObj) {
      return _.isEmpty(testObj);
    }

    /**
   * @name removeAllGroups
   * @desc Method clears all selected nodes and empties group. Required for
     * emptying cart or a new tool selection
   * @memberOf refineryToolLaunch.InputGroupCtrl
   */
    function removeAllGroups () {
      fileService.hideNodePopover = true;
      fileService.resetInputGroup();
    }

    /**
   * @name removeGroup
   * @desc Method clears the current input group
   * @memberOf refineryToolLaunch.InputGroupCtrl
   */
    function removeGroup () {
      fileService.hideNodePopover = true;
      fileService.removeGroupFromCollections();
      nodeService.deselectGroupFromSelectionObj(fileService.currentGroup.join(','));
      // If there's more than one group, the collection will be reindexed
      fileService.reindexCollections();
      vm.selectionObj = nodeService.selectionObj;
    }

   /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    vm.$onInit = function () {
      $scope.$watchCollection(
        function () {
          return vm.displayCtrl.selectedTool;
        },
        function () {
          vm.inputFileTypes = fileService.inputFileTypes;
          vm.currentGroup = fileService.currentGroup;
          vm.currentTypes = fileService.currentTypes;
          vm.groupCollection = fileService.groupCollection;
          vm.inputFileTypeColor = fileService.inputFileTypeColor;
          vm.selectedTool = vm.displayCtrl.selectedTool;
        }
      );

      $scope.$watchCollection(
        function () {
          return fileService.groupCollection;
        },
        function () {
          vm.groupCollection = fileService.groupCollection;
          vm.currentGroup = fileService.currentGroup;
          vm.inputFileTypeColor = fileService.inputFileTypeColor;
        }
      );
    };
  }
})();
