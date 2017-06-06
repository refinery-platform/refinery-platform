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
    vm.setDisplayInputFile = setDisplayInputFile;


   /*
   * ---------------------------------------------------------
   * Methods
   * ---------------------------------------------------------
   */
  /**
   * Checks if the group has a inputFile template filled, used by vm to show
   * template vs the node
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
     ** Method check if an obj is empty, used to disable remove/removeall button
    * */
    function isObjEmpty (testObj) {
      return _.isEmpty(testObj);
    }
    /**
     * Method clears all selected nodes and empties group. Required for
     * emptying cart or a new tool selection
     */
    function removeAllGroups () {
      fileService.hideNodePopover = true;
      fileService.resetInputGroup();
    }

    /**
     ** Method clears the current input group
    * */
    function removeGroup () {
      fileService.hideNodePopover = true;
      nodeService.deselectGroupFromSelectionObj(vm.currentGroup);
      fileService.removeGroupFromCollections();
      vm.selectionObj = nodeService.selectionObj;
    }

    // Vm method which sets which input file type to display in popover help.//
    function setDisplayInputFile (inputObj) {
      angular.copy(inputObj, fileService.displayInputFile);
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
