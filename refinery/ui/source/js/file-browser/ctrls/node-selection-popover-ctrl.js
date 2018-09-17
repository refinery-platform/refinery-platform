(function () {
  'use strict';

  angular
    .module('refineryFileBrowser')
    .controller('NodeSelectionPopoverCtrl', NodeSelectionPopoverCtrl);

  NodeSelectionPopoverCtrl.$inject = [
    '$scope',
    '_',
    'activeNodeService',
    'fileRelationshipService'
  ];

  function NodeSelectionPopoverCtrl (
    $scope,
    _,
    activeNodeService,
    fileRelationshipService
  ) {
    var fileService = fileRelationshipService;
    var nodeService = activeNodeService;
    var vm = this;
    vm.activeNode = nodeService.activeNodeRow; // ui-grid row which is engaged
    vm.attributes = fileService.attributesObj; // contains the data attributes
    vm.currentGroup = fileService.currentGroup; // group indices ex: [0, 0]
    /** current group's data structure for each level ex:[ 'Pair','List'] **/
    vm.currentTypes = fileService.currentTypes;
    vm.depthNames = fileService.depthNames;
    // selectedNodes ordered by group indicies
    vm.groupCollection = fileService.groupCollection;
    vm.inputFileTypes = fileService.inputFileTypes; // current tool's inputFileTypes
    vm.inputFileTypeColor = fileService.inputFileTypeColor;
    // selectedNodes ordered by group indicies
    vm.nodeSelection = fileService.nodeSelectCollection;
    vm.selectNode = selectNode; // method
    vm.selectionObj = nodeService.selectionObj; // ui-select obj track checkbox
  /*
   * ---------------------------------------------------------
   * Method
   * ---------------------------------------------------------
   */
    /**
     * Updates service data object with the selected/deselected now
     * @param {string} inputUuid - file input type uuid provided by tool
     * definition api
     * @param {string} deselectFileUuid - OPTIONAL, given when user
     * deselects a checkbox
     */
    function selectNode (inputUuid, deselectFileUuid) {
      fileService.setNodeSelectCollection(inputUuid, vm.selectionObj, deselectFileUuid);
      fileService.setGroupCollection(inputUuid, vm.selectionObj, deselectFileUuid);
      vm.groupCollection = fileService.groupCollection;
    }
  /*
   * ---------------------------------------------------------
   * Watchers
   * ---------------------------------------------------------
   */
    // When selected tools are update, so are their inputFileTypes
    $scope.$watchCollection(
      function () {
        return fileService.inputFileTypes;
      },
      function () {
        vm.inputFileTypes = fileService.inputFileTypes;
        vm.currentGroup = fileService.currentGroup;
        vm.currentTypes = fileService.currentTypes;
        vm.depthNames = fileService.depthNames;
        vm.groupCollection = fileService.groupCollection;
        vm.nodeSelection = fileService.nodeSelectCollection;
        vm.inputFileTypeColor = fileService.inputFileTypeColor;
      }
    );

     // When node select collections are updated
    $scope.$watchCollection(
      function () {
        return fileService.groupCollection;
      },
      function () {
        vm.groupCollection = fileService.groupCollection;
        vm.nodeSelection = fileService.nodeSelectCollection;
      }
    );


    // When user selects/deselects row
    $scope.$watch(
      function () {
        return nodeService.activeNodeRow;
      },
      function () {
        vm.activeRow = nodeService.activeNodeRow;
      }
    );
    // When user changes the group selection from the control panel
    $scope.$watchCollection(
      function () {
        return fileService.currentGroup;
      },
      function () {
        vm.currentGroup = fileService.currentGroup;
        vm.currentTypes = fileService.currentTypes;
        vm.depthNames = fileService.depthNames;
      }
    );
  }
})();
