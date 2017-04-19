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
    'selectedNodesService'
  ];


  function InputGroupCtrl (
    $scope,
    _,
    fileRelationshipService,
    resetGridService,
    selectedNodesService
  ) {
    var fileService = fileRelationshipService;
    var nodeService = selectedNodesService;
    var vm = this;
    vm.attributes = fileService.attributesObj;
    vm.currentFileInput = [];
    vm.isNavCollapsed = false;
    vm.isGroupPopulated = isGroupPopulated;
    vm.inputFilesTypes = fileService.inputFileTypes;
    vm.isObjEmpty = isObjEmpty;
    vm.groupCollection = fileService.groupCollection;
    vm.currentGroup = fileService.currentGroup;
    vm.removeAllGroups = removeAllGroups;
    vm.removeGroup = removeGroup; // Refreshes all selection
    vm.tool = {}; // selected tool displayed in panel
    vm.toolType = ''; // workflow vs visualization


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
      fileService.resetCurrentCollections();
      nodeService.setSelectedAllFlags(false);
      resetGridService.setRefreshGridFlag(true);
    }

    /**
     ** Method clears the current input group
    * */
    function removeGroup () {
      fileService.removeGroupFromCollections();
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
          angular.copy(vm.displayCtrl.selectedTool, vm.tool);
          vm.inputFilesTypes = fileService.inputFileTypes;
          vm.currentGroup = fileService.currentGroup;

          if (vm.tool.toolType === 'Workflow') {
            vm.toolType = vm.tool.toolType;
          }
        }
      );

      $scope.$watchCollection(
        function () {
          return fileService.groupCollection;
        },
        function () {
          vm.groupCollection = fileService.groupCollection;
          vm.inputFilesTypes = fileService.inputFileTypes;
          vm.currentGroup = fileService.currentGroup;
        }
      );
    };
  }
})();
